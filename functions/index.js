/**
 * WESTLINE FUTURE ERP - CLOUD FUNCTIONS (GEN 2)
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth: getAdminAuth } = require("firebase-admin/auth");
const { initializeApp } = require("firebase-admin/app");
const axios = require("axios");
const crypto = require("crypto");

initializeApp();

// Secrets — set with: firebase functions:secrets:set SECRET_NAME
const META_WA_TOKEN      = { value: () => process.env.META_WA_TOKEN };
const META_WA_PHONE_ID   = { value: () => process.env.META_WA_PHONE_ID };
// App secret — used to verify inbound webhook signatures from Meta
const META_APP_SECRET    = { value: () => process.env.META_APP_SECRET || '' };
const WA_VERIFY_TOKEN    = { value: () => process.env.WA_VERIFY_TOKEN };
const PAYSTACK_SECRET_KEY = { value: () => process.env.PAYSTACK_SECRET_KEY };

const HUBTEL_SMS_SENDER = 'WestlineFut'; // max 11 chars

/**
 * Load Hubtel SMS credentials — env first, then Firestore fallback (same doc as payment).
 */
async function getHubtelSMSCreds() {
  const envId     = process.env.HUBTEL_SMS_CLIENT_ID;
  const envSecret = process.env.HUBTEL_SMS_CLIENT_SECRET;
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  const db = getFirestore();
  const snap = await db.collection('cms_content').doc('gatewaySettings').get();
  const d = snap.exists ? snap.data() : {};
  return {
    clientId:     d.hubtelSmsClientId     || d.hubtelClientId     || '',
    clientSecret: d.hubtelSmsClientSecret || d.hubtelClientSecret || '',
  };
}

/**
 * Send an SMS via Hubtel SMS Gateway.
 * @param {string} to   - recipient phone (any format — auto-normalised to 233XXXXXXXXX)
 * @param {string} body - message text (max 160 chars per segment)
 * @returns {{ success: boolean, data?: any, error?: string }}
 */
async function sendHubtelSMS(to, body) {
  try {
    let phone = String(to).replace(/\D/g, '');
    if (phone.startsWith('0'))   phone = '233' + phone.slice(1);
    if (!phone.startsWith('233')) phone = '233' + phone;

    const { clientId, clientSecret } = await getHubtelSMSCreds();
    if (!clientId || !clientSecret) {
      logger.warn('Hubtel SMS skipped: no credentials configured');
      return { success: false, error: 'no_credentials' };
    }

    const url = 'https://sms.hubtel.com/v1/messages/send';
    const res = await axios.get(url, {
      params: {
        clientsecret: clientSecret,
        clientid:     clientId,
        from:         HUBTEL_SMS_SENDER,
        to:           phone,
        content:      body,
      },
      timeout: 10000,
    });
    logger.info('Hubtel SMS sent:', { to: phone, status: res.data });
    return { success: true, data: res.data };
  } catch (err) {
    logger.warn('Hubtel SMS failed:', { to, error: err.message, response: err.response?.data });
    return { success: false, error: err.message };
  }
}

/**
 * PAYSTACK PAYMENT VERIFICATION (SERVER-SIDE)
 * Called immediately after client-side Paystack popup confirms payment.
 * Verifies the transaction with Paystack's API, then writes the verified
 * record into Firestore using the Admin SDK (bypasses client security rules).
 *
 * Callable from client: httpsCallable(functions, 'verifyPaystackPayment')
 * Body: { reference, projectId, invoiceId?, type? }
 */
