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

// ─── Shared ref-suffix generator (server side) ─────────────────────────────
// Mirrors src/utils/googleFormSync.ts's randomRefSuffix() on the frontend —
// same alphabet (uppercase letters + digits, with 0/O/1/I/L removed so a
// devotee reading a ref off a screen can't misread it), same length. Kept
// as a small local copy rather than importing googleFormSync.ts directly:
// that module is written for the browser (fetch with mode: "no-cors" against
// a Google Forms endpoint) and isn't meant to run in this Node/Express
// process. This keeps every ref ID generated anywhere in the app — client
// or server — on one consistent, unambiguous format.
const REF_SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomRefSuffix(length: number = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REF_SUFFIX_ALPHABET[Math.floor(Math.random() * REF_SUFFIX_ALPHABET.length)];
  }
  return out;
}

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

  const refId = `SD-${randomRefSuffix()}`;

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

// 2e. Inquiry-acknowledgement email banner — composites the devotee's
// first name, Reference ID, and form-type label onto the static
// Email_Design_Templete.jpg artwork, server-side, before the email is sent.
//
// WHY THIS EXISTS: the previous email design (google_appscripts/
// EmailTemplates.gs) tried to draw "SRI DWAR" / the greeting / the
// Reference+Submitted-As values as HTML text absolutely-positioned on top
// of several cropped background images. That technique is not reliably
// supported by Gmail (or Outlook) — hence the garbled/overlapping header
// text and solid-colour blank emails devotees were seeing. Baking the
// dynamic fields directly into the JPEG pixels here removes that entire
// class of bug: the email just embeds one finished picture, no CSS
// positioning involved at send time.
//
// NAME PLACEMENT — measured directly against the artwork: after "Jai
// Jagannath," (ends ~x=568) there is only clear wood until the folded-hands
// emoji begins (~x=628) before the Shiva illustration. NAME_MAX_WIDTH_PX
// below is deliberately kept inside that gap with a small safety margin —
// the devotee's first name (only) is shrunk to fit inside it and, if it
// still can't fit at the minimum readable size, truncated with an ellipsis.
// It must never be widened without re-measuring the artwork, or the name
// will start crossing into the folded-hands icon again.
//
// ✅ ROOT-CAUSE FIX (2026-08-29): every coordinate below is calibrated
// against RENDER_FONT_FAMILY via renderTextLayerPng() (resvg-js), not
// against a different tool. An earlier version of this file mixed two
// different measurement methods — some coordinates were checked with
// Python PIL (where a text draw's y is the TOP of the glyph box) and then
// pasted as-is into this file's SVG <text y="..."> markup (where y means
// the BASELINE) without correcting for that difference. Same nominal
// number, two different meanings — that's what made devotee names and
// values render visibly high/"floating" above their intended lines
// (reported directly against a live email). Every number below has now
// been re-measured end-to-end through the exact renderer that generates
// production images.

// ─── Deterministic text rendering ───────────────────────────────────────
// ✅ ROOT-CAUSE FIX (2026-08-29): this used to render text with sharp's
// built-in SVG support, using `font-family: "Georgia, 'Times New Roman',
// serif"`. Neither Georgia nor Times New Roman exist on Linux — sharp's
// SVG renderer silently substitutes whatever the HOST SYSTEM's fontconfig
// resolves generic "serif" to, which is NOT guaranteed to be the same font
// on every machine (verified directly: this sandbox resolves it to "DejaVu
// Serif", but a different/slimmer server image can resolve to a font with
// different baseline metrics, or none at all). That made rendered text
// position depend on which server happened to run the request — the exact
// kind of bug that "worked when I tested it" and then didn't in production.
//
// Fixed by rendering text with resvg-js instead, with `loadSystemFonts:
// false` and one explicit, bundled font file
// (public/fonts/DejaVuSerif-Bold.ttf, shipped as a real project asset —
// see RENDER_FONT_PATH below). This makes text rendering 100% deterministic
// regardless of host OS or installed fonts: the exact same font file is
// used whether this runs on a laptop, a Docker image, or Render — nothing
// left to "whatever's installed." sharp is still used for everything it's
// actually good at (loading the base JPG, compositing, JPEG encoding) —
// only the text layer itself now comes from resvg-js.
const RENDER_FONT_FAMILY = "DejaVu Serif";
// ✅ FIX: every other file-lookup in this file (images, static pages) already
// branches on NODE_ENV to read from "dist" in production, since production
// only ships the built dist/ output — "public" (the source folder) does not
// exist there. This constant was the one place that never got that same
// treatment: it always pointed at "public/fonts/...", which does not exist
// in production, so resvg-js's Resvg constructor threw on every single call
// in production. That took down EVERY image-banner endpoint that renders
// text (inquiry-banner, temple-visit/service/transaction certificates) with
// a 500 — confirmed directly against Email_Errors log entries showing
// "HTTP 500 from .../api/email/inquiry-banner" for exactly this reason.
// Vite's build already copies public/fonts/* into dist/fonts/* automatically
// (default Vite behavior for the publicDir), so this file exists at the
// "dist" path in production with no other change needed.
const RENDER_FONT_PATH = path.join(
  process.cwd(),
  process.env.NODE_ENV === "production" ? "dist" : "public",
  "fonts",
  "DejaVuSerif-Bold.ttf"
);

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** First whitespace-delimited token of a full name — "Leo Fernandes" -> "Leo". Falls back to "Devotee". */
function firstNameOnly(fullName: string): string {
  const trimmed = (fullName || "").trim();
  if (!trimmed) return "Devotee";
  return trimmed.split(/\s+/)[0];
}

// Rough average glyph-width heuristic for a bold serif face at a given
// size — there's no headless font-metrics library in this project, so
// this is a deliberately conservative estimate (slightly over-wide),
// good enough for shrink-to-fit against this one fixed-layout artwork.
const AVG_BOLD_SERIF_CHAR_WIDTH_RATIO = 0.56;

function fitFontSizeToWidth(text: string, maxWidth: number, startSize: number, minSize: number): number {
  let size = startSize;
  while (size > minSize && text.length * size * AVG_BOLD_SERIF_CHAR_WIDTH_RATIO > maxWidth) {
    size -= 1;
  }
  return size;
}

function truncateToWidth(text: string, maxWidth: number, size: number): string {
  const maxChars = Math.max(3, Math.floor(maxWidth / (size * AVG_BOLD_SERIF_CHAR_WIDTH_RATIO)));
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "…";
}

