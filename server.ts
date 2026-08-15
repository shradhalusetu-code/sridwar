/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import helmet from "helmet";
import { z, ZodError } from "zod";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// ─── Security headers (helmet) ─────────────────────────────────────────────
//
// helmet sets a batch of standard security-related HTTP headers. Two of its
// defaults are turned off deliberately rather than left on, to avoid
// breaking things that already work in production:
//
//   - contentSecurityPolicy: OFF. The site loads Google Tag Manager,
//     Microsoft Clarity, Supabase, Google Forms, and various image/font
//     origins from index.html. Helmet's default CSP would block all of
//     that until every origin is explicitly allow-listed. Turning this on
//     safely needs a real audit of every external script/style/img/connect
//     origin currently in use — recommended as a follow-up, not something
//     to silently flip on here and risk a blank white screen in prod.
//   - crossOriginEmbedderPolicy: OFF. This can block cross-origin images
//     (temple photos, deity images, WebP CDNs) unless every one of those
//     origins sends the matching CORP/CORS headers, which we don't control
//     for third-party origins.
//
// Everything else helmet sets by default is safe to enable as-is:
// X-Content-Type-Options (no-sniff), X-Frame-Options (clickjacking
// protection), Referrer-Policy, HSTS, hidden "X-Powered-By", and more.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// NOTE on the rate limiter below: if you deploy behind a reverse proxy/load
// balancer (most hosting platforms — Render, Railway, Vercel, etc. — do
// this), Express needs `app.set('trust proxy', ...)` configured correctly
// for `req.ip` to reflect the real visitor IP instead of the proxy's IP.
// Without it, every visitor may appear to share one IP and get rate-limited
// together. Set this to match your specific host's guidance (e.g.
// `app.set('trust proxy', 1)` for "one hop behind a proxy") rather than
// `true`, which trusts any X-Forwarded-For header and can be spoofed.

// Middleware to parse JSON payloads
app.use(express.json());

// ─── Request validation (Zod) ──────────────────────────────────────────────
//
// Wraps a Zod schema into an Express middleware. On success, req.body is
// replaced with the parsed/typed result (so defaults and coercions apply
// consistently downstream). On failure, responds 400 with a readable list
// of what was wrong instead of letting a malformed request reach handler
// logic that assumes a certain shape.
function validateBody(schema: z.ZodTypeAny) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: "Invalid request.",
          details: err.errors.map((e) => `${e.path.join(".") || "body"}: ${e.message}`),
        });
        return;
      }
      res.status(400).json({ error: "Invalid request." });
    }
  };
}

// ─── Audit logging ──────────────────────────────────────────────────────────
//
// Best-effort, append-only audit trail for sensitive events (account
// deletion today; the natural place to add payment/refund events once a
// real payment endpoint exists server-side rather than being handled
// client-side via Google Forms/UPI deep link). Writes newline-delimited
// JSON to audit.log next to the server process.
//
// This is intentionally "best effort": on hosts with an ephemeral or
// read-only filesystem (many serverless/container platforms), the write
// may silently no-op — that's fine, since the primary record is still the
// console.log line that already existed for each of these events. If you
// need a durable, queryable audit trail (recommended before launch), the
// cleanest fix is a small `audit_log` table in Supabase and swapping the
// fs.appendFile call below for a supabaseAdmin.from("audit_log").insert(...)
// call — the call site here is the only place that would need to change.
const AUDIT_LOG_PATH = path.join(process.cwd(), "audit.log");

function appendAuditLog(event: string, details: Record<string, unknown>) {
  const entry = {
    event,
    at: new Date().toISOString(),
    ...details,
  };
  console.log(`[Audit] ${event}:`, JSON.stringify(entry));
  try {
    fs.appendFile(AUDIT_LOG_PATH, JSON.stringify(entry) + "\n", (err) => {
      if (err) console.error("[Audit] Failed to write audit.log:", err.message);
    });
  } catch (err: any) {
    console.error("[Audit] Failed to write audit.log:", err?.message);
  }
}