exports.verifyPaystackPayment = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new Error("Authentication required");

    const uid = request.auth.uid;
    const { reference, projectId, invoiceId, expectedAmountGHS, type = "payment" } = request.data || {};

    if (!reference) throw new Error("reference is required");
    if (!projectId) throw new Error("projectId is required");

    const VALID_TYPES = ["payment", "deposit", "final", "rendering", "renderingFee", "design", "addon", "invoice", "milestone", "receipt"];
    if (!VALID_TYPES.includes(type)) {
      // Log unknown types but don't hard-fail — the type field is metadata only
      logger.warn(`verifyPaystackPayment: unknown payment type "${type}" for project ${projectId} — treating as "payment"`);
    }

    // ── OWNERSHIP VALIDATION ─────────────────────────────────────────────────
    // Verify the invoice actually belongs to this project before doing anything.
    // Prevents an attacker from reusing another client's payment reference.
    if (invoiceId) {
      const db = getFirestore();
      const invoiceSnap = await db.collection("invoices").doc(invoiceId).get();
      if (!invoiceSnap.exists) throw new Error("Invoice not found");
      const invData = invoiceSnap.data();
      const invProject = invData.projectId || invData.parentId;
      if (invProject && invProject !== projectId) {
        logger.error(`verifyPaystackPayment: invoice ${invoiceId} belongs to project ${invProject}, not ${projectId} — possible fraud attempt by uid ${uid}`);
        throw new Error("Invoice does not belong to this project");
      }
    }

    // Rate limit: max 10 verify calls per UID per hour
    await enforceRateLimit(`verifyPayment:${uid}`, 10, 3600);

    // ⚠ CRITICAL: Load Paystack secret from Cloud Function secrets (most secure), fall back to Firestore only if env not set
    // Cloud Function secrets (PAYSTACK_SECRET_KEY) are encrypted and not readable by admins or clients.
    // Only fall back to Firestore for flexibility, but prefer the env var which is not logged or exposed.
    let paystackSecret = PAYSTACK_SECRET_KEY.value();
    if (!paystackSecret) {
      // Fallback: load from Firestore if not in Cloud Function secrets
      const db2 = getFirestore();
      const gwSnap = await db2.collection("cms_content").doc("gatewaySettings").get().catch(() => null);
      paystackSecret = gwSnap?.data()?.content?.paystackSecretKey || '';
      if (!paystackSecret) {
        throw new Error("Paystack secret key not configured. Set PAYSTACK_SECRET_KEY in Cloud Function secrets or save it in AdminFinancials → Gateway Settings.");
      }
      logger.warn("verifyPaystackPayment: using Paystack secret from Firestore (should use Cloud Function secret for security)");
    }
    if (!paystackSecret) throw new Error("Paystack secret key is not configured.");

    // Verify with Paystack — throws on network failure or non-2xx
    let tx;
    try {
      const resp = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } }
      );
      tx = resp.data?.data;
    } catch (err) {
      logger.error("verifyPaystackPayment: Paystack API error", err.response?.data || err.message);
      throw new Error("Could not reach Paystack to verify payment");
    }

    if (!tx || tx.status !== "success") {
      throw new Error(`Payment not confirmed by Paystack: ${tx?.gateway_response || "unknown status"}`);
    }

    const db = getFirestore();
    const amountGHS = tx.amount / 100; // Paystack amounts are in pesewas for GHS
    const txId = `TX-${reference}`;

    // ── AMOUNT VALIDATION ────────────────────────────────────────────────────
    // If the client told us the expected amount, verify Paystack paid at least that.
    if (expectedAmountGHS && typeof expectedAmountGHS === "number") {
      const tolerance = expectedAmountGHS * 0.02; // allow 2% rounding difference
      if (amountGHS < expectedAmountGHS - tolerance) {
        logger.warn(`verifyPaystackPayment: amount mismatch — expected GHS ${expectedAmountGHS}, got GHS ${amountGHS} (ref: ${reference})`);
        throw new Error(
          `Payment amount mismatch. Expected GHS ${expectedAmountGHS.toFixed(2)} but Paystack confirms only GHS ${amountGHS.toFixed(2)}. Contact support.`
        );
      }
    } else {
      // No expected amount supplied — try to fetch invoice and validate
      if (invoiceId) {
        try {
          const invoiceSnap = await db.collection("invoices").doc(invoiceId).get();
          if (invoiceSnap.exists) {
            const invoice = invoiceSnap.data();
            const invoiceAmt = Number(invoice.amount || invoice.total || 0);
            if (invoiceAmt > 0) {
              const tolerance = invoiceAmt * 0.02;
              if (amountGHS < invoiceAmt - tolerance) {
                logger.warn(`verifyPaystackPayment: invoice amount mismatch — invoice GHS ${invoiceAmt}, paid GHS ${amountGHS}`);
                throw new Error(
                  `Payment of GHS ${amountGHS.toFixed(2)} is less than invoice amount of GHS ${invoiceAmt.toFixed(2)}. Contact support.`
                );
              }
            }
          }
        } catch (err) {
          if (err.message.includes("Payment of GHS")) throw err;
          logger.warn("verifyPaystackPayment: could not fetch invoice for amount check", err.message);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Write verified transaction into the project's transactions sub-collection
    await db
      .collection("projects").doc(projectId)
      .collection("transactions").doc(txId)
      .set({
        id: txId,
        invoiceId: invoiceId || reference,
        reference,
        amount: amountGHS,
        currency: tx.currency,
        method: "Paystack",
        channel: tx.channel,
        gateway_response: tx.gateway_response,
        paidAt: tx.paid_at,
        type,
        status: "verified",
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: uid,
      }, { merge: true });

    // Update the invoice and project payment statuses server-side
    if (invoiceId) {
      try {
        const invRef = db.collection("invoices").doc(invoiceId);
        const invSnap = await invRef.get();
        if (invSnap.exists) {
          const invData = invSnap.data();
          const invoiceTotal = Number(invData.amount || invData.total || 0);
          const currentPaid = Number(invData.amountPaid || 0);
          const newAmountPaid = currentPaid + amountGHS;
          
          let newStatus = invData.status || "Pending";
          if (invoiceTotal > 0) {
            if (newAmountPaid >= invoiceTotal - (invoiceTotal * 0.02)) {
              newStatus = "Paid";
            } else if (newAmountPaid > 0) {
              newStatus = "Partially Paid";
            }
          } else {
            newStatus = "Paid"; // fallback if no total
          }

          const updatePayload = {
            status: newStatus,
            amountPaid: newAmountPaid,
            paidAt: new Date().toISOString(),
            method: "Paystack"
          };

          await invRef.update(updatePayload);

          await db.collection("projects").doc(projectId).collection("payments").doc(invoiceId).set(updatePayload, { merge: true });
        }
      } catch (err) {
        logger.warn("verifyPaystackPayment: could not update invoice logic properly", err);
      }
    }

    // ── Auto-unlock rendering package if this was a rendering fee payment ─────
    if (invoiceId && (type === 'rendering' || type === 'renderingFee' || type === 'design')) {
      try {
        // Find the rendering package linked to this invoice
        const pkgSnap = await db.collection('renderingPackages')
          .where('projectId', '==', projectId)
          .where('linkedInvoiceId', '==', invoiceId)
          .limit(1)
          .get();

        if (!pkgSnap.empty) {
          await pkgSnap.docs[0].ref.update({ unlocked: true, unlockedAt: FieldValue.serverTimestamp() });
          logger.info(`verifyPaystackPayment: rendering package unlocked for project ${projectId}`);
        } else {
          // Fallback: unlock any unlinked pending package for this project
          const fallbackSnap = await db.collection('renderingPackages')
            .where('projectId', '==', projectId)
            .where('unlocked', '==', false)
            .limit(1)
            .get();
          if (!fallbackSnap.empty) {
            await fallbackSnap.docs[0].ref.update({ unlocked: true, unlockedAt: FieldValue.serverTimestamp() });
          }
        }
      } catch (e) {
        logger.warn('verifyPaystackPayment: could not unlock rendering package', e.message);
      }
    }

    // ── Notify client that payment was confirmed ───────────────────────────────
    try {
      const projectSnap = await db.collection('projects').doc(projectId).get();
      const clientId = projectSnap.data()?.clientId;
      const projectTitle = projectSnap.data()?.title || 'your project';
      if (clientId) {
        const notifMsg = type === 'rendering' || type === 'renderingFee'
          ? `Payment confirmed! Your 3D design package for "${projectTitle}" is now unlocked. Open the Design Vault to view your renders.`
          : `Payment of GHS ${amountGHS.toFixed(2)} confirmed for "${projectTitle}". Thank you!`;
        await db.collection('notifications').add({
          userId: clientId,
          message: notifMsg,
          msg: notifMsg,
          type: 'payment',
          link: '/portal',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
        // Also notify admin
        const adminMsg = `Payment of GHS ${amountGHS.toFixed(2)} received for "${projectTitle}" (${type}) via Paystack. Ref: ${reference}`;
        await db.collection('notifications').add({
          userId: 'admin',
          message: adminMsg,
          msg: adminMsg,
          type: 'payment',
          link: '/admin/financials',
          read: false,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      logger.warn('verifyPaystackPayment: could not create payment notifications', e.message);
    }

    // Audit log
    await db.collection("activity_logs").add({
      action: "payment_verified",
      projectId,
      reference,
      amountGHS,
      channel: tx.channel,
      type,
      verifiedAt: FieldValue.serverTimestamp(),
      verifiedBy: uid,
    });

    // Stage auto-advance is handled client-side via updateProjectStage() which runs full gate checks.
    // We intentionally do NOT auto-advance here to avoid bypassing prerequisite validation.

    logger.info(`verifyPaystackPayment: GHS ${amountGHS} verified for project ${projectId} ref ${reference}`);

    return {
      verified: true,
      amountGHS,
      currency: tx.currency,
      channel: tx.channel,
      reference,
    };
  }
);

/**
 * STAFF / WORKER ACCOUNT CREATION (SERVER-SIDE)
 * Uses the Admin SDK so the calling admin's session is never interrupted.
 * Client SDK createUserWithEmailAndPassword would auto-sign-in as the new user.
 *
 * Callable: httpsCallable(functions, 'createStaffAccount')
 * Body: { name, email, password, jobRole }
 */
// ---------------------------------------------------------------------------
// START HUBTEL PAYMENT INTEGRATION
// ---------------------------------------------------------------------------
// ── Helper: load gateway settings from the correct Firestore path ─────────────
// AdminFinancials saves via syncCMS('gatewaySettings', ...) → cms_content/gatewaySettings → content
async function loadGatewaySettings(db) {
  try {
    const snap = await db.collection("cms_content").doc("gatewaySettings").get();
    if (snap.exists) return snap.data()?.content || {};
  } catch (err) {
    logger.warn("loadGatewaySettings: cms_content path failed, trying legacy path", err.message);
  }
  // Legacy fallback path
  try {
    const snap = await db.collection("system_settings").doc("payment_gateways").get();
    if (snap.exists) return snap.data() || {};
  } catch (_) {}
  return {};
}

// ── Hubtel Connection Test (admin only) ─────────────────────────────────────
exports.testHubtelConnection = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");

    const db = getFirestore();
    let clientId, clientSecret, merchantId, enabled;

    if (request.data?.hubtelClientId && request.data?.hubtelClientSecret) {
      clientId     = String(request.data.hubtelClientId).trim();
      clientSecret = String(request.data.hubtelClientSecret).trim();
      merchantId   = String(request.data.hubtelMerchantId || '').trim();
      enabled      = true;
    } else {
      const gs = await loadGatewaySettings(db).catch(() => ({}));
      clientId     = String(gs.hubtelClientId || '').trim();
      clientSecret = String(gs.hubtelClientSecret || '').trim();
      merchantId   = String(gs.hubtelMerchantId || '').trim();
      enabled      = gs.enableHubtel;
    }

    if (!enabled) throw new HttpsError("failed-precondition", "Hubtel is not enabled. Toggle it on and Save first.");
    if (!clientId || !clientSecret) throw new HttpsError("failed-precondition", "Client ID or Client Secret is missing.");
    if (!merchantId) throw new HttpsError("failed-precondition", "Merchant Account Number is missing.");

    const authHeader = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
    const payload = {
      totalAmount:           0.01,
      description:           "Westline Future — credentials test",
      callbackUrl:           "https://westlinefuture.web.app/portal",
      returnUrl:             "https://westlinefuture.web.app/portal",
      cancellationUrl:       "https://westlinefuture.web.app/portal",
      merchantAccountNumber: merchantId,
      clientReference:       `TEST-${Date.now()}`,
    };

    logger.info("testHubtelConnection: sending test request", {
      endpoint: "payproxyapi.hubtel.com/items/initiate",
      merchantId,
      clientIdLen: clientId.length,
    });

    try {
      const resp = await axios.post(
        "https://payproxyapi.hubtel.com/items/initiate",
        payload,
        { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
      );
      logger.info("testHubtelConnection: success", resp.data);
      return { success: true, message: "✅ Hubtel credentials verified! Ready to accept payments." };
    } catch (err) {
      const status  = err.response?.status;
      const rawBody = err.response?.data;
      const hubMsg  = rawBody?.message || rawBody?.Message || rawBody?.ResponseMessage || '';
      const hubCode = rawBody?.ResponseCode || rawBody?.responseCode || '';

      logger.error("testHubtelConnection failed:", {
        status, hubMsg, hubCode,
        merchantIdPreview: String(merchantId || '').slice(0, 6) + '…',
        clientIdLen: clientId.length,
        rawBody: JSON.stringify(rawBody || {}).slice(0, 500),
      });

      if (status === 401) {
        throw new HttpsError("unauthenticated",
          `401 — Hubtel rejected your Client ID / Secret. ${hubMsg ? `Hubtel says: "${hubMsg}". ` : ''}` +
          `Go to merchants.hubtel.com → Settings → App Integrations and copy the exact API Key and API Secret.`
        );
      }
      if (status === 400) {
        // 400 means auth passed — just a bad test payload. Credentials are good.
        logger.info("testHubtelConnection: 400 means credentials are valid (payload rejected, not auth)");
        return {
          success: true,
          message: `✅ Credentials accepted by Hubtel. ${hubMsg ? `(Note: ${hubMsg})` : 'Ready to process payments.'}`,
        };
      }
      if (status === 403) {
        throw new HttpsError("permission-denied",
          `403 — Your Hubtel account does not have Checkout API access. Contact Hubtel support at merchants.hubtel.com to enable it.`
        );
      }
      if (status === 404) {
        throw new HttpsError("not-found",
          `404 — Hubtel API endpoint not found. This may be a temporary Hubtel outage. Try again in a few minutes.`
        );
      }
      throw new HttpsError("internal",
        `Hubtel returned ${status || 'no response'}: ${hubMsg || err.message}. ` +
        `Raw: ${JSON.stringify(rawBody || {}).slice(0, 200)}`
      );
    }
  }
);

exports.initializeHubtelPayment = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");

    const { amountGHS, description, returnUrl, cancellationUrl, clientReference } = request.data || {};
    if (!amountGHS || !clientReference) {
      throw new HttpsError("invalid-argument", "amountGHS and clientReference are required");
    }

    const db = getFirestore();
    const gatewaySettings = await loadGatewaySettings(db).catch(err => {
      logger.error("initializeHubtelPayment: Failed to load gateway settings", err.message);
      throw new HttpsError("internal", "Payment gateway configuration error");
    });

    const { enableHubtel, hubtelClientId, hubtelClientSecret, hubtelMerchantId } = gatewaySettings;

    if (!enableHubtel) {
      throw new HttpsError("failed-precondition", "Hubtel is not enabled. Go to Admin → Financials → Payment Gateways and enable Hubtel.");
    }
    if (!hubtelClientId || !hubtelClientSecret || !hubtelMerchantId) {
      throw new HttpsError("failed-precondition", "Hubtel credentials incomplete. Please add Client ID, Client Secret, and Merchant Account Number in Admin → Financials.");
    }

    const authHeader = `Basic ${Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64')}`;

    const payload = {
      totalAmount:           parseFloat(amountGHS),
      description:           description || "Westline Future Invoice Payment",
      callbackUrl:           "https://westlinefuture.web.app/portal",
      returnUrl:             returnUrl || "https://westlinefuture.web.app/portal",
      cancellationUrl:       cancellationUrl || "https://westlinefuture.web.app/portal",
      merchantAccountNumber: String(hubtelMerchantId).trim(),
      clientReference,
    };

    logger.info("initializeHubtelPayment: initiating checkout", {
      amount: amountGHS,
      merchantId: hubtelMerchantId,
      clientRef: clientReference,
    });

    try {
      const resp = await axios.post(
        "https://payproxyapi.hubtel.com/items/initiate",
        payload,
        { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
      );
      // Hubtel returns { status: "Success", data: { checkoutUrl, checkoutId } }
      const checkoutUrl = resp.data?.data?.checkoutUrl || resp.data?.checkoutUrl;
      const checkoutId  = resp.data?.data?.checkoutId  || resp.data?.checkoutId;
      logger.info("initializeHubtelPayment: checkout created", { checkoutId, checkoutUrl: !!checkoutUrl });
      return { success: true, checkoutUrl, checkoutId };
    } catch (err) {
      const status  = err.response?.status;
      const rawBody = err.response?.data;
      const hubMsg  = rawBody?.message || rawBody?.Message || rawBody?.ResponseMessage || '';
      const hubBody = JSON.stringify(rawBody || {}).slice(0, 500);
      logger.error("initializeHubtelPayment failed:", { status, hubMsg, hubBody, clientRef: clientReference, merchantNorm });

      if (status === 401) {
        throw new HttpsError("unauthenticated",
          "Hubtel rejected the credentials (401). Admin must verify the API Key and Secret in Admin → Financials → Payment Gateways."
        );
      }
      if (status === 400) {
        throw new HttpsError("invalid-argument",
          `Hubtel returned 400: ${hubMsg || 'Check the Merchant Account Number — it must be the MoMo number registered to your Hubtel account (e.g. 0593229989)'}`
        );
      }
      if (status === 403) {
        throw new HttpsError("permission-denied",
          "Hubtel returned 403 — your account may not have Checkout API enabled. Contact Hubtel support."
        );
      }
      throw new HttpsError("internal", `Hubtel checkout error (${status || 'unknown'}): ${hubMsg || err.message}`);
    }
  }
);

exports.verifyHubtelPayment = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");

    const { clientReference, projectId, invoiceId, expectedAmountGHS, type = "payment" } = request.data || {};
    if (!clientReference || !projectId) {
      throw new HttpsError("invalid-argument", "clientReference and projectId are required");
    }

    const uid = request.auth.uid;
    const db = getFirestore();

    // ── OWNERSHIP VALIDATION ─────────────────────────────────────────────────
    if (invoiceId) {
      const invoiceSnap = await db.collection("invoices").doc(invoiceId).get();
      if (!invoiceSnap.exists) throw new HttpsError("not-found", "Invoice not found");
      const invData = invoiceSnap.data();
      const invProject = invData.projectId || invData.parentId;
      if (invProject && invProject !== projectId) {
        logger.error(`verifyHubtelPayment: invoice ${invoiceId} belongs to project ${invProject}, not ${projectId} — possible fraud by uid ${uid}`);
        throw new HttpsError("permission-denied", "Invoice does not belong to this project");
      }
    }

    await enforceRateLimit(`verifyPayment:${uid}`, 10, 3600);

    const gatewaySettings = await loadGatewaySettings(db).catch(err => {
      logger.error("verifyHubtelPayment: Failed to load gateway settings", err.message);
      throw new HttpsError("internal", "Payment gateway configuration error");
    });

    const { hubtelClientId, hubtelClientSecret } = gatewaySettings;
    if (!hubtelClientId || !hubtelClientSecret) {
      throw new HttpsError("failed-precondition", "Hubtel credentials not configured");
    }
    const authHeader = `Basic ${Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64')}`;

    let tx;
    try {
      const resp = await axios.get(
        `https://payproxyapi.hubtel.com/items/check-status/${encodeURIComponent(clientReference)}`,
        { headers: { Authorization: authHeader } }
      );
      tx = resp.data?.data;
    } catch (err) {
      logger.error("verifyHubtelPayment API error", err.response?.data || err.message);
      throw new HttpsError("internal", "Could not reach Hubtel to verify payment");
    }

    // Hubtel status is 'Paid' or 'Success' for completed txns
    if (!tx || (tx.status !== "Paid" && tx.status !== "Success")) {
      throw new HttpsError("failed-precondition", `Payment not confirmed by Hubtel: ${tx?.status || "unknown status"}`);
    }

    const amountGHS = Number(tx.amount);
    const txId = `TX-${clientReference}`;

    // ── AMOUNT VALIDATION ────────────────────────────────────────────────────
    if (expectedAmountGHS && typeof expectedAmountGHS === "number") {
      const tolerance = expectedAmountGHS * 0.02;
      if (amountGHS < expectedAmountGHS - tolerance) {
        throw new HttpsError("failed-precondition", `Payment amount mismatch. Expected GHS ${expectedAmountGHS.toFixed(2)} but received GHS ${amountGHS.toFixed(2)}.`);
      }
    }

    // Write verified transaction
    await db
      .collection("projects").doc(projectId)
      .collection("transactions").doc(txId)
      .set({
        id: txId,
        invoiceId: invoiceId || clientReference,
        reference: clientReference,
        amount: amountGHS,
        currency: "GHS",
        method: "Hubtel",
        status: "verified",
        paidAt: new Date().toISOString(),
        type,
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: uid,
      }, { merge: true });

    // Update invoice
    if (invoiceId) {
      try {
        const invRef = db.collection("invoices").doc(invoiceId);
        const invSnap = await invRef.get();
        if (invSnap.exists) {
          const invData = invSnap.data();
          const invoiceTotal = Number(invData.amount || invData.total || 0);
          const currentPaid = Number(invData.amountPaid || 0);
          const newAmountPaid = currentPaid + amountGHS;
          
          let newStatus = invData.status || "Pending";
          if (invoiceTotal > 0) {
            if (newAmountPaid >= invoiceTotal - (invoiceTotal * 0.02)) {
              newStatus = "Paid";
            } else if (newAmountPaid > 0) {
              newStatus = "Partially Paid";
            }
          } else {
            newStatus = "Paid";
          }

          const updatePayload = {
            status: newStatus,
            amountPaid: newAmountPaid,
            paidAt: new Date().toISOString(),
            method: "Hubtel"
          };

          await invRef.update(updatePayload);
          await db.collection("projects").doc(projectId).collection("payments").doc(invoiceId).set(updatePayload, { merge: true });
        }
      } catch (err) {
        logger.warn("verifyHubtelPayment: could not update invoice logic properly", err);
      }
    }

    // Audit log
    await db.collection("activity_logs").add({
      action: "payment_verified",
      projectId,
      reference: clientReference,
      amountGHS,
      channel: "Hubtel",
      type,
      verifiedAt: FieldValue.serverTimestamp(),
      verifiedBy: uid,
    });

    return { verified: true, amountGHS, reference: clientReference };
  }
);
// ---------------------------------------------------------------------------

// ── Helper: verify calling user is an admin (role == 'admin' or email domain) ──
async function assertAdmin(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const email = request.auth.token.email || "";
  const isEmailAdmin = email.endsWith("@westlinefuture.com") || email === "admin@westlinefuture.com";
  if (isEmailAdmin) return; // fast path
  const db = getFirestore();
  const snap = await db.collection("users").doc(request.auth.uid).get();
  if (!snap.exists || !["admin", "staff"].includes(snap.data().role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

exports.createStaffAccount = onCall(async (request) => {
  await assertAdmin(request);

  const { name, email, password, jobRole } = request.data || {};
  if (!name || !email || !password) throw new Error("name, email, and password are required");

  const adminAuth = getAdminAuth();
  const db = getFirestore();

  // Field Worker role → role: 'worker', everyone else → role: 'staff'
  const role = jobRole === "Field Worker" ? "worker" : "staff";

  let uid;
  try {
    const record = await adminAuth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
    });
    uid = record.uid;
  } catch (err) {
    if (err.code === "auth/email-already-exists") throw new Error("An account with this email already exists");
    throw new Error(err.message);
  }

  const staffDoc = {
    name: name.trim(),
    email: email.trim(),
    role,
    jobRole,
    assignedClients: [],
    status: "Active",
    certs: [],
    createdAt: FieldValue.serverTimestamp(),
    createdBy: request.auth.uid,
  };

  await db.collection("users").doc(uid).set(staffDoc);
  // Write to team collection with UID as doc ID so lookups by ID are consistent
  await db.collection("team").doc(uid).set({ ...staffDoc, uid });

  logger.info(`createStaffAccount: created ${role} account for ${email} (uid: ${uid})`);
  return { uid, role, success: true };
});

/**
 * CREATE CLIENT RECORD
 * Writes the client Firestore doc server-side so Firestore rules
 * (which are domain-email based) never block the admin.
 * Clients authenticate via phone OTP — no Firebase Auth account needed here.
 *
 * Callable: httpsCallable(functions, 'createClientRecord')
 * Body: { name, phone, email?, address?, notes?, ... }
 */
exports.createClientRecord = onCall(async (request) => {
  await assertAdmin(request);

  const data = request.data || {};
  const { phone } = data;
  if (!phone) throw new Error("phone is required");

  // Normalize phone: strip everything except digits, ensure 233 prefix for Ghana
  let id = String(phone).replace(/\D/g, "");
  if (id.startsWith("0")) id = "233" + id.slice(1);

  const db = getFirestore();

  // Deduplication
  const existing = await db.collection("users").doc(id).get();
  if (existing.exists) {
    await db.collection("users").doc(id).set(
      { ...data, phone: id, updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { id, updated: true };
  }

  const payload = {
    ...data,
    id,
    phone: id,
    role: "client",
    status: "Active",
    joined: new Date().toISOString(),
    onboarded: false,
    createdAt: FieldValue.serverTimestamp(),
  };

  await db.collection("users").doc(id).set(payload);
  logger.info(`createClientRecord: registered client ${data.name} (${id})`);

  // Send welcome SMS to new client
  const welcomeMsg =
    `Welcome to Westline Future, ${(data.name || '').split(' ')[0]}! ` +
    `Track your project at westlinefuture.web.app/portal. ` +
    `Log in with your phone number — you'll receive a one-time code to verify. ` +
    `Questions? Reply to this message or call us.`;
  await sendHubtelSMS(id, welcomeMsg);

  return { id, created: true };
});

/**
 * SEND SMS — callable by admin to send a manual SMS to any phone number
 * Body: { to, message }
 */
exports.sendSMS = onCall(async (request) => {
  await assertAdmin(request);
  const { to, message } = request.data || {};
  if (!to || !message) throw new HttpsError('invalid-argument', 'to and message are required');
  const result = await sendHubtelSMS(to, message);
  if (!result.success) throw new HttpsError('internal', result.error || 'SMS send failed');
  return { success: true };
});

/**
 * REPAIR / SYNC STAFF ACCOUNT
 * Finds an existing Firebase Auth user by email and ensures their Firestore
 * document exists. Used to recover orphaned accounts created by the old
 * client-side flow that silently signed out the admin mid-creation.
 *
 * Callable: httpsCallable(functions, 'repairStaffAccount')
 * Body: { email, name, jobRole }
 */
/**
 * DELETE STAFF / WORKER ACCOUNT (SERVER-SIDE)
 * Removes the Firestore docs from `team` and `users`, and optionally
 * deletes the Firebase Auth account. Uses Admin SDK — bypasses rules.
 *
 * Callable: httpsCallable(functions, 'deleteStaffAccount')
 * Body: { uid, deleteAuth? }
 */
exports.deleteStaffAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");

  const { uid, deleteAuth = true } = request.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "uid is required");

  const adminAuth = getAdminAuth();
  const db = getFirestore();

  // Delete Firestore docs (don't throw if they don't exist)
  await Promise.allSettled([
    db.collection("team").doc(uid).delete(),
    db.collection("users").doc(uid).delete(),
  ]);

  // Optionally delete the Firebase Auth account
  if (deleteAuth) {
    try {
      await adminAuth.deleteUser(uid);
    } catch (err) {
      // Auth account may not exist (orphaned Firestore doc) — not fatal
      if (err.code !== "auth/user-not-found") {
        logger.warn(`deleteStaffAccount: Auth delete failed for ${uid}:`, err.message);
      }
    }
  }

  logger.info(`deleteStaffAccount: removed staff uid ${uid}`);
  return { success: true, uid };
});

/**
 * STAFF PASSWORD RESET
 * Admin sets a new password directly via setStaffPassword.
 */

/**
 * ADMIN SET STAFF PASSWORD
 * Lets an authenticated admin forcefully set a new password for any staff/worker.
 * Uses the Admin SDK so this is done server-side with full privilege.
 *
 * Callable: httpsCallable(functions, 'setStaffPassword')
 * Body: { uid, newPassword }
 */
exports.setStaffPassword = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new Error("Authentication required");

  const { uid, newPassword } = request.data || {};
  if (!uid) throw new Error("uid is required");

  // ⚠ Enforce strong password requirements
  const pwValidation = validatePasswordStrength(newPassword);
  if (!pwValidation.valid) {
    throw new Error(pwValidation.reason);
  }

  const adminAuth = getAdminAuth();
  const db = getFirestore();

  try {
    await adminAuth.updateUser(uid, { password: newPassword });
  } catch (err) {
    logger.error("setStaffPassword: updateUser failed", err.message);
    throw new Error("Could not update password: " + err.message);
  }

  // Password never stored in Firestore — delivered via SMS only.
  // Only log the timestamp of the update for audit trail.
  try {
    await db.collection("users").doc(uid).update({
      passwordUpdatedAt: FieldValue.serverTimestamp(),
    });
    await db.collection("team").doc(uid).update({
      passwordUpdatedAt: FieldValue.serverTimestamp(),
    }).catch(() => {}); // team doc may not exist, ignore
  } catch (err) {
    logger.warn("setStaffPassword: could not update timestamp in Firestore", err.message);
    // Not fatal — Auth password was updated successfully
  }

  logger.info(`setStaffPassword: password updated for uid ${uid} by admin ${request.auth.uid}`);
  return { success: true };
});