/**
 * Builds one <text> element pre-shrunk (and, only if still necessary at the
 * floor size, truncated) to physically fit inside maxWidth — used for the
 * name slot so it can NEVER visually cross into the folded-hands icon,
 * regardless of how long a devotee's first name is.
 *
 * ✅ FIX (centered-anchor rendering): anchor now also accepts "middle". When
 * "middle" is used we ALSO set dominant-baseline="central" — not just
 * text-anchor="middle" — because every measured slot below (x, y) is the
 * true geometric CENTER of that field's blank artwork area (verified by
 * cropping the real JPGs and checking pixel bounds of the printed labels
 * around each blank), not an SVG baseline point. Without
 * dominant-baseline="central", resvg would still plant the text's baseline
 * at y, which visually sits the glyph body well ABOVE the intended center
 * (a bold 30px serif face has ~21px of cap-height above its baseline) —
 * this was the root cause of "not centered on the actual artwork slot,"
 * not just a bad x/y guess. "start"/"end" anchors (used only by slots that
 * have not been re-measured against a true center yet) keep the original
 * baseline behavior unchanged, so this is additive and does not shift any
 * text that already renders correctly.
 */
function fittedTextElement(
  rawText: string,
  x: number,
  y: number,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  color: string,
  anchor: "start" | "middle" | "end" = "start"
): string {
  const size = fitFontSizeToWidth(rawText, maxWidth, maxSize, minSize);
  const text = escapeSvgText(truncateToWidth(rawText, maxWidth, size));
  const anchorAttr = anchor === "end" ? ` text-anchor="end"` : anchor === "middle" ? ` text-anchor="middle" dominant-baseline="central"` : "";
  return `<text x="${x}" y="${y}" font-family="${RENDER_FONT_FAMILY}" font-weight="700" font-size="${size}" fill="${color}"${anchorAttr}>${text}</text>`;
}

/**
 * Renders a set of SVG <text> elements to a transparent PNG using resvg-js
 * with ONE explicit, bundled font file and system font loading fully
 * disabled — see the fix note above RENDER_FONT_FAMILY for why. Dynamically
 * imported, exactly like sharp/pdf-lib elsewhere in this file, so a
 * missing/broken install can only ever fail a render request, never server
 * startup.
 */