// Lazy-initialize a Supabase "admin" client using the SERVICE ROLE key.
// This key must NEVER be exposed to the browser/app — it only ever lives
// here on the server, read from an environment variable. It is used
// exclusively for the self-service account deletion endpoint below, to
// (a) verify the caller's own Supabase access token and (b) permanently
// remove their auth user + rows they own once verified.
let supabaseAdminClient: ReturnType<typeof createClient> | null = null;
function getSupabaseAdminClient(): ReturnType<typeof createClient> | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabaseAdminClient;
}

// Lazy-initialize Gemini Client to prevent crash if key is missing during startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Lightweight in-memory rate limiter for /api/assistant — no new npm
// dependency required. This endpoint is the only one that costs real money
// per call (Gemini API usage), and it previously had zero limits, meaning
// anyone who found the endpoint could spam it and run up your AI bill.
// This is intentionally simple (per-IP sliding window, in-process memory)
// rather than a full package like express-rate-limit, so it works with no
// new dependency to install and no infrastructure (e.g. Redis) to run. It
// resets if the server restarts and won't coordinate across multiple
// server instances — both are fine for a single-instance deployment; if
// you ever run multiple server instances behind a load balancer, swap
// this for express-rate-limit + a shared store instead.
const ASSISTANT_RATE_LIMIT = 20; // max requests
const ASSISTANT_RATE_WINDOW_MS = 10 * 60 * 1000; // per 10 minutes, per IP
const assistantRequestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (assistantRequestLog.get(ip) || []).filter(
    (t) => now - t < ASSISTANT_RATE_WINDOW_MS
  );
  if (timestamps.length >= ASSISTANT_RATE_LIMIT) {
    assistantRequestLog.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  assistantRequestLog.set(ip, timestamps);
  return false;
}

// Periodically clear old entries so this Map doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of assistantRequestLog.entries()) {
    const fresh = timestamps.filter((t) => now - t < ASSISTANT_RATE_WINDOW_MS);
    if (fresh.length === 0) assistantRequestLog.delete(ip);
    else assistantRequestLog.set(ip, fresh);
  }
}, ASSISTANT_RATE_WINDOW_MS).unref?.();

// Schema for /api/assistant. `.passthrough()` deliberately allows any extra
// fields the client might send through unchanged, rather than rejecting the
// whole request — the point of this schema is to guarantee `message` and
// (if present) `history` are the right shape, not to lock the payload down
// to an exact key list.
const assistantRequestSchema = z
  .object({
    message: z.string().min(1, "Message is required").max(2000, "Message is too long."),
    history: z
      .array(
        z
          .object({
            role: z.string().optional(),
            text: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

// 1. Helper: AI-powered devotee assistant
app.post("/api/assistant", validateBody(assistantRequestSchema), async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(clientIp)) {
    res.status(429).json({
      error: "Too many requests to the Devotee Assistant. Please wait a few minutes and try again.",
    });
    return;
  }

  // Body shape is already guaranteed by validateBody(assistantRequestSchema)
  // above; these extra checks are kept as harmless defense-in-depth in case
  // this handler is ever reused without the middleware.
  const { message, history } = req.body;

  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }
  if (typeof message !== "string" || message.length > 2000) {
    res.status(400).json({ error: "Message is too long." });
    return;
  }

  const ai = getGeminiClient();

  // If Gemini secret key is missing or invalid, execute an authentic local rule-based fallback guide
  if (!ai) {
    const query = message.toLowerCase();
    let reply = "Hari Om! 🙏 Our AI Devotee Assistant is in localized mode. ";

    if (query.includes("puri") || query.includes("jagannath")) {
      reply += "Lord Jagannath Temple in Puri is renowned for its Mahaprasad and Ratha Yatra. We offer authentic online pujas, and you can request a beautifully handcrafted Darshan Certificate right from the home page.";
    } else if (query.includes("kashi") || query.includes("shiva") || query.includes("varanasi")) {
      reply += "Kashi Vishwanath Temple in Varanasi is the spiritual core of India, housing a majestic self-manifested Jyotirlinga. We offer complete Rudrabhishek Seva performed by verified pandits in your name and Gotra.";
    } else if (query.includes("founder") || query.includes("kunu") || query.includes("rana")) {
      reply += "Sri Dwar was founded by Kunu Rana with a vision of preserving ancient faith. This platform bridges spatial distance for devotees globally.";
    } else if (query.includes("seva") || query.includes("annadanam") || query.includes("cow")) {
      reply += "We offer direct sponsorships for Annadanam, Gau Seva, and Akhanda Diya lighting at major temples. You can track your spiritual impact directly on our dynamic Seva Dashboard.";
    } else if (query.includes("cert") || query.includes("darshan")) {
      reply += "To receive a premium Darshan Certificate, utilize the 'Receive Darshan Certificate' button in the header modal, submit the details of your recent temple visit, and our coordinators will deliver a handcrafted, blessed certificate.";
    } else {
      reply += "Welcome to Sri Dwar. We facilitate secure remote pujas, sacred offerings, local artisan crafts, and direct live darshan flows. To experience live AI replies, please configure the required secret key in the Settings > Secrets menu!";
    }

    res.json({ text: reply, status: "offline-rule-based-fallback" });
    return;
  }

  try {
    const systemPrompt = `You are the divine, highly knowledgeable digital guide of Sri Dwar (a premium faith-tech ecosystem).
Speak with peace, warmth, profound spiritual wisdom, and cultural authenticity. Your name is 'Dharmic Margadarshak'.
Help devotees choose temples, understand mantras, sevas, pujas, and explain spiritual Concepts from Vedas, Upanishads, and Gita elegantly.
Format your responses beautifully with clear paragraphs or structured points.
If asked about the platform founder, proudly mention Kunu Rana who built Sri Dwar with a vision of merging ancient tradition with modern technology.
Always close with a brief warm greeting (e.g. "May Lord Jagannath bless your home" or "Om Namah Shivaya").`;

    const chatContents = [];

    // Convert history formatted for Gemini SDK if provided
    if (history && Array.isArray(history)) {
      for (const h of history) {
        chatContents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      }
    }

    chatContents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: chatContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "May peace be with you." });
  } catch (error: any) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({ error: "Failed to generate spiritual response", details: error.message });
  }
});