// All notifications go via Meta WhatsApp Cloud API (sendWA helper below).

exports.repairStaffAccount = onCall(async (request) => {
  await assertAdmin(request);

  const { email, name, jobRole } = request.data || {};
  if (!email) throw new Error("email is required");

  const adminAuth = getAdminAuth();
  const db = getFirestore();

  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(email.trim());
  } catch (err) {
    throw new Error("No Firebase Auth account found for this email");
  }

  const uid = userRecord.uid;
  const role = jobRole === "Field Worker" ? "worker" : "staff";

  const staffDoc = {
    name: (name || userRecord.displayName || email.split("@")[0]).trim(),
    email: email.trim(),
    role,
    jobRole: jobRole || "Technician",
    assignedClients: [],
    status: "Active",
    certs: [],
    repairedAt: FieldValue.serverTimestamp(),
  };

  // Merge so any existing data isn't overwritten
  await db.collection("users").doc(uid).set(staffDoc, { merge: true });
  await db.collection("team").doc(uid).set({ ...staffDoc, uid }, { merge: true });

  logger.info(`repairStaffAccount: synced Firestore doc for ${email} (uid: ${uid})`);
  return { uid, role, success: true, name: staffDoc.name };
});

/**
 * WhatsApp Proxy — sends messages via Meta WhatsApp Cloud API.
 * Body: { phone, message }
 * All API tokens live here; the client never sees them.
 */