async function renderTextLayerPng(width: number, height: number, textElements: string): Promise<Buffer> {
  const { Resvg } = await import("@resvg/resvg-js");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${textElements}</svg>`;
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [RENDER_FONT_PATH],
      loadSystemFonts: false,
      defaultFontFamily: RENDER_FONT_FAMILY,
    },
    background: "rgba(0,0,0,0)",
  });
  return resvg.render().asPng();
}

// ✅ REMOVED (2026-08-29 — explicitly requested architecture reversal):
// composeCertificatePdf() used to embed a certificate JPEG inside a PDF
// (image on top, plain-text footer below). Certificate downloads must
// always be a standalone image and PDFs must never have one embedded
// inside them, so this helper — and every route that called it — is gone.
// The separate, plain-text "Download Confirmation" PDF (generated
// client-side by downloadConfirmationMessage() in
// utils/devotionalMessages.ts, and server-side by certificateService.ts's
// own admin/webhook-triggered pipeline) was never built this way and is
// unaffected by this removal.

// ✅ UPDATED (2026-08-29 — new artwork replaces Email_Design_Templete.jpg):
// email_template.jpg has a different layout — a boxed "REFERENCE :" /
// "DEVOTEE :" field pair instead of the old inline "Jai Jagannath, {name}"
// + separate "Submitted As" line. There is no blank space near "Jai
// Jagannath" in this design at all (that line is now fully static text),
// so the devotee's name goes in the DEVOTEE field instead — with much
// more room than the old cramped slot had, the FULL name is used here now,
// not just the first name (that constraint existed specifically because of
// the old design's tight space, which no longer applies). "Submitted As"
// has no field in this artwork any more; callers now show that as plain
// text below the image instead (see buildAcknowledgementEmail_ etc. in
// EmailTemplates.gs) — this function's `label` parameter is kept only so
// existing call sites don't need to change their own signatures, but it is
// no longer baked into the image itself.
// ✅ FIX (2026-08-30 — true centered-anchor rendering, re-measured against
// the real email_template.jpg pixels): the value for each field sits to
// the right of its colon, inside a boxed row that runs from just past the
// colon (x≈550) to the box's own inner right edge (x≈905) — true center
// x≈727, not x:520 (which sat almost exactly ON the colon, too tight for
// anchor="start" text to breathe). Now centered with anchor="middle".
const EMAIL_TEMPLATE_REFERENCE_SLOT = { x: 727, y: 515, maxWidth: 340, maxSize: 22, minSize: 13 };
const EMAIL_TEMPLATE_DEVOTEE_SLOT = { x: 727, y: 572, maxWidth: 340, maxSize: 22, minSize: 13 };
const EMAIL_TEMPLATE_FIELD_COLOR = "#2b1806";

async function renderInquiryBannerJpeg(name: string, refId: string, _label: string): Promise<Buffer> {
  // Dynamically imported, exactly like pdf-lib/certificateService.ts
  // elsewhere in this file — a missing/broken sharp install can only ever
  // fail this one route, never server startup or any other request.
  const sharp = (await import("sharp")).default;

  const imagePath = path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "images",
    "email_template.jpg"
  );

  const base = sharp(imagePath);
  const meta = await base.metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1536;

  const refEl = fittedTextElement(
    refId, EMAIL_TEMPLATE_REFERENCE_SLOT.x, EMAIL_TEMPLATE_REFERENCE_SLOT.y, EMAIL_TEMPLATE_REFERENCE_SLOT.maxWidth,
    EMAIL_TEMPLATE_REFERENCE_SLOT.maxSize, EMAIL_TEMPLATE_REFERENCE_SLOT.minSize, EMAIL_TEMPLATE_FIELD_COLOR, "middle"
  );
  const devoteeEl = fittedTextElement(
    (name || "").trim() || "Devotee", EMAIL_TEMPLATE_DEVOTEE_SLOT.x, EMAIL_TEMPLATE_DEVOTEE_SLOT.y, EMAIL_TEMPLATE_DEVOTEE_SLOT.maxWidth,
    EMAIL_TEMPLATE_DEVOTEE_SLOT.maxSize, EMAIL_TEMPLATE_DEVOTEE_SLOT.minSize, EMAIL_TEMPLATE_FIELD_COLOR, "middle"
  );

  const textLayer = await renderTextLayerPng(width, height, `${refEl}${devoteeEl}`);

  return base.composite([{ input: textLayer }]).jpeg({ quality: 88 }).toBuffer();
}

app.get("/api/email/inquiry-banner", async (req, res) => {
  const name = String(req.query.name || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40);
  const refId = String(req.query.ref || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40);
  const label = String(req.query.label || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 60);

  if (!refId || !label) {
    res.status(400).json({ error: "Both 'ref' and 'label' query parameters are required." });
    return;
  }

  try {
    const jpegBuffer = await renderInquiryBannerJpeg(name, refId, label);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "public, max-age=300");
    res.send(jpegBuffer);
  } catch (err: any) {
    appendAuditLog("inquiry_banner_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(500).json({ error: "Could not render the acknowledgement banner image." });
  }
});

// 2f. Temple Visit Certificate — composites the devotee's name, the temple
// they visited, and the date of issue onto the real Temple_Visit_Certificate.jpg
// artwork, server-side, on request.
//
// Coordinates below were measured directly against the artwork (not
// guessed): name and temple each sit on their own blank line under "This
// is to certify that" / "was performed with devotion on", and the date
// sits on the short blank line under "DATE OF ISSUE" in the bottom strip.
// Each is shrink-to-fit + truncated with the same helpers the inquiry
// banner above uses, so a long temple name can never run into the deity
// artwork on either side. Measured through the same resvg-js pipeline as
// the inquiry banner above (see the fix note there) — these three were
// already correct even before that fix, re-confirmed unchanged afterward.
//
// SECURITY: this never trusts client-supplied name/temple/date — it looks
// the devotee's own submitted data up server-side from form_submissions by
// ref_id (service-role key), exactly like certificateService.ts already
// does for the payment/certificate pipeline. The URL only ever contains a
// ref_id, the same "know the link" access level every other ref_id in this
// app already carries (WhatsApp alerts, email subject lines, etc.) — there
// is no separate secret because no separate secret is needed for a
// devotional record of a temple visit.
// ✅ UPDATED (2026-08-29 — new artwork replaces Temple_Visit_Certificate.jpg):
// darshan_certificate.jpg — re-measured fresh against the new artwork
// (name and temple sit stacked in one shared blank area below "This is to
// certify that", date sits below "DATE OF ISSUE" in the bottom strip; all
// three rendered and visually verified, not assumed carried over from the
// old file's coordinates, which do not apply to a different design).
// ✅ FIX (2026-08-30 — true centered-anchor rendering, re-measured against
// the real darshan_certificate.jpg pixels, not guessed): the previous
// x:530 for name/temple was NOT the center of the blank writable area
// under "This is to certify that" — measuring the actual glyph bounds of
// that static line (and both lines of "Has humbly visited...") puts the
// true horizontal center at x≈767, consistently, across all three
// reference lines. x:95 for the date was worse: it sits to the LEFT of
// the "DATE OF ISSUE" label itself (label spans x≈150–360), which is
// inside the left rope border on this artwork. True center of that
// column is x≈235. All three now use anchor="middle" with these measured
// centers; maxWidth is the full centered-text budget (safe distance to
// the deity/Shiva artwork on either side), not a left-start width.
const TEMPLE_CERT_NAME_SLOT = { x: 767, y: 392, maxWidth: 560, maxSize: 30, minSize: 16 };
const TEMPLE_CERT_TEMPLE_SLOT = { x: 767, y: 452, maxWidth: 560, maxSize: 26, minSize: 14 };
const TEMPLE_CERT_DATE_SLOT = { x: 235, y: 892, maxWidth: 230, maxSize: 15, minSize: 10 };
const TEMPLE_CERT_FIELD_COLOR = "#2b1806";

async function renderTempleVisitCertificateJpeg(name: string, temple: string, dateOfIssue: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  const imagePath = path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "images",
    "darshan_certificate.jpg"
  );

  const base = sharp(imagePath);
  const meta = await base.metadata();
  const width = meta.width || 1536;
  const height = meta.height || 1024;

  const nameEl = fittedTextElement(
    name, TEMPLE_CERT_NAME_SLOT.x, TEMPLE_CERT_NAME_SLOT.y, TEMPLE_CERT_NAME_SLOT.maxWidth,
    TEMPLE_CERT_NAME_SLOT.maxSize, TEMPLE_CERT_NAME_SLOT.minSize, TEMPLE_CERT_FIELD_COLOR, "middle"
  );
  const templeEl = fittedTextElement(
    temple, TEMPLE_CERT_TEMPLE_SLOT.x, TEMPLE_CERT_TEMPLE_SLOT.y, TEMPLE_CERT_TEMPLE_SLOT.maxWidth,
    TEMPLE_CERT_TEMPLE_SLOT.maxSize, TEMPLE_CERT_TEMPLE_SLOT.minSize, TEMPLE_CERT_FIELD_COLOR, "middle"
  );
  const dateEl = fittedTextElement(
    dateOfIssue, TEMPLE_CERT_DATE_SLOT.x, TEMPLE_CERT_DATE_SLOT.y, TEMPLE_CERT_DATE_SLOT.maxWidth,
    TEMPLE_CERT_DATE_SLOT.maxSize, TEMPLE_CERT_DATE_SLOT.minSize, TEMPLE_CERT_FIELD_COLOR, "middle"
  );

  const textLayer = await renderTextLayerPng(width, height, `${nameEl}${templeEl}${dateEl}`);

  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Shared lookup + render for Temple Visit / Darshan Certificate — used by
 * both the JPG route and the new PDF route below, so both are always built
 * from the exact same devotee data and never drift apart.
 */
async function loadAndRenderTempleVisitJpeg(refId: string): Promise<Buffer> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase is not configured on the server.");

  const { data, error } = await supabaseAdmin
    .from("form_submissions")
    .select("name, payload, created_at")
    .eq("form_type", "darshan_certificate")
    .eq("ref_id", refId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");

  const row = data as { name: string | null; payload: Record<string, unknown> | null; created_at: string | null };
  const devoteeName = (row.name || "").trim() || "Devotee";
  const temple = ((row.payload?.["temple"] as string) || "").trim() || "the temple";
  const dateOfIssue = new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return renderTempleVisitCertificateJpeg(devoteeName, temple, dateOfIssue);
}

app.get("/api/certificates/temple-visit/:refId", async (req, res) => {
  const refId = String(req.params.refId || "").trim().slice(0, 60);
  if (!refId) {
    res.status(400).json({ error: "A reference ID is required." });
    return;
  }
  try {
    const jpegBuffer = await loadAndRenderTempleVisitJpeg(refId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    res.set("Content-Disposition", `inline; filename="Sri-Dwar-Temple-Visit-Certificate-${refId}.jpg"`);
    res.send(jpegBuffer);
  } catch (err: any) {
    const notFound = err?.message === "not_found";
    appendAuditLog("temple_visit_certificate_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No Temple Visit Certificate request found for this reference." : "Could not generate the certificate right now. Please try again shortly." });
  }
});

// ✅ REMOVED (2026-08-29 — explicitly requested architecture reversal):
// this used to be a PDF route ("/api/certificates/temple-visit/:refId/pdf")
// that embedded darshan_certificate.jpg inside a PDF via
// composeCertificatePdf(). Certificate downloads must always be a
// standalone image, never embedded inside a PDF — the JPG route above is
// the only Temple Visit / Darshan Certificate download now. The separate,
// plain-text "Download Confirmation" PDF for this flow already exists
// client-side (utils/devotionalMessages.ts's downloadConfirmationMessage())
// and was never touched by this change.

// 2g. Service Certificate — composites the devotee's name, the puja/seva/
// service, and the performed date onto the correct certificate artwork —
// puja_certificate.jpg for puja bookings, seva_certificate.jpg for seva
// bookings (two separate designs now; the old shared Service_Certificate.jpg
// no longer exists). Selected by activities.activity_type.
//
// Per spec: this certificate is NOT available until Sri Dwar's team has
// actually confirmed the service was performed — payment alone is never
// enough (mirrors the same principle certificateService.ts already
// enforces for its own certificate pipeline: payment success is proof of
// money received, never proof of service performed). This endpoint
// enforces that itself: it refuses to render — 403, not a blank/placeholder
// image — until activities.completion_status = 'completed'. Even someone
// who already knows the URL gets nothing until then.
//
// ✅ UPDATED (2026-08-29 — new artwork): puja_certificate.jpg shares the
// exact same layout/coordinates as darshan_certificate.jpg (verified by
// direct visual comparison, not assumed) — name and service stacked below
// "This is to certify that", date below "DATE OF ISSUE". seva_certificate.jpg
// is a different, smaller image with no date field printed on it at all —
// only name + service are baked in; the performed date is not lost, it just
// moves to plain text in the email/PDF footer instead, same "only what's
// actually on the artwork goes in the image" principle used everywhere else.
// ✅ FIX (2026-08-30 — true centered-anchor rendering, re-measured against
// the real puja_certificate.jpg pixels): this artwork is pixel-identical in
// layout to darshan_certificate.jpg (same "This is to certify that"
// position, same blank writable band, same bottom strip) — measured
// independently and confirmed the same true center, x≈767 / date column
// x≈235. The old x:530 / x:95 left-start values are replaced with these
// measured centers, using anchor="middle".
const PUJA_CERT_NAME_SLOT = { x: 767, y: 392, maxWidth: 560, maxSize: 30, minSize: 16 };
const PUJA_CERT_SERVICE_SLOT = { x: 767, y: 452, maxWidth: 560, maxSize: 26, minSize: 14 };
const PUJA_CERT_DATE_SLOT = { x: 235, y: 892, maxWidth: 230, maxSize: 15, minSize: 10 };
// seva_certificate.jpg is a different canvas (1492x1054, not 1536x1024) with
// its own blank-area geometry — measured separately. True center x≈745;
// blank band runs y≈384–584, so name/service are centered at y=445/515
// (evenly split, matching the balance of the fixed body-copy lines below).
const SEVA_CERT_NAME_SLOT = { x: 745, y: 445, maxWidth: 520, maxSize: 28, minSize: 15 };
const SEVA_CERT_SERVICE_SLOT = { x: 745, y: 515, maxWidth: 520, maxSize: 24, minSize: 13 };
const SERVICE_CERT_FIELD_COLOR = "#2b1806";

// ✅ ADDED (2026-08-30 — new artwork for Bazaar/Guidance acknowledgements):
// baazar_certificate.jpg and Guidance_Certificate.jpg share the exact same
// layout as puja_certificate.jpg (name below "This is to certify that";
// date + reference in the bottom strip) but with generic fixed body text
// ("has received these sacred traditional offerings...",  "has expressed
// sincere interest in receiving guidance...") — there's no separate
// service-name field printed on either design, so only name/date/reference
// are composited. Coordinates were test-rendered against the actual
// artwork and visually verified (crosshair overlay, checked for caption
// overlap) before being written here, not assumed from the puja layout.
// ✅ FIX (2026-08-30 — true centered-anchor rendering, re-measured against
// the real baazar_certificate.jpg pixels): true center of the name band is
// x≈768 (not 530). The bottom strip's DATE OF ISSUE / REFERENCE /
// VERIFICATION CODE columns were measured from the actual label glyph
// bounds: DATE column center x≈228, REFERENCE column center x≈564, both on
// the shared blank-value row at y≈937 (not y:915, which sat inside the
// label text itself rather than the blank space below it).
const BAZAAR_CERT_NAME_SLOT = { x: 768, y: 419, maxWidth: 560, maxSize: 30, minSize: 16 };
const BAZAAR_CERT_DATE_SLOT = { x: 228, y: 937, maxWidth: 210, maxSize: 15, minSize: 10 };
const BAZAAR_CERT_REF_SLOT = { x: 564, y: 937, maxWidth: 330, maxSize: 15, minSize: 10 };
// Guidance_Certificate.jpg was independently re-measured (not merely
// assumed to match Bazaar) and confirmed to share the exact same slot
// geometry, so reusing the Bazaar constants remains correct.
const GUIDANCE_CERT_NAME_SLOT = BAZAAR_CERT_NAME_SLOT;
const GUIDANCE_CERT_DATE_SLOT = BAZAAR_CERT_DATE_SLOT;
const GUIDANCE_CERT_REF_SLOT = BAZAAR_CERT_REF_SLOT;

// ✅ ADDED (Wellness/Yoga certificate fix): Holistic Wellness & Yogic
// Sciences enrollments were being recorded with the exact same activityType
// ("other") as Counselling & Guidance bookings, so this endpoint had no way
// to tell them apart and always rendered Guidance_Certificate.jpg for both
// — wellness_yoga.jpg (dedicated Wellness artwork) was never referenced
// anywhere. Wellness now has its own activityType ("wellness" — see
// lib/activities.ts + BookNowWizard.tsx), so it gets its own branch and its
// own artwork here.
//
// ✅ FIX (2026-08-30 — re-measured against the real wellness_yoga.jpg
// pixels): the previous comment here claimed this artwork's layout and
// coordinates had been "pixel-inspected" and was fundamentally different
// from puja/bazaar/guidance. Re-measuring from scratch shows that claim
// was wrong on every count: the "This is to certify that" line actually
// centers at x≈770 (same family as every other certificate, not x:610),
// the blank name band is y≈348–492 (center y≈420, not y:430 — close by
// coincidence, not because it was actually measured that way), and the
// bottom strip is IDENTICAL to darshan/puja's — a plain "DATE OF ISSUE"
// label with blank space below it (center x≈241, y≈902) and a
// "REFERENCE / NUMBER" label sitting directly above a decorative,
// non-functional barcode GRAPHIC — there is no blank space for legible
// reference text there at all (the old x:390,y:965 slot printed straight
// on top of the barcode art). Reference text is therefore dropped here,
// exactly as it already correctly is for darshan/puja, instead of forcing
// it into a slot that doesn't exist on the artwork.
const WELLNESS_CERT_NAME_SLOT = { x: 770, y: 420, maxWidth: 560, maxSize: 30, minSize: 16 };
const WELLNESS_CERT_DATE_SLOT = { x: 241, y: 902, maxWidth: 210, maxSize: 15, minSize: 10 };

async function renderServiceCertificateJpeg(
  name: string,
  serviceName: string,
  performedDate: string,
  activityType: string,
  refId: string
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const isSeva = activityType === "seva";
  const isBazaar = activityType === "product";
  const isGuidance = activityType === "other";
  const isWellness = activityType === "wellness";
  const imageFile = isBazaar ? "baazar_certificate.jpg" : isWellness ? "wellness_yoga.jpg" : isGuidance ? "Guidance_Certificate.jpg" : isSeva ? "seva_certificate.jpg" : "puja_certificate.jpg";
  const imagePath = path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "images",
    imageFile
  );
  const base = sharp(imagePath);
  const meta = await base.metadata();
  const width = meta.width || (isSeva ? 1492 : 1536);
  const height = meta.height || (isSeva ? 1054 : 1024);

  // Bazaar/Guidance/Wellness artwork has no service-name field baked in
  // (the body text is fixed/generic on all three designs) — just name +
  // date (+ reference, where the artwork actually has room for it — see
  // WELLNESS_CERT_NAME_SLOT comment above for why Wellness has none), in
  // the bottom strip rather than stacked under the name.
  if (isBazaar || isGuidance || isWellness) {
    const nameSlot = isBazaar ? BAZAAR_CERT_NAME_SLOT : isWellness ? WELLNESS_CERT_NAME_SLOT : GUIDANCE_CERT_NAME_SLOT;
    const dateSlot = isBazaar ? BAZAAR_CERT_DATE_SLOT : isWellness ? WELLNESS_CERT_DATE_SLOT : GUIDANCE_CERT_DATE_SLOT;
    const nameEl = fittedTextElement(name, nameSlot.x, nameSlot.y, nameSlot.maxWidth, nameSlot.maxSize, nameSlot.minSize, SERVICE_CERT_FIELD_COLOR, "middle");
    const dateEl = fittedTextElement(performedDate, dateSlot.x, dateSlot.y, dateSlot.maxWidth, dateSlot.maxSize, dateSlot.minSize, SERVICE_CERT_FIELD_COLOR, "middle");
    // Wellness has no printed reference slot on the artwork (see comment
    // above WELLNESS_CERT_NAME_SLOT) — only Bazaar and Guidance render one.
    const refEl = isWellness ? "" : fittedTextElement(
      refId, BAZAAR_CERT_REF_SLOT.x, BAZAAR_CERT_REF_SLOT.y, BAZAAR_CERT_REF_SLOT.maxWidth,
      BAZAAR_CERT_REF_SLOT.maxSize, BAZAAR_CERT_REF_SLOT.minSize, SERVICE_CERT_FIELD_COLOR, "middle"
    );
    const textLayer = await renderTextLayerPng(width, height, `${nameEl}${dateEl}${refEl}`);
    return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
  }

  const nameSlot = isSeva ? SEVA_CERT_NAME_SLOT : PUJA_CERT_NAME_SLOT;
  const serviceSlot = isSeva ? SEVA_CERT_SERVICE_SLOT : PUJA_CERT_SERVICE_SLOT;

  const nameEl = fittedTextElement(
    name, nameSlot.x, nameSlot.y, nameSlot.maxWidth, nameSlot.maxSize, nameSlot.minSize, SERVICE_CERT_FIELD_COLOR, "middle"
  );
  const serviceEl = fittedTextElement(
    serviceName, serviceSlot.x, serviceSlot.y, serviceSlot.maxWidth, serviceSlot.maxSize, serviceSlot.minSize, SERVICE_CERT_FIELD_COLOR, "middle"
  );
  // seva_certificate.jpg has no printed date field — date is simply not
  // baked in for that design, per the "only what's actually on the
  // artwork" rule.
  const dateEl = isSeva ? "" : fittedTextElement(
    performedDate, PUJA_CERT_DATE_SLOT.x, PUJA_CERT_DATE_SLOT.y, PUJA_CERT_DATE_SLOT.maxWidth,
    PUJA_CERT_DATE_SLOT.maxSize, PUJA_CERT_DATE_SLOT.minSize, SERVICE_CERT_FIELD_COLOR, "middle"
  );

  const textLayer = await renderTextLayerPng(width, height, `${nameEl}${serviceEl}${dateEl}`);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}

app.get("/api/certificates/service/:refId", async (req, res) => {
  const refId = String(req.params.refId || "").trim().slice(0, 60);
  if (!refId) {
    res.status(400).json({ error: "A reference ID is required." });
    return;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Supabase is not configured on the server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." });
    return;
  }

  try {
    const { data: activity, error: activityError } = await supabaseAdmin
      .from("activities")
      .select("item_name, created_at, user_id, activity_type, metadata")
      .eq("ref_id", refId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activityError) throw new Error(activityError.message);
    if (!activity) {
      res.status(404).json({ error: "No booking found for this reference." });
      return;
    }

    const row = activity as { item_name: string | null; created_at: string | null; user_id?: string | null; activity_type?: string | null; metadata: Record<string, unknown> | null };
    // These certificates are a devotional ACKNOWLEDGEMENT that a devotee
    // opted in for a Puja/Seva/service — like an order confirmation —
    // never proof of performance. A separate, individually personalized
    // certificate is prepared by Sri Dwar's team after the rite is
    // actually carried out and emailed directly to the devotee; it is not
    // this endpoint at all. Available the moment a booking exists.

    // ✅ FIX (2026-08-30 — re-applied: this had regressed back to the
    // form_submissions/profiles-only fallback, dropping the metadata check
    // added earlier today): see the identical fix and explanation on the
    // Transaction receipt endpoint above.
    let devoteeName: string | null =
      (typeof row.metadata?.["devoteeName"] === "string" ? (row.metadata["devoteeName"] as string).trim() : "") || null;

    if (!devoteeName) {
      const { data: submission } = await supabaseAdmin
        .from("form_submissions")
        .select("name")
        .eq("ref_id", refId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      devoteeName = (submission as { name: string | null } | null)?.name || null;
    }

    if (!devoteeName && row.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("id", row.user_id)
        .maybeSingle();
      devoteeName = (profile as { name: string | null } | null)?.name || null;
    }

    const serviceName = (row.item_name || "").trim() || "Sacred Offering";
    // Booking/opt-in date, not a performed date — this certificate is
    // issued the moment the devotee books, well before any rite happens.
    const bookingDate = new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    const jpegBuffer = await renderServiceCertificateJpeg((devoteeName || "").trim() || "Devotee", serviceName, bookingDate, row.activity_type || "puja", refId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    res.set("Content-Disposition", `inline; filename="Sri-Dwar-Service-Certificate-${refId}.jpg"`);
    res.send(jpegBuffer);
  } catch (err: any) {
    appendAuditLog("service_certificate_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(500).json({ error: "Could not generate the certificate right now. Please try again shortly." });
  }
});

// 2j. General-purpose certificate — the SAME Service_Certificate.jpg
// artwork, reused (per explicit instruction) for every record type that
// has no transaction and no Darshan Certificate of its own: devotee
// registrations, Dharmic Expert/Pandit/Guru registrations, temple
// committee registrations, testimonials, contact inquiries, refund
// requests, subscription signups — anything living in form_submissions.
//
// Field mapping for the "has received divine blessings through" line,
// exactly as specified:
//   - Dharmic Expert/Guru registration -> their field of expertise
//     (payload.category, e.g. "Pandit", "Yoga Guru")
//   - Temple committee registration -> the temple they registered
//     (payload.templeName)
//   - Everything else (devotee registration, testimonial, contact/
//     inquiry, refund request, subscription signup) -> falls back to
//     "Gotra: {gotra} — Ref {refId}" when a gotra was supplied (devotee
//     registration), otherwise just "{form label} — Ref {refId}", per the
//     instruction to fall back to gotra + the reference ID when there is
//     no service/expertise field to show.
// Unlike /api/certificates/service/:refId above, this is never gated on
// activities.completion_status — a devotee/expert/temple registration or
// an inquiry has no "performed" concept; the record existing is enough.
const GENERAL_CERT_FORM_LABELS: Record<string, string> = {
  contact_us: "Inquiry",
  testimonial: "Devotion Story Shared",
  devotee_registration: "Devotee Registration",
  expert_registration: "Dharmic Expert Registration",
  temple_committee_registration: "Temple Committee Registration",
  refund_cancellation_request: "Refund / Cancellation Request",
  subscription_signup: "Subscription Signup",
};

function resolveBlessedThroughText(formType: string, payload: Record<string, unknown> | null, refId: string): string {
  const p = payload || {};
  if (formType === "expert_registration" && p["category"]) {
    return String(p["category"]).trim();
  }
  if (formType === "temple_committee_registration" && p["templeName"]) {
    return String(p["templeName"]).trim();
  }
  const gotra = typeof p["gotra"] === "string" ? (p["gotra"] as string).trim() : "";
  if (gotra) {
    return `Gotra: ${gotra} — Ref ${refId}`;
  }
  const label = GENERAL_CERT_FORM_LABELS[formType] || "Devotee Record";
  return `${label} — Ref ${refId}`;
}

async function loadAndRenderGeneralCertificateJpeg(refId: string): Promise<Buffer> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase is not configured on the server.");

  const { data, error } = await supabaseAdmin
    .from("form_submissions")
    .select("name, form_type, payload, created_at")
    .eq("ref_id", refId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");

  const row = data as { name: string | null; form_type: string; payload: Record<string, unknown> | null; created_at: string | null };
  const devoteeName = (row.name || "").trim() || "Devotee";
  const blessedThrough = resolveBlessedThroughText(row.form_type, row.payload, refId);
  const dateOfIssue = new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // ✅ FIX (2026-08-29 — puja_certificate.jpg/seva_certificate.jpg split):
  // this general-purpose lookup (devotee/expert/temple registrations,
  // testimonials, inquiries — records with no dedicated artwork of their
  // own) uses the puja design as the general-purpose devotional fallback,
  // matching the closest available visual match now that the old single
  // shared Service_Certificate.jpg is gone.
  return renderServiceCertificateJpeg(devoteeName, blessedThrough, dateOfIssue, "puja", refId);
}

app.get("/api/certificates/general/:refId", async (req, res) => {
  const refId = String(req.params.refId || "").trim().slice(0, 60);
  if (!refId) {
    res.status(400).json({ error: "A reference ID is required." });
    return;
  }
  try {
    const jpegBuffer = await loadAndRenderGeneralCertificateJpeg(refId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    res.set("Content-Disposition", `inline; filename="Sri-Dwar-Certificate-${refId}.jpg"`);
    res.send(jpegBuffer);
  } catch (err: any) {
    const notFound = err?.message === "not_found";
    appendAuditLog("general_certificate_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No record found for this reference." : "Could not generate the certificate right now." });
  }
});

// 2h-bis. Register Temple / Contact Us / Inquiry — Immediate Acknowledgement
// Certificate — composites REFERENCE + DEVOTEE onto register_temple.jpg,
// server-side, the moment a contact_us / expert_registration /
// temple_committee_registration form_submissions row exists. This is
// deliberately a SEPARATE artwork and route from the general-purpose
// /api/certificates/general/:refId above (which renders these same three
// form types onto puja_certificate.jpg with "This is to certify that ...
// has had this sacred Puja performed" body copy — worded for an actual
// puja booking, not a plain inquiry). register_temple.jpg's fixed body
// copy ("Thank you for reaching out to Sri Dwar. Your message has been
// received with care...") is accurate for all three form types and never
// mentions payment, amount, or booking confirmation — it only
// acknowledges that the submission was received, so it cannot be misread
// as proof of a completed payment.
//
// "DEVOTEE" is used as the field label for every form type, including
// Dharmic Expert registrations, because that is the literal text baked
// into this artwork (see the artwork-preservation note above
// fittedTextElement) — it is not swapped to "NAME" or "EXPERT" per form
// type. Both Devotee and Dharmic Expert submissions render identically:
// only the person's name (form_submissions.name) and the reference ID go
// on the certificate.
//
// REFERENCE_SLOT / DEVOTEE_SLOT below were measured directly against the
// real register_temple.jpg pixels: the boxed row runs from just past the
// colon (x≈560) to the box's own inner right edge (x≈855) — true center
// x≈707 — with anchor="middle", exactly like the matching box on
// email_template.jpg above.
const REGISTER_TEMPLE_REFERENCE_SLOT = { x: 707, y: 930, maxWidth: 280, maxSize: 20, minSize: 12 };
const REGISTER_TEMPLE_DEVOTEE_SLOT = { x: 707, y: 987, maxWidth: 280, maxSize: 20, minSize: 12 };
const REGISTER_TEMPLE_FIELD_COLOR = "#2b1806";
const REGISTER_TEMPLE_FORM_TYPES = new Set(["contact_us", "expert_registration", "temple_committee_registration"]);

async function renderRegisterTempleAcknowledgementJpeg(name: string, refId: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const imagePath = path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "images",
    "register_temple.jpg"
  );
  const base = sharp(imagePath);
  const meta = await base.metadata();
  const width = meta.width || 1024;
  const height = meta.height || 1536;

  const refEl = fittedTextElement(
    refId, REGISTER_TEMPLE_REFERENCE_SLOT.x, REGISTER_TEMPLE_REFERENCE_SLOT.y, REGISTER_TEMPLE_REFERENCE_SLOT.maxWidth,
    REGISTER_TEMPLE_REFERENCE_SLOT.maxSize, REGISTER_TEMPLE_REFERENCE_SLOT.minSize, REGISTER_TEMPLE_FIELD_COLOR, "middle"
  );
  const devoteeEl = fittedTextElement(
    (name || "").trim() || "Devotee", REGISTER_TEMPLE_DEVOTEE_SLOT.x, REGISTER_TEMPLE_DEVOTEE_SLOT.y, REGISTER_TEMPLE_DEVOTEE_SLOT.maxWidth,
    REGISTER_TEMPLE_DEVOTEE_SLOT.maxSize, REGISTER_TEMPLE_DEVOTEE_SLOT.minSize, REGISTER_TEMPLE_FIELD_COLOR, "middle"
  );

  const textLayer = await renderTextLayerPng(width, height, `${refEl}${devoteeEl}`);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}

async function loadAndRenderRegisterTempleAcknowledgementJpeg(refId: string): Promise<Buffer> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase is not configured on the server.");

  const { data, error } = await supabaseAdmin
    .from("form_submissions")
    .select("name, form_type, created_at")
    .eq("ref_id", refId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");

  const row = data as { name: string | null; form_type: string; created_at: string | null };
  if (!REGISTER_TEMPLE_FORM_TYPES.has(row.form_type)) {
    // Exists, but is not a Contact Us / Dharmic Expert / Temple
    // Committee submission — the general-purpose certificate route above
    // is the correct one for that record, not this one.
    throw new Error("not_found");
  }

  const devoteeName = (row.name || "").trim() || "Devotee";
  return renderRegisterTempleAcknowledgementJpeg(devoteeName, refId);
}

app.get("/api/certificates/inquiry/:refId", async (req, res) => {
  const refId = String(req.params.refId || "").trim().slice(0, 60);
  if (!refId) {
    res.status(400).json({ error: "A reference ID is required." });
    return;
  }
  try {
    const jpegBuffer = await loadAndRenderRegisterTempleAcknowledgementJpeg(refId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    res.set("Content-Disposition", `inline; filename="Sri-Dwar-Acknowledgement-${refId}.jpg"`);
    res.send(jpegBuffer);
  } catch (err: any) {
    const notFound = err?.message === "not_found";
    appendAuditLog("inquiry_acknowledgement_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No record found for this reference." : "Could not generate the acknowledgement certificate right now." });
  }
});

// ✅ REMOVED (2026-08-29 — explicitly requested architecture reversal):
// the "/api/certificates/general/:refId/pdf" route, which embedded
// puja_certificate.jpg inside a PDF via composeCertificatePdf(), is gone —
// the JPG route above is the only download for this certificate now. See
// the identical removal note above the old temple-visit PDF route.

// 2h. Transaction Completed — composites Bill To / Invoice / Reference /
// Date / Description / Amount / Subtotal / Total Paid / Payment Method onto
// Trasancation_Completed.jpg, server-side, from the real activities row.
//
// Payment Method shows the real method once payment_status is 'confirmed';
// otherwise it shows "Payment is still pending" in an amber tone (matching
// the "Under Review" badge colour already used in the emails) instead of
// fabricating a method that hasn't actually been verified yet.
// ✅ FIX (2026-08-30 — re-measured against the real transaction_details.jpg
// pixels, field by field, rather than the previous guessed coordinates):
//
// - BILL TO / Invoice # / Reference / Date all sit on their own single
//   ruled line next to their label — measured each line's actual left/
//   right extent from the printed underline pixels, not assumed. Old
//   x:100 for Bill To was inside the LEFT BORDER of the box (label itself
//   starts at x≈150); old x:700/670 for Invoice/Reference/Date were close
//   but not measured, and all three actually share the same blank-line
//   column (x≈600–745), not three different x's.
// - Description/Amount table row 1's baseline (y:500) was already
//   essentially correct — confirmed against the real row divider lines
//   (row 1 spans y≈477–522) and left as-is.
// - TOTAL PAID: re-measuring the pill shows it is only dark-green on its
//   LEFT half (the "TOTAL PAID" label). The right half — where the value
//   actually gets printed — is the plain light wood background, same as
//   the rest of the artwork. The previous light-gold fill color would
//   have been nearly invisible there; this was a real legibility bug, not
//   a stylistic choice. Value now uses the same dark ink as every other
//   field, with x/y measured to the actual blank portion of the pill.
const TXN_BILLTO_SLOT = { x: 270, y: 300, maxWidth: 190, maxSize: 19, minSize: 10 };
const TXN_INVOICE_SLOT = { x: 615, y: 297, maxWidth: 130, maxSize: 14, minSize: 8 };
const TXN_REFERENCE_SLOT = { x: 615, y: 340, maxWidth: 130, maxSize: 14, minSize: 8 };
const TXN_DATE_SLOT = { x: 615, y: 383, maxWidth: 130, maxSize: 14, minSize: 9 };
const TXN_DESC_SLOT = { x: 140, y: 505, maxWidth: 690, maxSize: 17, minSize: 11 };
const TXN_AMOUNT_SLOT = { x: 980, y: 505, maxWidth: 250, maxSize: 17, minSize: 12 };
const TXN_PAYMENT_SLOT = { x: 470, y: 753, maxWidth: 340, maxSize: 16, minSize: 11 };
const TXN_TOTAL_SLOT = { x: 917, y: 731, maxWidth: 120, maxSize: 17, minSize: 12 };
const TXN_FIELD_COLOR = "#2b1806";
const TXN_PENDING_COLOR = "#8a5a12";

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const PAYMENT_METHOD_DISPLAY_LABELS: Record<string, string> = {
  upi: "UPI", gpay: "Google Pay (UPI)", phonepe: "PhonePe (UPI)", paytm: "Paytm (UPI)",
  "whatsapp pay": "WhatsApp Pay", bank_transfer: "Bank Transfer",
};

async function renderTransactionJpeg(fields: {
  billTo: string; invoice: string; reference: string; date: string;
  description: string; amount: number; totalPaid: number;
  paymentMethod: string; isPaid: boolean;
}): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const imagePath = path.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "images",
    "transaction_details.jpg"
  );
  const base = sharp(imagePath);
  const meta = await base.metadata();
  const width = meta.width || 1087;
  const height = meta.height || 1447;

  const els = [
    fittedTextElement(fields.billTo, TXN_BILLTO_SLOT.x, TXN_BILLTO_SLOT.y, TXN_BILLTO_SLOT.maxWidth, TXN_BILLTO_SLOT.maxSize, TXN_BILLTO_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.invoice, TXN_INVOICE_SLOT.x, TXN_INVOICE_SLOT.y, TXN_INVOICE_SLOT.maxWidth, TXN_INVOICE_SLOT.maxSize, TXN_INVOICE_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.reference, TXN_REFERENCE_SLOT.x, TXN_REFERENCE_SLOT.y, TXN_REFERENCE_SLOT.maxWidth, TXN_REFERENCE_SLOT.maxSize, TXN_REFERENCE_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.date, TXN_DATE_SLOT.x, TXN_DATE_SLOT.y, TXN_DATE_SLOT.maxWidth, TXN_DATE_SLOT.maxSize, TXN_DATE_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.description, TXN_DESC_SLOT.x, TXN_DESC_SLOT.y, TXN_DESC_SLOT.maxWidth, TXN_DESC_SLOT.maxSize, TXN_DESC_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(formatInr(fields.amount), TXN_AMOUNT_SLOT.x, TXN_AMOUNT_SLOT.y, TXN_AMOUNT_SLOT.maxWidth, TXN_AMOUNT_SLOT.maxSize, TXN_AMOUNT_SLOT.minSize, TXN_FIELD_COLOR, "end"),
    fittedTextElement(fields.paymentMethod, TXN_PAYMENT_SLOT.x, TXN_PAYMENT_SLOT.y, TXN_PAYMENT_SLOT.maxWidth, TXN_PAYMENT_SLOT.maxSize, TXN_PAYMENT_SLOT.minSize, fields.isPaid ? TXN_FIELD_COLOR : TXN_PENDING_COLOR, "middle"),
    fittedTextElement(formatInr(fields.totalPaid), TXN_TOTAL_SLOT.x, TXN_TOTAL_SLOT.y, TXN_TOTAL_SLOT.maxWidth, TXN_TOTAL_SLOT.maxSize, TXN_TOTAL_SLOT.minSize, TXN_FIELD_COLOR, "middle"),
  ].join("");

  const textLayer = await renderTextLayerPng(width, height, els);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}

/**
 * Shared lookup + render, used by both the HTTP route below (profile-page
 * download) and directly by the GAS-facing email banner route further down
 * (so an email's embedded image and a devotee's profile-page download are
 * always built from the exact same code path — never two implementations
 * that could quietly drift apart).
 */
async function loadAndRenderTransactionJpeg(refId: string): Promise<Buffer> {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured on the server.");
  }

  const { data: activity, error: activityError } = await supabaseAdmin
    .from("activities")
    .select("item_name, amount, payment_method, payment_status, created_at, user_id, metadata")
    .eq("ref_id", refId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activityError) throw new Error(activityError.message);
  if (!activity) throw new Error("not_found");

  const row = activity as {
    item_name: string | null; amount: number | null; payment_method: string | null;
    payment_status: string | null; created_at: string | null; user_id: string | null;
    metadata: Record<string, unknown> | null;
  };

  // ✅ FIX (2026-08-30 — re-applied: this had regressed back to the
  // form_submissions/profiles-only fallback, dropping the metadata check
  // added earlier today): every booking flow (BookNowWizard.tsx,
  // TemplateBazaar.tsx, App.tsx's cart checkouts) stores the devotee's
  // typed name in activities.metadata.devoteeName at the moment of
  // booking — the most trustworthy source, since it's exactly who this
  // specific booking is for (can differ from the logged-in account
  // holder). Checked first, ahead of the form_submissions/profiles
  // fallbacks below (kept for older rows recorded before that fix).
  let devoteeName: string | null =
    (typeof row.metadata?.["devoteeName"] === "string" ? (row.metadata["devoteeName"] as string).trim() : "") || null;

  if (!devoteeName) {
    const { data: submission } = await supabaseAdmin
      .from("form_submissions")
      .select("name")
      .eq("ref_id", refId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    devoteeName = (submission as { name: string | null } | null)?.name || null;
  }

  if (!devoteeName && row.user_id) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", row.user_id)
      .maybeSingle();
    devoteeName = (profile as { name: string | null } | null)?.name || null;
  }

  const isPaid = row.payment_status === "confirmed";
  const amount = typeof row.amount === "number" ? row.amount : 0;
  const methodKey = (row.payment_method || "").trim().toLowerCase();
  const paymentMethodDisplay = isPaid
    ? PAYMENT_METHOD_DISPLAY_LABELS[methodKey] || row.payment_method || "UPI"
    : "Payment is still pending";

  return renderTransactionJpeg({
    billTo: devoteeName || "Devotee",
    invoice: `INV-${refId}`,
    reference: refId,
    date: new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    description: row.item_name || "Sacred Offering",
    amount,
    totalPaid: amount,
    paymentMethod: paymentMethodDisplay,
    isPaid,
  });
}

app.get("/api/certificates/transaction/:refId", async (req, res) => {
  const refId = String(req.params.refId || "").trim().slice(0, 60);
  if (!refId) {
    res.status(400).json({ error: "A reference ID is required." });
    return;
  }
  try {
    const jpegBuffer = await loadAndRenderTransactionJpeg(refId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=120");
    res.set("Content-Disposition", `inline; filename="Sri-Dwar-Transaction-${refId}.jpg"`);
    res.send(jpegBuffer);
  } catch (err: any) {
    const notFound = err?.message === "not_found";
    appendAuditLog("transaction_receipt_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No transaction found for this reference." : "Could not generate the receipt right now." });
  }
});

// ✅ REMOVED (2026-08-29 — explicitly requested architecture reversal):
// the "/api/certificates/transaction/:refId/pdf" route, which embedded
// transaction_details.jpg inside a PDF, is gone — the JPG receipt route
// above is the only download for this now. Payment/transaction PDF
// confirmations still come from the separate, plain-text
// downloadConfirmationMessage() client-side flow, unaffected by this.

// 3. Clean URLs for Privacy Policy / Legal Center and related static
// legal/info pages (Terms, Refund Policy, Shipping Policy, Disclaimer,
// Community Guidelines, Cookie Policy, Account Deletion).
//
// NOTE: "About" and "Contact" used to be in this list too, but they are
// genuine interactive SPA pages (AboutUs.tsx / ContactUs.tsx), not
// static-only legal docs — keeping them here would have served a static
// about.html/contact.html instead of the real interactive page, the same
// class of bug described in the express.static `index: false` note below.
// They were pulled out so /about and /contact fall through to the SPA
// like every other interactive route.
//
// Unlike /puja, /seva, /bazaar, /darshan (see note below), none of the
// slugs still in this list collide with a client-side SPA route, so
// there is no naming collision risk here. We deliberately add ONLY these
// explicit routes rather than a blanket express.static `extensions`
// option, which would reintroduce the /seva-style collisions described
// below.
const STATIC_LEGAL_PAGES = [
  "privacy-policy",
  "terms-and-conditions",
  "refund-policy",
  "shipping-policy",
  "disclaimer",
  "community-guidelines",
  "cookies",
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
    // ✅ ROOT-CAUSE FIX — "/priests", "/founder-story", "/devotee-register",
    // "/about", "/contact" redirecting to the homepage: /public (and
    // therefore /dist) still contains DIRECTORY-style static SEO fallback
    // pages at these exact paths (priests/index.html, founder-story/
    // index.html, about/index.html, contact/index.html — see main.tsx's
    // routing comment). express.static defaults to serving a matching
    // directory's own index.html for a request that matches the directory
    // path — so a GET to /priests was being answered directly by
    // express.static with priests/index.html BEFORE it ever reached the
    // app.get("*") catch-all below, and that fallback page's own redirect
    // logic sent the visitor to "/". The SPA's client-side router
    // (App.tsx PATH_TO_PAGE) never got a chance to run at all for these
    // paths.
    // `index: false` disables ONLY that directory-index auto-serving
    // behaviour — a request for the bare directory path now falls through
    // to the catch-all below and gets index.html (the real SPA shell),
    // letting App.tsx's router handle these paths correctly. This does
    // NOT affect anything else express.static does: explicitly-named
    // files (puja.html, seva.html, bazaar.html, darshan.html, any asset
    // by its real filename) are still served directly and unaffected —
    // `index` only controls the directory-index fallback, nothing else.
    // The STATIC_LEGAL_PAGES routes above already use `res.sendFile`
    // directly and were never affected by this in the first place.
    //
    // ⚠️ Do not remove this again without also removing (or renaming)
    // the public/priests, public/founder-story, public/about,
    // public/contact, public/devotee-register directory fallback pages —
    // otherwise this exact bug comes straight back.
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sri Dwar server running on http://localhost:${PORT}`);
  });
}

startServer();
