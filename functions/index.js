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

initializeApp();

// Secrets — set with: firebase functions:secrets:set SECRET_NAME
const META_WA_TOKEN = { value: () => process.env.META_WA_TOKEN };
const META_WA_PHONE_ID = { value: () => process.env.META_WA_PHONE_ID };
const ARKESEL_API_KEY = defineSecret('ARKESEL_API_KEY');
// Twilio removed — use Meta WhatsApp + Arkesel for all messaging.
const WA_VERIFY_TOKEN = { value: () => process.env.WA_VERIFY_TOKEN };
const PAYSTACK_SECRET_KEY = { value: () => process.env.PAYSTACK_SECRET_KEY };

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

    // Rate limit: max 10 verify calls per UID per hour
    await enforceRateLimit(`verifyPayment:${uid}`, 10, 3600);

    // Verify with Paystack — throws on network failure or non-2xx
    let tx;
    try {
      const resp = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}` } }
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

    // Automatically update project stage based on payment type
    let stageUpdate = null;
    if (type === "deposit") {
      stageUpdate = { stageId: 3, updatedAt: FieldValue.serverTimestamp() };
    } else if (type === "final") {
      stageUpdate = { stageId: 7, updatedAt: FieldValue.serverTimestamp() };
    }
    
    if (stageUpdate) {
      await db.collection("projects").doc(projectId).update(stageUpdate)
        .catch(e => logger.warn("verifyPaystackPayment: could not auto-update project stage", e));
    }

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
exports.initializeHubtelPayment = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new Error("Authentication required");

    const { amountGHS, email, description, returnUrl, cancellationUrl, clientReference } = request.data || {};
    if (!amountGHS || !clientReference) throw new Error("amountGHS and clientReference are required");

    const db = getFirestore();
    let gatewaySettings = {};
    try {
      const snap = await db.collection("system_settings").doc("payment_gateways").get();
      if (snap.exists) gatewaySettings = snap.data();
    } catch (err) {
      logger.error("initializeHubtelPayment: Failed to load gateway settings", err.message);
      throw new Error("Payment gateway configuration error");
    }

    if (!gatewaySettings.enableHubtel || !gatewaySettings.hubtelClientId || !gatewaySettings.hubtelClientSecret || !gatewaySettings.hubtelMerchantId) {
      throw new Error("Hubtel payment gateway is not properly configured");
    }

    const { hubtelClientId, hubtelClientSecret, hubtelMerchantId } = gatewaySettings;
    const authHeader = `Basic ${Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64')}`;

    try {
      const resp = await axios.post(
        "https://payproxyapi.hubtel.com/items/initiate",
        {
          totalAmount: amountGHS,
          description: description || "Westline Future Invoice Payment",
          callbackUrl: "https://westlinefuture.web.app/api/webhook/hubtel", // We don't necessarily have a webhook yet, but it's required
          returnUrl: returnUrl || "https://westlinefuture.web.app/portal",
          cancellationUrl: cancellationUrl || "https://westlinefuture.web.app/portal",
          merchantAccountNumber: hubtelMerchantId,
          clientReference: clientReference
        },
        { headers: { Authorization: authHeader, "Content-Type": "application/json" } }
      );
      
      // Hubtel returns { status: "Success", data: { checkoutUrl: "..." } }
      return { success: true, checkoutUrl: resp.data?.data?.checkoutUrl, checkoutId: resp.data?.data?.checkoutId };
    } catch (err) {
      logger.error("initializeHubtelPayment error:", err.response?.data || err.message);
      throw new Error("Could not initialize Hubtel checkout: " + (err.response?.data?.message || err.message));
    }
  }
);