const refundRequestSchema = z
  .object({
    requestRefId: z.string().min(1),
    bookingRefId: z.string().min(1),
    itemName: z.string().min(1),
    amount: z.union([z.number(), z.string()]),
    devoteeName: z.string().min(1),
    devoteeEmail: z.string().min(1),
    devoteePhone: z.string().min(1),
    reason: z.string().min(1),
  })
  .passthrough();

// Best-effort audit record for refund/cancellation requests submitted via
// RefundRequestModal.tsx. This is intentionally NOT the system of record —
// the Google Forms sync and the Supabase `form_submissions` row (both fired
// client-side alongside this call) are what durably capture the request
// even if this endpoint is briefly unreachable. This just gives you a
// server-side, timestamped audit trail to cross-check against, consistent
// with the account-deletion and form-submission audit logging above.
app.post("/api/refund-request", validateBody(refundRequestSchema), (req, res) => {
  const { requestRefId, bookingRefId, itemName, amount, devoteeName, devoteeEmail, devoteePhone, reason } = req.body;

  appendAuditLog("refund_request_submitted", {
    requestRefId,
    bookingRefId,
    itemName,
    amount,
    devoteeName,
    devoteeEmail,
    devoteePhone,
    reason,
  });

  res.json({ status: "received", requestRefId });
});