const ALLOWED_ORIGINS = [
  "https://westlinefuture.web.app",
  "https://westlinefuture.firebaseapp.com",
  "https://www.westlinefuture.com",
  "https://westlinefuture.com",
];

exports.sendWhatsApp = onRequest(
  async (req, res) => {
    // CORS — only allow known origins
    const origin = req.headers.origin || "";
    const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    res.set("Access-Control-Allow-Origin", allowedOrigin);
    res.set("Vary", "Origin");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      return res.status(204).send("");
    }

    // Require Authorization header (Bearer token must be a valid Firebase ID token)
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization required" });
    }

    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: "phone and message are required" });

    // ⚠ CRITICAL: Rate limit WhatsApp sends to prevent spam/cost spikes
    // Max 10 messages per user per hour
    try {
      // Verify Firebase token and extract UID for rate limiting
      let uid = "anonymous";
      if (authHeader.startsWith("Bearer ")) {
        try {
          const idToken = authHeader.slice(7);
          const decodedToken = await getAdminAuth().verifyIdToken(idToken);
          uid = decodedToken.uid;
        } catch (e) {
          logger.warn("sendWhatsApp: token verification failed", e.message);
          return res.status(401).json({ error: "Invalid authorization token" });
        }
      }

      const token   = META_WA_TOKEN.value();
      const phoneId = META_WA_PHONE_ID.value();

      // Rate limit: max 10 WhatsApp messages per user per 3600 seconds
      await enforceRateLimit(`sendWhatsApp:${uid}`, 10, 3600);

      // Sanitize phone: ensure E.164 format
      const cleanPhone = phone.replace(/\s+/g, "").replace(/^00/, "+");

      if (!token || !phoneId) {
        logger.warn("sendWhatsApp: META_WA_TOKEN or META_WA_PHONE_ID not configured");
        return res.status(503).json({ error: "WhatsApp not configured. Set META_WA_TOKEN and META_WA_PHONE_ID in Cloud Function secrets." });
      }

      const resp = await axios.post(
        `https://graph.facebook.com/v19.0/${phoneId}/messages`,
        { messaging_product: "whatsapp", to: cleanPhone, type: "text", text: { body: message } },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      const result = { success: true, messageId: resp.data?.messages?.[0]?.id };

      // Log to Firestore for audit trail
      try {
        const db = getFirestore();
        await db.collection("whatsapp_log").add({
          phone: cleanPhone,
          provider: "meta",
          status: "sent",
          sentAt: FieldValue.serverTimestamp()
        });
      } catch (logErr) { logger.warn("Audit log write failed:", logErr.message); }

      return res.status(200).json(result);
    } catch (err) {
      logger.error("sendWhatsApp error", { error: err.message });
      return res.status(500).json({ error: "Message delivery failed", detail: err.message });
    }
  }
);

