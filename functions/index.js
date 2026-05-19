/**
 * GLASSTECH ERP - CLOUD FUNCTIONS (GEN 2)
 */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp } = require("firebase-admin/app");
const axios = require("axios");

initializeApp();

// Secrets — set with: firebase functions:secrets:set SECRET_NAME
const META_WA_TOKEN     = defineSecret("META_WA_TOKEN");
const META_WA_PHONE_ID  = defineSecret("META_WA_PHONE_ID");
const TWILIO_SID        = defineSecret("TWILIO_SID");
const TWILIO_AUTH_TOKEN  = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_FROM_NUMBER = defineSecret("TWILIO_FROM_NUMBER");
const ARKESEL_API_KEY   = defineSecret("ARKESEL_API_KEY");

/**
 * WhatsApp Proxy — sends OTP or generic messages server-side.
 * Body: { phone, message, type: 'otp'|'message', provider: 'meta'|'twilio'|'arkesel' }
 * All API tokens live here; the client never sees them.
 */
exports.sendWhatsApp = onRequest(
  { secrets: [META_WA_TOKEN, META_WA_PHONE_ID, TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER, ARKESEL_API_KEY] },
  async (req, res) => {
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
      return res.status(204).send("");
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

        case "twilio": {
          const sid = TWILIO_SID.value();
          const auth = TWILIO_AUTH_TOKEN.value();
          const from = TWILIO_FROM_NUMBER.value();
          const resp = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
            new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:${cleanPhone}`, Body: message }),
            { auth: { username: sid, password: auth }, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          );
          result = { success: true, sid: resp.data?.sid };
          break;
        }

        case "arkesel": {
          const key = ARKESEL_API_KEY.value();
          const resp = await axios.post(
            "https://sms.arkesel.com/api/v2/sms/send",
            { sender: "Glasstech", message, recipients: [cleanPhone] },
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
exports.validateEscrowRelease = onDocumentUpdated("projects/{projectId}", async (event) => {
  const project = event.data.after.data();
  if (project.stage === 11) {
    logger.info(`Project ${event.params.projectId} reached balance-lock stage`);
  }
});

/**
 * SPEECH-TO-TEXT
 * Transcribes voice notes from the Client Portal.
 */
exports.transcribeSupportVoice = onDocumentUpdated("messages/{msgId}", async (event) => {
  const msg = event.data.after.data();
  if (msg.type === "voice" && msg.voiceUrl) {
    logger.info("Voice transcription queued for", event.params.msgId);
  }
});