// 2. Connector: Simulated Real-Time Forms Submission & Real-Time Google Sheets/Drive Sync logs
app.get("/api/config", (req, res) => {
  res.json({
    GOOGLE_FORM_ID_CERTIFICATE: process.env.GOOGLE_FORM_ID_CERTIFICATE || process.env.VITE_GOOGLE_FORM_ID_CERTIFICATE || "",
    ENTRY_CERT_NAME: process.env.ENTRY_CERT_NAME || "",
    ENTRY_CERT_TEMPLE: process.env.ENTRY_CERT_TEMPLE || "",
    ENTRY_CERT_AGE: process.env.ENTRY_CERT_AGE || "",
    ENTRY_CERT_DEITY: process.env.ENTRY_CERT_DEITY || "",
    ENTRY_CERT_PHONE: process.env.ENTRY_CERT_PHONE || "",
    ENTRY_CERT_WHATSAPP: process.env.ENTRY_CERT_WHATSAPP || "",
    ENTRY_CERT_EMAIL: process.env.ENTRY_CERT_EMAIL || "",
    ENTRY_CERT_CITY: process.env.ENTRY_CERT_CITY || "",
    ENTRY_CERT_FEEDBACK: process.env.ENTRY_CERT_FEEDBACK || "",
    ENTRY_CERT_CONTRIBUTION: process.env.ENTRY_CERT_CONTRIBUTION || "",

    GOOGLE_FORM_ID_PUJA: process.env.GOOGLE_FORM_ID_PUJA || process.env.VITE_GOOGLE_FORM_ID_PUJA || "",
    ENTRY_PUJA_NAME: process.env.ENTRY_PUJA_NAME || "",
    ENTRY_PUJA_TEMPLE: process.env.ENTRY_PUJA_TEMPLE || "",
    ENTRY_PUJA_PUJA_TYPE: process.env.ENTRY_PUJA_PUJA_TYPE || "",
    ENTRY_PUJA_DATE: process.env.ENTRY_PUJA_DATE || "",
    ENTRY_PUJA_PHONE: process.env.ENTRY_PUJA_PHONE || "",
    ENTRY_PUJA_WHATSAPP: process.env.ENTRY_PUJA_WHATSAPP || "",
    ENTRY_PUJA_EMAIL: process.env.ENTRY_PUJA_EMAIL || "",
    ENTRY_PUJA_CITY: process.env.ENTRY_PUJA_CITY || "",
    ENTRY_PUJA_NOTES: process.env.ENTRY_PUJA_NOTES || "",
    ENTRY_PUJA_SELECTED: process.env.ENTRY_PUJA_SELECTED || "",
    ENTRY_PUJA_FEE: process.env.ENTRY_PUJA_FEE || "",
    ENTRY_PUJA_DOB: process.env.ENTRY_PUJA_DOB || "",
    ENTRY_PUJA_GOTRA: process.env.ENTRY_PUJA_GOTRA || "",
    ENTRY_PUJA_RASHI: process.env.ENTRY_PUJA_RASHI || "",
    ENTRY_PUJA_INTENT: process.env.ENTRY_PUJA_INTENT || "",

    GOOGLE_FORM_ID_SEVA: process.env.GOOGLE_FORM_ID_SEVA || process.env.VITE_GOOGLE_FORM_ID_SEVA || "",
    ENTRY_SEVA_NAME: process.env.ENTRY_SEVA_NAME || "",
    ENTRY_SEVA_TEMPLE: process.env.ENTRY_SEVA_TEMPLE || "",
    ENTRY_SEVA_SEVA_TYPE: process.env.ENTRY_SEVA_SEVA_TYPE || "",
    ENTRY_SEVA_PHONE: process.env.ENTRY_SEVA_PHONE || "",
    ENTRY_SEVA_WHATSAPP: process.env.ENTRY_SEVA_WHATSAPP || "",
    ENTRY_SEVA_EMAIL: process.env.ENTRY_SEVA_EMAIL || "",
    ENTRY_SEVA_CITY: process.env.ENTRY_SEVA_CITY || "",
    ENTRY_SEVA_DATE: process.env.ENTRY_SEVA_DATE || "",
    ENTRY_SEVA_NOTES: process.env.ENTRY_SEVA_NOTES || "",
    ENTRY_SEVA_SELECTED: process.env.ENTRY_SEVA_SELECTED || "",
    ENTRY_SEVA_FEE: process.env.ENTRY_SEVA_FEE || "",
    ENTRY_SEVA_DOB: process.env.ENTRY_SEVA_DOB || "",
    ENTRY_SEVA_GOTRA: process.env.ENTRY_SEVA_GOTRA || "",
    ENTRY_SEVA_RASHI: process.env.ENTRY_SEVA_RASHI || "",
    ENTRY_SEVA_INTENT: process.env.ENTRY_SEVA_INTENT || "",

    GOOGLE_FORM_ID_SUPPORT: process.env.GOOGLE_FORM_ID_SUPPORT || process.env.VITE_GOOGLE_FORM_ID_SUPPORT || "",
    ENTRY_SUPPORT_NAME: process.env.ENTRY_SUPPORT_NAME || "",
    ENTRY_SUPPORT_EMAIL: process.env.ENTRY_SUPPORT_EMAIL || "",
    ENTRY_SUPPORT_PHONE: process.env.ENTRY_SUPPORT_PHONE || "",
    ENTRY_SUPPORT_TYPE: process.env.ENTRY_SUPPORT_TYPE || "",
    ENTRY_SUPPORT_MESSAGE: process.env.ENTRY_SUPPORT_MESSAGE || "",

    GOOGLE_FORM_ID_INQUIRY: process.env.GOOGLE_FORM_ID_INQUIRY || process.env.VITE_GOOGLE_FORM_ID_INQUIRY || "",
    ENTRY_INQUIRY_NAME: process.env.ENTRY_INQUIRY_NAME || "",
    ENTRY_INQUIRY_EMAIL: process.env.ENTRY_INQUIRY_EMAIL || "",
    ENTRY_INQUIRY_PHONE: process.env.ENTRY_INQUIRY_PHONE || "",
    ENTRY_INQUIRY_SUBJECT: process.env.ENTRY_INQUIRY_SUBJECT || "",
    ENTRY_INQUIRY_MESSAGE: process.env.ENTRY_INQUIRY_MESSAGE || "",
  });
});