/**
 * AUTO-LOGISTICS WEBHOOK
 * Triggered when a container status is updated.
 */
exports.onLogisticsUpdate = onDocumentUpdated("containers/{containerId}", async (event) => {
  const newData = event.data?.after?.data();
  const oldData = event.data?.before?.data();
  if (!newData || !oldData) return;
  if (newData.status && newData.status !== oldData.status) {
    logger.info(`Container ${event.params.containerId} → ${newData.status}`);
  }
});

/**
 * FINANCIAL GATEKEEPER (SERVER-SIDE)
 * Validates escrow release and locks logistics dispatch.
 */
exports.validateEscrowRelease = onRequest(
  { cors: ALLOWED_ORIGINS },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "POST required" });
      }

      // Require Bearer token — admin only
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, error: "Authorization required" });
      }
      const { getAuth: getAdminAuthLocal } = require("firebase-admin/auth");
      let decodedToken;
      try {
        decodedToken = await getAdminAuthLocal().verifyIdToken(authHeader.replace("Bearer ", ""));
      } catch (_) {
        return res.status(401).json({ ok: false, error: "Invalid or expired token" });
      }
      // Only admins may query escrow status
      const callerSnap = await getFirestore().collection("users").doc(decodedToken.uid).get();
      const callerRole = callerSnap.data()?.role;
      if (!["admin", "staff"].includes(callerRole) && !decodedToken.email?.endsWith("@westlinefuture.com")) {
        return res.status(403).json({ ok: false, error: "Admin access required" });
      }

      const { projectId } = req.body || {};
      if (!projectId) {
        return res.status(400).json({ ok: false, error: "projectId is required" });
      }

      const snap = await getFirestore().collection("projects").doc(projectId).get();
      if (!snap.exists) {
        return res.status(404).json({ ok: false, error: "project not found" });
      }

      const project = snap.data();
      const stageValue = Number(project.stageId || project.stage || 0);
      const paymentStatus = project.paymentStatus || project.finance?.paymentStatus || "Unknown";
      // Pipeline max is stage 8 (Completed). Escrow is locked unless project is fully settled.
      const locked = stageValue >= 8 && paymentStatus !== "Settled";

      logger.info("validateEscrowRelease checked", { projectId, stageValue, paymentStatus, locked });
      return res.status(200).json({ ok: true, projectId, locked, stageValue, paymentStatus });
    } catch (err) {
      logger.error("validateEscrowRelease failed", err);
      return res.status(500).json({ ok: false, error: "validation failed" });
    }
  }
);