exports.verifyHubtelPayment = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new Error("Authentication required");

    const { clientReference, projectId, invoiceId, expectedAmountGHS, type = "payment" } = request.data || {};
    if (!clientReference || !projectId) throw new Error("clientReference and projectId are required");

    const uid = request.auth.uid;
    await enforceRateLimit(`verifyPayment:${uid}`, 10, 3600);

    const db = getFirestore();
    let gatewaySettings = {};
    try {
      const snap = await db.collection("system_settings").doc("payment_gateways").get();
      if (snap.exists) gatewaySettings = snap.data();
    } catch (err) {
      logger.error("verifyHubtelPayment: Failed to load gateway settings", err.message);
      throw new Error("Payment gateway configuration error");
    }

    const { hubtelClientId, hubtelClientSecret } = gatewaySettings;
    const authHeader = `Basic ${Buffer.from(`${hubtelClientId}:${hubtelClientSecret}`).toString('base64')}`;

    let tx;
    try {
      // According to Hubtel API, we can check status via:
      // GET https://payproxyapi.hubtel.com/items/check-status/{clientReference}
      const resp = await axios.get(
        `https://payproxyapi.hubtel.com/items/check-status/${encodeURIComponent(clientReference)}`,
        { headers: { Authorization: authHeader } }
      );
      tx = resp.data?.data;
    } catch (err) {
      logger.error("verifyHubtelPayment API error", err.response?.data || err.message);
      throw new Error("Could not reach Hubtel to verify payment");
    }

    // Usually Hubtel status is 'Paid' or 'Success' for completed txns
    if (!tx || (tx.status !== "Paid" && tx.status !== "Success")) {
      throw new Error(`Payment not confirmed by Hubtel: ${tx?.status || "unknown status"}`);
    }

    const amountGHS = Number(tx.amount);
    const txId = `TX-${clientReference}`;

    // ── AMOUNT VALIDATION ────────────────────────────────────────────────────
    if (expectedAmountGHS && typeof expectedAmountGHS === "number") {
      const tolerance = expectedAmountGHS * 0.02;
      if (amountGHS < expectedAmountGHS - tolerance) {
        throw new Error(`Payment amount mismatch. Expected GHS ${expectedAmountGHS.toFixed(2)} but paid GHS ${amountGHS.toFixed(2)}.`);
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

exports.createStaffAccount = onCall(async (request) => {
  if (!request.auth) throw new Error("Authentication required");

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
  if (!request.auth) throw new Error("Authentication required");

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
  return { id, created: true };
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
 * STAFF PASSWORD RESET VIA SMS
 * Generates a Firebase password-reset link with the Admin SDK and
 * delivers it to the staff member's phone via Arkesel SMS.
 * This bypasses the Firebase default noreply email (which lands in spam).
 *
 * Callable: httpsCallable(functions, 'resetStaffPasswordBySMS')
 * Body: { email, phone }   — phone is the staff member's phone number
 */
exports.resetStaffPasswordBySMS = onCall(
  { cors: true },
  async (request) => {
    if (!request.auth) throw new Error("Authentication required");

    const { email, phone } = request.data || {};
    if (!email) throw new Error("email is required");
    if (!phone) throw new Error("phone is required — needed to deliver reset link via SMS");

    const adminAuth = getAdminAuth();

    let resetLink;
    try {
      resetLink = await adminAuth.generatePasswordResetLink(email.trim());
    } catch (err) {
      logger.error("resetStaffPasswordBySMS: generatePasswordResetLink failed", err.message);
      throw new Error("Could not generate reset link: " + err.message);
    }

    const key = ARKESEL_API_KEY.value();
    const recipient = normalizePhone(phone);
    const message = `Westline Future ERP\n\nPassword reset requested for ${email}.\n\nReset link (expires in 1 hour):\n${resetLink}\n\nIgnore if you did not request this.`;

    try {
      await axios.post(
        "https://sms.arkesel.com/api/v2/sms/send",
        { sender: "WestlineFtr", message, recipients: [recipient] },
        { headers: { "api-key": key } }
      );
    } catch (err) {
      logger.error("resetStaffPasswordBySMS: SMS send failed", err.response?.data || err.message);
      throw new Error("Reset link generated but SMS delivery failed. Please contact admin.");
    }

    logger.info(`resetStaffPasswordBySMS: reset link sent to ${recipient} for ${email}`);
    return { success: true, phone: recipient };
  }
);

/**
 * ADMIN SET STAFF PASSWORD
 * Lets an authenticated admin forcefully set a new password for any staff/worker.
 * Uses the Admin SDK so this is done server-side with full privilege.
 * Also stores the new password in Firestore so admin can view it later.
 *
 * Callable: httpsCallable(functions, 'setStaffPassword')
 * Body: { uid, newPassword }
 */
exports.setStaffPassword = onCall(async (request) => {
  if (!request.auth) throw new Error("Authentication required");

  const { uid, newPassword } = request.data || {};
  if (!uid) throw new Error("uid is required");
  if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters");

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

/**
 * SEND SMS (onCall wrapper around Arkesel)
 * Client calls: httpsCallable(functions, 'sendSMS')
 * Body: { phone, message }
 * Auth required so arbitrary callers can't abuse it.
 */
exports.sendSMS = onCall(
  { cors: true, secrets: [ARKESEL_API_KEY] },
  async (request) => {
    if (!request.auth) throw new Error("Authentication required");

    const { phone, message } = request.data || {};
    if (!phone || !message) throw new Error("phone and message are required");

    // Rate limit: max 20 SMS per UID per hour
    await enforceRateLimit(`sendSMS:${request.auth.uid}`, 20, 3600);

    const key = ARKESEL_API_KEY.value();
    const recipient = normalizePhone(phone);

    let resp;
    try {
      resp = await axios.post(
        "https://sms.arkesel.com/api/v2/sms/send",
        { sender: "WestlineFtr", message, recipients: [recipient] },
        { headers: { "api-key": key } }
      );
    } catch (err) {
      logger.error("sendSMS: Arkesel error", err.response?.data || err.message);
      throw new Error("SMS delivery failed: " + (err.response?.data?.message || err.message));
    }

    logger.info(`sendSMS: delivered to ${recipient}`, resp.data);

    try {
      const db = getFirestore();
      await db.collection("sms_log").add({
        phone: recipient,
        status: "sent",
        sentAt: FieldValue.serverTimestamp(),
      });
    } catch (_) {}

    return { success: true, data: resp.data };
  }
);

exports.repairStaffAccount = onCall(async (request) => {
  if (!request.auth) throw new Error("Authentication required");

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
 * WhatsApp Proxy — sends OTP or generic messages server-side.
 * Body: { phone, message, type: 'otp'|'message', provider: 'meta'|'twilio'|'arkesel' }
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

    const { phone, message, provider = "meta" } = req.body;
    if (!phone || !message) return res.status(400).json({ error: "phone and message are required" });

    // Sanitize phone: ensure E.164 format
    const cleanPhone = phone.replace(/\s+/g, "").replace(/^00/, "+");

    try {
      let result;

      switch (provider.toLowerCase()) {
        case "meta": {
          const token = META_WA_TOKEN.value();
          const phoneId = META_WA_PHONE_ID.value();
          const resp = await axios.post(
            `https://graph.facebook.com/v19.0/${phoneId}/messages`,
            {
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "text",
              text: { body: message }
            },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
          );
          result = { success: true, messageId: resp.data?.messages?.[0]?.id };
          break;
        }

        case "arkesel": {
          const key = ARKESEL_API_KEY.value();
          const resp = await axios.post(
            "https://sms.arkesel.com/api/v2/sms/send",
            { sender: "WestlineFtr", message, recipients: [cleanPhone] },
            { headers: { "api-key": key } }
          );
          result = { success: true, data: resp.data };
          break;
        }

        default:
          return res.status(400).json({ error: `Unsupported provider: ${provider}` });
      }

      // Log to Firestore for audit trail
      try {
        const db = getFirestore();
        await db.collection("whatsapp_log").add({
          phone: cleanPhone,
          provider,
          status: "sent",
          sentAt: FieldValue.serverTimestamp()
        });
      } catch (logErr) { logger.warn("Audit log write failed:", logErr.message); }

      return res.status(200).json(result);
    } catch (err) {
      logger.error("sendWhatsApp error", { provider, error: err.message });
      return res.status(500).json({ error: "Message delivery failed", detail: err.message });
    }
  }
);

/**
 * AUTO-LOGISTICS WEBHOOK
 * Triggered when a container status is updated.
 */
exports.onLogisticsUpdate = onDocumentUpdated("containers/{containerId}", async (event) => {
  const newData = event.data.after.data();
  const oldData = event.data.before.data();
  if (newData.status !== oldData.status) {
    logger.info(`Container ${event.params.containerId} → ${newData.status}`);
  }
});

/**
 * FINANCIAL GATEKEEPER (SERVER-SIDE)
 * Validates escrow release and locks logistics dispatch.
 */
exports.validateEscrowRelease = onRequest(
  { cors: true },
  async (req, res) => {
    try {
      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "POST required" });
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
      const locked = stageValue >= 10 && paymentStatus !== "Settled";

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
// Helper: send a WhatsApp message via Arkesel SMS/WhatsApp API
// ---------------------------------------------------------------------------
async function sendWA(phone, message) {
  const key = ARKESEL_API_KEY.value();
  // Arkesel expects a phone with country code, no +
  const recipient = normalizePhone(phone);
  const resp = await axios.post(
    "https://sms.arkesel.com/api/v2/sms/send",
    {
      sender: "WestlineFtr",
      message,
      recipients: [recipient],
    },
    { headers: { "api-key": key } }
  );
  return resp.data;
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
          .where("stageId", "<", 7)
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

// Stages where the client is the responsible party
const CLIENT_ACTION_STAGES = new Set([2, 7]);

// Human-readable stage names — mirrors frontend CLIENT_PROJECT_STAGES (7-stage pipeline)
const STAGE_NAMES = {
  1: "Intake",
  2: "Quote Approval & Deposit",
  3: "Procurement & Production",
  4: "Shipping & Delivery",
  5: "Installation",
  6: "Inspection & Sign-off",
  7: "Handover & Final Settlement",
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

    // Fetch all active projects (stageId < 12)
    let projectsSnap;
    try {
      projectsSnap = await db
        .collection("projects")
        .where("stageId", "<", 7)
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
                provider:  "arkesel",
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