const submitFormRequestSchema = z
  .object({
    formType: z.string().min(1, "formType is required"),
    formData: z.record(z.any()).optional().default({}),
  })
  .passthrough();

app.post("/api/submit-form", validateBody(submitFormRequestSchema), (req, res) => {
  const { formType, formData } = req.body;
  console.log(`[Form Received - ${formType}]:`, JSON.stringify(formData, null, 2));

  const refId = `SD-${Math.floor(100000 + Math.random() * 900000)}`;

  // Booking/seva/puja submissions are the closest thing this app has to a
  // "payment-adjacent" event today (actual payment happens client-side via
  // UPI deep link / Google Forms — see the note above googleFormSync.ts).
  // Recording each one here gives you a searchable, timestamped trail
  // independent of the Google Sheet, in case a sheet row goes missing or a
  // devotee disputes a booking.
  appendAuditLog("form_submission", { formType, refId });

  // NOTE: this endpoint only logs the submission server-side for debugging.
  // The actual Google Form sync happens client-side via
  // src/utils/googleFormSync.ts, which posts directly to the relevant
  // Google Form. This endpoint does not itself write to Google Drive or
  // Sheets, so its response must not claim that it does.
  res.json({
    status: "received",
    message: "Form submission received.",
    syncedAt: new Date().toISOString(),
    refId,
  });
});

// 2b. Self-service account deletion.
//
// Required by Google Play (apps that support account creation must offer a
// working in-app/web account deletion path). The devotee's own Supabase
// access token is verified server-side using the Supabase service role key
// (never exposed to the client) before anything is deleted, so this can
// only ever delete the account that the token belongs to — never someone
// else's.
app.post("/api/account/delete", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!accessToken) {
    res.status(401).json({ error: "Missing or invalid authorization token." });
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    console.error("Account deletion requested but SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL is not configured.");
    res.status(500).json({
      error: "Account deletion is temporarily unavailable. Please email puja@sridwar.com and we'll complete it for you within 30 days.",
    });
    return;
  }

  try {
    // Verify the token and resolve it to a real, currently-valid user.
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      res.status(401).json({ error: "Your session is invalid or has expired. Please log in again and retry." });
      return;
    }

    const userId = userData.user.id;

    // Remove owned rows first (best-effort — a failure here does not block
    // deleting the auth account itself, since the account is the primary
    // identity a devotee wants gone). Table names match src/lib/activities.ts.
    const tablesToClean: Array<{ table: string; column: string }> = [
      { table: "family_members", column: "user_id" },
      { table: "activities", column: "user_id" },
      { table: "form_submissions", column: "user_id" },
      { table: "profiles", column: "id" },
    ];

    for (const { table, column } of tablesToClean) {
      const { error: deleteError } = await supabaseAdmin.from(table).delete().eq(column, userId);
      if (deleteError) {
        console.error(`Account deletion: failed to clear "${table}" for user ${userId}:`, deleteError.message);
      }
    }

    // Finally, delete the Supabase Auth user itself.
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error(`Account deletion: failed to delete auth user ${userId}:`, deleteUserError.message);
      appendAuditLog("account_deletion_failed", { userId, reason: deleteUserError.message });
      res.status(500).json({
        error: "We removed your saved data but couldn't finish deleting your login. Please email puja@sridwar.com to complete this.",
      });
      return;
    }

    console.log(`Account deletion: user ${userId} and associated data deleted successfully.`);
    appendAuditLog("account_deletion_succeeded", { userId });
    res.json({ status: "deleted" });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    appendAuditLog("account_deletion_error", { message: error?.message || "unknown error" });
    res.status(500).json({
      error: "Something went wrong deleting your account. Please email puja@sridwar.com and we'll complete it for you within 30 days.",
    });
  }
});