/**
 * SPEECH-TO-TEXT
 * Transcribes voice notes from the Client Portal.
 */
exports.transcribeSupportVoice = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "POST required" });
      }

      const { messageId, voiceUrl } = req.body || {};
      if (!messageId && !voiceUrl) {
        return res.status(400).json({ ok: false, error: "messageId or voiceUrl is required" });
      }

      logger.info("Voice transcription requested", { messageId: messageId || null, hasVoiceUrl: Boolean(voiceUrl) });
      return res.status(202).json({
        ok: true,
        status: "queued",
        messageId: messageId || null,
      });
    } catch (err) {
      logger.error("transcribeSupportVoice failed", err);
      return res.status(500).json({ ok: false, error: "transcription request failed" });
    }
  }
);

// ---------------------------------------------------------------------------
// Rate limiting — uses Firestore counter documents
// key: unique string (e.g. "sendSMS:uid123"), limit: max calls, windowSec: time window
// ---------------------------------------------------------------------------
async function enforceRateLimit(key, limit, windowSec) {
  const db = getFirestore();
  const docRef = db.collection("rate_limits").doc(key.replace(/[^a-zA-Z0-9_-]/g, "_"));
  const now = Date.now();
  const windowStart = now - windowSec * 1000;

  await db.runTransaction(async (t) => {
    const snap = await t.get(docRef);
    if (!snap.exists) {
      t.set(docRef, { calls: [now], updatedAt: FieldValue.serverTimestamp() });
      return;
    }
    const calls = (snap.data().calls || []).filter((ts) => ts > windowStart);
    if (calls.length >= limit) {
      const resetIn = Math.ceil((calls[0] + windowSec * 1000 - now) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${resetIn}s.`);
    }
    calls.push(now);
    t.update(docRef, { calls, updatedAt: FieldValue.serverTimestamp() });
  });
}

// ---------------------------------------------------------------------------
// Helper: validate password strength
// ---------------------------------------------------------------------------
function validatePasswordStrength(password) {
  if (!password || password.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must include an uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must include a lowercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, reason: "Password must include a number" };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: "Password must include a special character (!@#$%^&*, etc.)" };
  }
  return { valid: true, reason: null };
}

// ---------------------------------------------------------------------------
// Helper: normalize a phone string to a bare numeric format (e.g. 233241234567)
// ---------------------------------------------------------------------------
function normalizePhone(raw) {
  if (!raw) return null;
  // Remove all whitespace
  let p = String(raw).replace(/\s+/g, "");
  // Strip leading +
  if (p.startsWith("+")) p = p.slice(1);
  // Strip leading 00
  if (p.startsWith("00")) p = p.slice(2);
  // Return digits only
  return p.replace(/\D/g, "");
}

// ---------------------------------------------------------------------------
// Helper: send a WhatsApp message via Meta WhatsApp Cloud API
// Phone should be in E.164 format (e.g. 233241234567 or +233241234567).
// ---------------------------------------------------------------------------
async function sendWA(phone, message) {
  const token   = META_WA_TOKEN.value();
  const phoneId = META_WA_PHONE_ID.value();

  if (!token || !phoneId) {
    logger.warn("sendWA: META_WA_TOKEN or META_WA_PHONE_ID not set — falling back to SMS");
    return sendHubtelSMS(phone, message);
  }

  // Ensure E.164 with + prefix
  const normalized = normalizePhone(phone);
  const recipient  = normalized.startsWith("+") ? normalized : `+${normalized}`;

  try {
    const resp = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to: recipient,
        type: "text",
        text: { body: message },
      },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    return resp.data;
  } catch (err) {
    logger.warn("sendWA failed, falling back to SMS:", { error: err.message });
    return sendHubtelSMS(phone, message);
  }
}

// ---------------------------------------------------------------------------
// WHATSAPP INBOUND WEBHOOK
// Receives inbound messages from Meta Business Platform and writes them to
// Firestore as project messages.
//
// Webhook URL: https://<region>-<project>.cloudfunctions.net/receiveWhatsApp
// Register this URL in the Meta Business Platform -> WhatsApp -> Configuration.
// ---------------------------------------------------------------------------
exports.receiveWhatsApp = onRequest(
  async (req, res) => {
    // ── GET: Meta webhook verification handshake ────────────────────────────
    if (req.method === "GET") {
      const mode      = req.query["hub.mode"];
      const token     = req.query["hub.verify_token"];
      const challenge = req.query["hub.challenge"];

      if (mode === "subscribe" && token === WA_VERIFY_TOKEN.value()) {
        logger.info("receiveWhatsApp: webhook verified");
        return res.status(200).send(challenge);
      }
      logger.warn("receiveWhatsApp: verification failed – token mismatch");
      return res.status(403).send("Forbidden");
    }

    // ── POST: inbound message ───────────────────────────────────────────────
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ── Verify Meta webhook signature (MANDATORY) ──────────────────────────
    // Meta signs all POST payloads with HMAC-SHA256 using the app secret.
    // ⚠ CRITICAL: This validation MUST succeed in production. Attackers can spoof messages otherwise.
    const appSecret = META_APP_SECRET.value();
    if (!appSecret) {
      logger.error("receiveWhatsApp: META_APP_SECRET not configured — cannot verify webhook signature");
      return res.status(503).json({ error: "WhatsApp webhook not properly configured" });
    }

    const signature = req.headers["x-hub-signature-256"] || "";
    if (!signature) {
      logger.warn("receiveWhatsApp: missing x-hub-signature-256 header — request rejected");
      return res.status(401).send("Invalid signature");
    }

    const rawBody   = JSON.stringify(req.body);
    const expected  = "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      logger.warn("receiveWhatsApp: signature mismatch — request rejected");
      return res.status(401).send("Invalid signature");
    }

    // Acknowledge immediately — Meta requires a 200 within 5 s
    res.status(200).send("OK");

    try {
      const body = req.body;

      // Navigate Meta's nested payload structure
      const entry   = body?.entry?.[0];
      const changes = entry?.changes?.[0];
      const value   = changes?.value;

      if (!value || changes?.field !== "messages") {
        logger.info("receiveWhatsApp: non-message webhook event, ignoring");
        return;
      }

      const inboundMessages = value.messages;
      if (!inboundMessages || inboundMessages.length === 0) {
        logger.info("receiveWhatsApp: no messages in payload, ignoring");
        return;
      }

      const db = getFirestore();

      for (const msg of inboundMessages) {
        // We only handle text messages for now
        if (msg.type !== "text") {
          logger.info(`receiveWhatsApp: skipping non-text message type "${msg.type}"`);
          continue;
        }

        const rawPhone      = msg.from;                     // e.g. "233241234567"
        const messageText   = msg.text?.body ?? "";
        const waMsgId       = msg.id;
        const waTimestampMs = Number(msg.timestamp) * 1000; // Meta sends Unix seconds

        if (!rawPhone || !messageText) {
          logger.warn("receiveWhatsApp: missing from or text body, skipping");
          continue;
        }

        const normalizedPhone = normalizePhone(rawPhone);
        logger.info(`receiveWhatsApp: inbound from ${normalizedPhone}: "${messageText}"`);

        // ── 1. Find matching client in users collection ───────────────────
        const usersSnap = await db
          .collection("users")
          .where("phone", "==", normalizedPhone)
          .limit(1)
          .get();

        if (usersSnap.empty) {
          logger.warn(`receiveWhatsApp: no user found for phone ${normalizedPhone}`);
          continue;
        }

        const userDoc    = usersSnap.docs[0];
        const userData   = userDoc.data();
        const clientName = userData.name || userData.displayName || normalizedPhone;

        // ── 2. Find their most recent active project ──────────────────────
        // Active = stageId < 12, ordered by most recent first
        const projectsSnap = await db
          .collection("projects")
          .where("clientIds", "array-contains", normalizedPhone)
          .where("stageId", "<", 8)
          .orderBy("stageId", "desc")
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (projectsSnap.empty) {
          logger.info(`receiveWhatsApp: no active project for ${normalizedPhone}, writing to inbox`);
          // Store as an unmatched inbox message so admins can see it
          await db.collection("whatsapp_inbox").add({
            fromPhone:     normalizedPhone,
            fromName:      clientName,
            text:          messageText,
            waMsgId,
            waTimestampMs,
            matched:       false,
            createdAt:     FieldValue.serverTimestamp(),
          });
          continue;
        }

        const projectDoc  = projectsSnap.docs[0];
        const projectId   = projectDoc.id;
        const projectData = projectDoc.data();

        // ── 3. Write the message into the project's messages sub-collection ─
        await db.collection("projects").doc(projectId).collection("messages").add({
          text:            messageText,
          senderRole:      "client",
          isInternal:      false,
          createdAt:       FieldValue.serverTimestamp(),
          sourceWhatsApp:  true,
          fromPhone:       normalizedPhone,
          waMsgId,
          waTimestampMs,
        });

        // ── 4. Notify admins ─────────────────────────────────────────────
        await db.collection("notifications").add({
          userId:    "admin",
          message:   `New WhatsApp reply from ${clientName}`,
          type:      "message",
          link:      "/admin/client-hub",
          read:      false,
          createdAt: FieldValue.serverTimestamp(),
          meta: {
            projectId,
            projectTitle: projectData.title || projectId,
            fromPhone:    normalizedPhone,
          },
        });

        logger.info(
          `receiveWhatsApp: message written to projects/${projectId}/messages and notification created`
        );
      }
    } catch (err) {
      // We already sent 200, so log and move on
      logger.error("receiveWhatsApp: unexpected error", err);
    }
  }
);

// ---------------------------------------------------------------------------
// OVERDUE STAGE REMINDERS
// Runs daily at 09:00 Ghana time (Africa/Accra = UTC+0).
//
// • >= 3 days stuck on a CLIENT-action stage → send WhatsApp reminder to client
// • >= 7 days stuck on any stage → create an admin warning notification
// ---------------------------------------------------------------------------

// Stages where the client is the responsible party (approve rendering, approve quote/deposit, sign-off)
const CLIENT_ACTION_STAGES = new Set([2, 3, 7]);

// Human-readable stage names — mirrors frontend CLIENT_PROJECT_STAGES (8-stage pipeline)
const STAGE_NAMES = {
  1: "Survey & Measurements",
  2: "Design & Rendering",
  3: "Quotation & Deposit",
  4: "Production & Manufacturing",
  5: "Shipping & Logistics",
  6: "Installation",
  7: "Inspection & Sign-off",
  8: "Handover & Final Settlement",
};

exports.sendOverdueReminders = onSchedule(
  {
    schedule:  "0 9 * * *",
    timeZone:  "Africa/Accra",
  },
  async (_event) => {
    const db  = getFirestore();
    const now = Date.now();

    logger.info("sendOverdueReminders: starting scan");

    // Fetch all active projects (stageId 1–7, i.e. not yet at Handover/Completed stage 8)
    let projectsSnap;
    try {
      projectsSnap = await db
        .collection("projects")
        .where("stageId", "<", 8)
        .get();
    } catch (err) {
      logger.error("sendOverdueReminders: failed to fetch projects", err);
      return;
    }

    if (projectsSnap.empty) {
      logger.info("sendOverdueReminders: no active projects found");
      return;
    }

    logger.info(`sendOverdueReminders: found ${projectsSnap.size} active project(s)`);

    const notifBatch = db.batch();
    let notifCount   = 0;

    for (const projectDoc of projectsSnap.docs) {
      const projectId   = projectDoc.id;
      const projectData = projectDoc.data();
      const stageId     = projectData.stageId;
      const stageName   = STAGE_NAMES[stageId] ?? `Stage ${stageId}`;
      const projectTitle = projectData.title || projectId;

      try {
        // ── Find the stageHistory entry for the current stageId ───────────
        // stageHistory is an array field: [{ stageId, createdAt|timestamp, ... }, ...]
        const stageHistory = Array.isArray(projectData.stageHistory)
          ? projectData.stageHistory
          : [];

        // Find the most recent entry matching the current stageId
        const historyEntry = stageHistory
          .filter((h) => h.stageId === stageId)
          .sort((a, b) => {
            const tsA = (a.createdAt?.toMillis?.() ?? a.timestamp?.toMillis?.() ?? 0);
            const tsB = (b.createdAt?.toMillis?.() ?? b.timestamp?.toMillis?.() ?? 0);
            return tsB - tsA; // descending → latest first
          })[0];

        if (!historyEntry) {
          logger.warn(`sendOverdueReminders: no stageHistory entry for project ${projectId} stageId ${stageId}`);
          continue;
        }

        // Support both field name conventions
        const enteredAtMs =
          historyEntry.createdAt?.toMillis?.()   ??
          historyEntry.timestamp?.toMillis?.()    ??
          null;

        if (enteredAtMs === null) {
          logger.warn(`sendOverdueReminders: stageHistory entry has no timestamp for project ${projectId}`);
          continue;
        }

        const daysStuck = (now - enteredAtMs) / (1000 * 60 * 60 * 24);

        logger.info(
          `sendOverdueReminders: project ${projectId} (${projectTitle}) — stageId ${stageId}, ${daysStuck.toFixed(1)} days stuck`
        );

        // ── Client reminder: >= 3 days on a CLIENT-action stage ──────────
        if (daysStuck >= 3 && CLIENT_ACTION_STAGES.has(stageId)) {
          const possiblePhone = projectData.clientIds && projectData.clientIds.length > 0 ? projectData.clientIds[0] : (projectData.clientId || projectData.clientPhone);
          const clientPhone = normalizePhone(possiblePhone);
          const clientName  = projectData.clientName || "Valued Client";

          if (clientPhone) {
            const waMessage =
              `Hi ${clientName}, this is a reminder from Westline Future. ` +
              `Your project "${projectTitle}" is waiting for your action at the ` +
              `${stageName} stage. Please log in to your portal or contact us to ` +
              `proceed. Thank you.`;

            try {
              await sendWA(clientPhone, waMessage);
              logger.info(
                `sendOverdueReminders: WhatsApp reminder sent to ${clientPhone} for project ${projectId}`
              );

              // Audit log
              await db.collection("whatsapp_log").add({
                phone:     clientPhone,
                provider:  "meta",
                type:      "overdue_reminder",
                projectId,
                status:    "sent",
                sentAt:    FieldValue.serverTimestamp(),
              });
            } catch (waErr) {
              logger.error(
                `sendOverdueReminders: failed to send WhatsApp to ${clientPhone}`,
                waErr.message
              );
            }
          } else {
            logger.warn(
              `sendOverdueReminders: no phone for client on project ${projectId}, skipping WA`
            );
          }
        }

        // ── Admin warning: >= 7 days on any stage ────────────────────────
        if (daysStuck >= 7) {
          const days = Math.floor(daysStuck);
          const notifRef = db.collection("notifications").doc();
          notifBatch.set(notifRef, {
            userId:    "admin",
            message:   `Project "${projectTitle}" has been stuck at ${stageName} for ${days} days`,
            type:      "warning",
            link:      "/admin/projects",
            read:      false,
            createdAt: FieldValue.serverTimestamp(),
            meta: {
              projectId,
              stageId,
              stageName,
              daysStuck: days,
            },
          });
          notifCount++;
        }
      } catch (projectErr) {
        logger.error(`sendOverdueReminders: error processing project ${projectId}`, projectErr);
      }
    }

    // Commit all admin notifications in one batch
    if (notifCount > 0) {
      try {
        await notifBatch.commit();
        logger.info(`sendOverdueReminders: created ${notifCount} admin warning notification(s)`);
      } catch (batchErr) {
        logger.error("sendOverdueReminders: batch commit failed", batchErr);
      }
    }

    logger.info("sendOverdueReminders: scan complete");
  }
);

/**
 * TRANSLATE TEXT
 * Proxies Google Translate so the browser avoids CORS restrictions.
 * No auth required — translation is not sensitive.
 */
exports.translateText = onCall(
  { cors: true },
  async (request) => {
    // Require authentication — prevents anonymous abuse / quota exhaustion
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

    const { text, targetLang = 'en', sourceLang } = request.data || {};
    if (!text?.trim()) return { translated: null };

    // Auto-detect source language from CJK character presence
    const CJK_RE = /[一-鿿]/;
    const srcLang = sourceLang || (CJK_RE.test(text) ? 'zh-CN' : 'en');

    if (srcLang === targetLang) return { translated: null };

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${srcLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text.slice(0, 1000))}`;
      const resp = await axios.get(url);
      const data = resp.data;
      // Response: [[["translated","original",...],...], ...]
      const translated = Array.isArray(data?.[0])
        ? data[0].map(chunk => chunk?.[0] || '').join('').trim()
        : null;
      return { translated: translated || null };
    } catch (err) {
      logger.error('translateText: failed', err.message);
      return { translated: null };
    }
  }
);