// 2c. Admin: certificate & booking-confirmation PDF generation.
//
// Wraps certificateService.ts (a separate drop-in file already in this
// project root) behind two header-secret-protected admin actions:
//   - mark-completed-and-send: the "one-click send" that replaces the fully
//     manual handcraft process. Marks a booking's service as actually
//     performed (completion_status / performed_at — never the same thing
//     as payment) and immediately generates + emails the final certificate.
//   - send-booking-confirmation: generates/(re)sends the Payment-Confirmed
//     Booking PDF for a booking whose payment_status is already 'confirmed'.
//
// SAFETY — why this cannot take the rest of the site down:
//   - certificateService.ts, and its pdf-lib/@supabase dependency, is
//     imported DYNAMICALLY, inside each handler — not at the top of this
//     file. If pdf-lib isn't installed yet, or a Supabase env var is
//     missing, only these two admin calls fail with a clear JSON error;
//     server startup and every existing route are unaffected.
//   - Both routes require the CERTIFICATE_ADMIN_SECRET env var to match an
//     x-admin-secret header. If that env var isn't set, both routes refuse
//     every request outright (fail closed, not open).
//   - Nothing else in the app calls either route yet — no existing
//     booking, payment, or email flow is touched, so nothing changes for
//     a devotee using the site today until you (the admin) call one of
//     these yourself.
function requireCertAdminSecret(req: express.Request, res: express.Response): boolean {
  const configured = process.env.CERTIFICATE_ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"];
  if (!configured || provided !== configured) {
    res.status(401).json({ error: "Unauthorized." });
    return false;
  }
  return true;
}

const markCompletedSchema = z.object({
  refId: z.string().min(1, "refId is required"),
  // Optional — if the certificate is being sent for a rite performed in the
  // past (e.g. catching up on a backlog), pass the real performed date.
  // Defaults to "now" only when omitted.
  performedAt: z.string().datetime().optional(),
});

app.post(
  "/api/admin/certificates/mark-completed-and-send",
  validateBody(markCompletedSchema),
  async (req, res) => {
    if (!requireCertAdminSecret(req, res)) return;

    const { refId, performedAt } = req.body;
    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      res.status(500).json({
        error: "Supabase is not configured on the server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      });
      return;
    }

    try {
      // Step 1 — mark the service as actually performed. This is the ONLY
      // place completion_status/performed_at ever get set; payment
      // confirmation never touches these columns.
      const { error: updateError } = await supabaseAdmin
        .from("activities")
        .update({
          completion_status: "completed",
          performed_at: performedAt || new Date().toISOString(),
        } as never)
        .eq("ref_id", refId);

      if (updateError) {
        appendAuditLog("certificate_mark_completed_failed", { refId, reason: updateError.message });
        res.status(500).json({ error: `Could not mark booking as completed: ${updateError.message}` });
        return;
      }
      appendAuditLog("certificate_mark_completed", { refId, performedAt: performedAt || new Date().toISOString() });

      // Step 2 — generate + email the certificate. Dynamically imported so
      // a missing pdf-lib install, or a schema that hasn't been migrated
      // yet, can only ever fail THIS request, never the server itself.
      const { generateCertificatePdf } = await import("./certificateService");
      const result = await generateCertificatePdf(refId);

      appendAuditLog("certificate_generated", { refId, status: result.status, emailStatus: result.emailStatus });
      res.json(result);
    } catch (err: any) {
      const code = err?.code || "error";
      appendAuditLog("certificate_generation_failed", { refId, code, message: err?.message });
      res.status(code === "not_completed" || code === "payment_not_confirmed" ? 400 : 500).json({
        error: err?.message || "Certificate generation failed.",
        code,
      });
    }
  }
);

const sendBookingConfirmationSchema = z.object({
  refId: z.string().min(1, "refId is required"),
});

app.post(
  "/api/admin/certificates/send-booking-confirmation",
  validateBody(sendBookingConfirmationSchema),
  async (req, res) => {
    if (!requireCertAdminSecret(req, res)) return;

    const { refId } = req.body;
    try {
      const { generateBookingConfirmationPdf } = await import("./certificateService");
      const result = await generateBookingConfirmationPdf(refId);
      appendAuditLog("booking_confirmation_generated", { refId, status: result.status, emailStatus: result.emailStatus });
      res.json(result);
    } catch (err: any) {
      const code = err?.code || "error";
      appendAuditLog("booking_confirmation_generation_failed", { refId, code, message: err?.message });
      res.status(code === "payment_not_confirmed" ? 400 : 500).json({
        error: err?.message || "Booking confirmation generation failed.",
        code,
      });
    }
  }
);

// 2d. Automatic trigger for booking-confirmation invoices — Supabase Database
// Webhook target.
//
// WHY THIS EXISTS: nothing in the codebase ever called
// generateBookingConfirmationPdf() automatically before this. The only path
// in was the manual admin route above (send-booking-confirmation), meaning
// every invoice+email had to be fired by hand. This route lets a Supabase
// Database Webhook (configured once, in the Supabase dashboard — no code
// there) call it automatically the instant you mark a row's payment_status
// as 'confirmed' in the Supabase table editor, which is the real moment
// your manual UPI-verification process ends.
//
// SAFETY:
//   - Separate secret (SUPABASE_WEBHOOK_SECRET) from CERTIFICATE_ADMIN_SECRET
//     — a leaked Supabase webhook URL can never be used to hit your other
//     admin routes, and vice versa.
//   - Fails closed: missing/wrong secret -> 401, same pattern as every other
//     admin/webhook route in this file.
//   - Only acts when record.payment_status === 'confirmed'. Supabase fires
//     this webhook on EVERY update to a row (not just payment_status
//     changes) — e.g. editing an unrelated column on an already-confirmed
//     booking would also trigger a call here. That's harmless: (a) if
//     old_record.payment_status was ALREADY 'confirmed', this handler skips
//     without calling the pipeline at all (see the transition check below);
//     (b) even if it did call through, certificateService.ts's own
//     idempotency claim (see Webhook.gs / certificate_idempotency table)
//     guarantees at most one PDF and one email per ref_id, ever.
//   - Dynamically imported, exactly like the two admin routes above — a
//     missing pdf-lib install or unmigrated schema can only fail this one
//     request, never the server itself.
function requireSupabaseWebhookSecret(req: express.Request, res: express.Response): boolean {
  const configured = process.env.SUPABASE_WEBHOOK_SECRET;
  const provided = req.headers["x-supabase-webhook-secret"];
  if (!configured || provided !== configured) {
    res.status(401).json({ error: "Unauthorized." });
    return false;
  }
  return true;
}

// Supabase Database Webhooks POST a fixed payload shape — not something we
// control the field names of, so this schema matches Supabase's own format
// (https://supabase.com/docs/guides/database/webhooks) rather than our
// usual { refId } convention.
const supabaseActivityWebhookSchema = z.object({
  type: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  record: z
    .object({
      ref_id: z.string().min(1),
      payment_status: z.string(),
    })
    .passthrough(),
  old_record: z
    .object({
      payment_status: z.string().optional(),
    })
    .passthrough()
    .nullable()
    .optional(),
});

app.post(
  "/api/webhooks/supabase/activities-updated",
  validateBody(supabaseActivityWebhookSchema),
  async (req, res) => {
    if (!requireSupabaseWebhookSecret(req, res)) return;

    const { table, record, old_record } = req.body;
    if (table !== "activities") {
      res.json({ ok: true, skipped: "not the activities table" });
      return;
    }
    if (record.payment_status !== "confirmed") {
      res.json({ ok: true, skipped: "payment_status is not confirmed" });
      return;
    }
    if (old_record?.payment_status === "confirmed") {
      // Already was confirmed before this update — this webhook fired for
      // an unrelated column change on an already-processed booking. No need
      // to even call the pipeline (idempotency would no-op it anyway, but
      // skipping here avoids the extra DB round-trip on every such edit).
      res.json({ ok: true, skipped: "payment_status was already confirmed" });
      return;
    }

    const refId = record.ref_id;
    try {
      const { generateBookingConfirmationPdf } = await import("./certificateService");
      const result = await generateBookingConfirmationPdf(refId);
      appendAuditLog("auto_invoice_generated_via_webhook", { refId, status: result.status, emailStatus: result.emailStatus });
      res.json({ ok: true, ...result });
    } catch (err: any) {
      const code = err?.code || "error";
      appendAuditLog("auto_invoice_generation_failed_via_webhook", { refId, code, message: err?.message });
      // 200 even on a business-logic rejection (e.g. payment_not_confirmed,
      // which shouldn't happen given the check above, but re-verified
      // server-side same as always) so Supabase doesn't endlessly retry a
      // request that will never succeed. Only a genuine server error (500)
      // should make Supabase retry.
      res.status(code === "payment_not_confirmed" ? 200 : 500).json({
        error: err?.message || "Automatic invoice generation failed.",
        code,
      });
    }
  }
);

// 3. Clean URLs for Privacy Policy / Legal Center and related static
// legal/info pages (Terms, Refund Policy, Shipping Policy, Disclaimer,
// Community Guidelines, Cookie Policy, About, Contact, Account Deletion).
//
// Unlike /puja, /seva, /bazaar, /darshan (see note below), none of these
// slugs collide with a client-side SPA route, so there is no naming
// collision risk here. We deliberately add ONLY these explicit routes
// rather than a blanket express.static `extensions` option, which would
// reintroduce the /seva-style collisions described below.
const STATIC_LEGAL_PAGES = [
  "privacy-policy",
  "terms-and-conditions",
  "refund-policy",
  "shipping-policy",
  "disclaimer",
  "community-guidelines",
  "cookies",
  "about",
  "contact",
  "account-deletion",
];

for (const slug of STATIC_LEGAL_PAGES) {
  // Clean URL — serves the static HTML file with no .html in the address bar.
  app.get(`/${slug}`, (req, res) => {
    const filePath =
      process.env.NODE_ENV === "production"
        ? path.join(process.cwd(), "dist", `${slug}.html`)
        : path.join(process.cwd(), "public", `${slug}.html`);
    res.sendFile(filePath);
  });

  // Permanently redirect the old .html URL to the new clean URL so any
  // existing links/bookmarks/search-engine index entries consolidate onto
  // one URL.
  app.get(`/${slug}.html`, (req, res) => {
    res.redirect(301, `/${slug}`);
  });
}

// 4. Branded short link: sridwar.com/app -> Play Store listing.
//
// A 302 (temporary) redirect is used deliberately instead of 301: the
// destination is a marketing link that may later gain campaign params
// (referrer tags) or point at a landing page first. 301 would let browsers
// and crawlers cache the redirect permanently, making that change harder
// to roll out. Update PLAY_STORE_URL below if the package ID ever changes.
const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.shradhalu.sridwar";

app.get("/app", (req, res) => {
  res.redirect(302, PLAY_STORE_URL);
});

// 5. Mount Vite middleware in development, serve static client in production
//
// NOTE on routing design (intentional, do not "fix" with express.static's
// `extensions` option): /puja, /seva, /bazaar, /darshan are CLIENT-SIDE
// routes — they must fall through to index.html so the SPA (App.tsx
// PATH_TO_PAGE) renders the interactive booking section. puja.html,
// seva.html, bazaar.html, darshan.html are SEPARATE, static, crawler/social
// -facing landing pages, only ever reached via their literal .html URL
// (sitemap.xml, shared links). Adding an `.html` extension fallback here
// would make /seva silently resolve to the static seva.html marketing page
// instead of the interactive app — that was tried and reverted.
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode, mounting Vite...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode, serving static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sri Dwar server running on http://localhost:${PORT}`);
  });
}

startServer();
