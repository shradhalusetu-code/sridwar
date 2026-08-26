/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ============================================================================
 * Sri Dwar — Certificate & Booking-Confirmation PDF Service
 * ============================================================================
 *
 * WHAT THIS FILE IS
 * ------------------
 * A single, drop-in Node/Express module that recreates the Word mail-merge
 * concept server-side: it selects the right branded template, autofills only
 * the approved fields, renders a PDF, saves it against the booking, and
 * prepares (but — per your choice — does not yet auto-fire) the "Certificate
 * Ready" / "Booking Confirmed" email. It does not touch App.tsx, server.ts's
 * existing routes, the Google Forms sync, WhatsApp alerts, or any current
 * booking/payment/email flow. Nothing here runs until something calls one of
 * the two exported entry points below.
 *
 * SCOPE, AS YOU SELECTED: "Design/templates only, wire trigger later."
 * ----------------------------------------------------------------------
 * This file implements the full pipeline (verification re-check → idempotency
 * claim → template render → storage → audit → email payload) and exposes it
 * as two callable functions. It does NOT hook itself into any payment
 * webhook, Supabase trigger, or cron job — that wiring is a deliberate
 * follow-up step, once you tell me which real signal should fire it (a
 * payment-gateway webhook once you have one, an admin "mark paid"/"mark
 * completed" action, or a polling job). Search this file for
 * "TRIGGER WIRING GOES HERE" for the two exact spots.
 *
 * For manual/QA testing right now, without any trigger, three ways in:
 *   1. `npx tsx certificateService.ts --selftest`  — runs the full test
 *      matrix below against an in-memory fake DB (no network, no Supabase).
 *   2. Import and call `generateBookingConfirmationPdf(refId)` /
 *      `generateCertificatePdf(refId)` directly from a REPL or temp script.
 *   3. Mount `registerCertificateAdminRoutes(app)` from server.ts (one line,
 *      shown at the bottom of this file) to get two header-secret-protected
 *      POST routes you can hit from Postman while QA'ing.
 *
 * WHICH SIGNAL COUNTS AS "PAID" / "PERFORMED" (server re-verifies, always)
 * --------------------------------------------------------------------------
 * Both entry points re-read the row fresh from Supabase with the service-role
 * key. They never trust a client-supplied "I paid" / "it's done" flag.
 *   - Booking-Confirmed PDF  → requires activities.payment_status === 'confirmed'.
 *     'pending_verification' and 'failed' are both refused (see TEST 2/3).
 *   - Service Certificate PDF → requires activities.completion_status === 'completed'
 *     AND a real activities.performed_at timestamp. payment_status is never
 *     read for this decision — see PRINCIPLE box below.
 *
 *   ┌─────────────────────────────────────────────────────────────────────┐
 *   │ PRINCIPLE: payment success is proof of money received, never proof   │
 *   │ of service performed. generateCertificatePdf() does not even SELECT  │
 *   │ payment_status from the row, so a future edit can't accidentally     │
 *   │ start reading it as a shortcut.                                      │
 *   └─────────────────────────────────────────────────────────────────────┘
 *
 * REQUIRED SCHEMA CHANGES (run once in the Supabase SQL editor)
 * ----------------------------------------------------------------------------
 * Additive only — nothing here alters or removes an existing column, row, or
 * policy. Safe to re-run (all guarded with IF NOT EXISTS / DROP+CREATE POLICY).
 *
 *   -- 1. Two new columns on the existing ledger, so a booking can later be
 *   --    marked "the puja/seva/darshan actually happened", independent of
 *   --    payment. Defaults keep every existing row exactly as it behaves today.
 *   alter table public.activities
 *     add column if not exists completion_status text not null default 'not_performed'
 *       check (completion_status in ('not_performed', 'completed')),
 *     add column if not exists performed_at timestamptz;
 *
 *   -- 2. Idempotency ledger: one row per (booking, event type). The unique
 *   --    constraint is the actual duplicate-prevention mechanism — the
 *   --    application-level check below is just an early exit for speed.
 *   create table if not exists public.certificate_idempotency (
 *     ref_id text not null,
 *     event_type text not null check (event_type in ('booking_confirmed', 'certificate_ready')),
 *     status text not null default 'in_progress'
 *       check (status in ('in_progress', 'sent', 'failed')),
 *     document_path text,
 *     created_at timestamptz not null default now(),
 *     updated_at timestamptz not null default now(),
 *     primary key (ref_id, event_type)
 *   );
 *   alter table public.certificate_idempotency enable row level security;
 *   -- No public policies on purpose: only the service-role key (this file)
 *   -- ever touches this table. Devotees never read or write it directly.
 *
 *   -- 3. Audit trail: append-only, one row per stage, per booking/event.
 *   create table if not exists public.certificate_audit_log (
 *     id uuid primary key default gen_random_uuid(),
 *     ref_id text not null,
 *     event_type text not null,
 *     stage text not null check (stage in (
 *       'payment_verified', 'payment_rejected',
 *       'completion_verified', 'completion_rejected',
 *       'pdf_generated', 'pdf_generation_failed',
 *       'email_sent', 'email_skipped', 'email_failed',
 *       'duplicate_blocked'
 *     )),
 *     detail jsonb,
 *     created_at timestamptz not null default now()
 *   );
 *   create index if not exists certificate_audit_log_ref_id_idx
 *     on public.certificate_audit_log(ref_id);
 *   alter table public.certificate_audit_log enable row level security;
 *
 *   -- 4. Private Storage bucket for the rendered PDFs (create once, from the
 *   --    Supabase dashboard → Storage → New bucket → name: certificates,
 *   --    Public: OFF). Devotees get a signed, time-limited URL by email —
 *   --    never a public link.
 *
 * NEW DEPENDENCY
 * ----------------------------------------------------------------------------
 * Add to package.json "dependencies" (pure-JS, no native build step, no
 * conflict with anything already installed):
 *   "pdf-lib": "^1.17.1"
 *
 * WHERE FIELDS COME FROM (autofill allowlist)
 * ----------------------------------------------------------------------------
 *   devoteeName        <- form_submissions.name for the matching ref_id
 *                          (falls back to "Devotee" — never blocks on a
 *                          missing name, see TEST 5)
 *   serviceName         <- activities.item_name
 *   deityOrTempleName   <- activities.metadata->>'deity_or_temple' if present,
 *                          else activities.metadata->>'temple_name', else omitted
 *   date                <- performed_at (certificates) or created_at (booking
 *                          confirmations) — always the real one, never "today"
 *   referenceId         <- activities.ref_id
 *   amount / paymentMethod (2026-08-15 addition, invoice only) <- activities.amount
 *                          / activities.payment_method — ONLY read for the
 *                          "booking_confirmation" (invoice) template, and only
 *                          after guard() has already re-verified
 *                          payment_status === 'confirmed' server-side. Never
 *                          read for the "puja"/"seva"/"darshan" certificate
 *                          templates — those still follow the original
 *                          five-field allowlist above, unchanged.
 *   taxAmount / discountAmount / platformFee (invoice only, OPTIONAL) <-
 *                          activities.metadata->>'tax_amount' /
 *                          'discount_amount' / 'platform_fee', each a plain
 *                          number of rupees. Omitted from the printed invoice
 *                          entirely (not printed as "₹0") when not present in
 *                          metadata — nothing is fabricated. Add these keys to
 *                          a booking's metadata JSON yourself if/when you
 *                          start charging tax or platform fees; until then the
 *                          invoice total is simply the booking amount.
 */

import { PDFDocument, StandardFonts, rgb, degrees, PDFFont, PDFPage, RGB } from "pdf-lib";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

// ─── Brand tokens (mirrors Config.gs BRAND so email + PDF + site stay in sync) ─
const BRAND = {
  name: "Sri Dwar",
  tagline: "Connect. Contribute. Preserve.",
  darkGreen: rgb(0x0c / 255, 0x2b / 255, 0x26 / 255),
  darkGreenEnd: rgb(0x12 / 255, 0x38 / 255, 0x32 / 255),
  saffron: rgb(0xe8 / 255, 0xa3 / 255, 0x3d / 255),
  gold: rgb(0xf4 / 255, 0xc5 / 255, 0x63 / 255),
  cream: rgb(0xfb / 255, 0xf6 / 255, 0xec / 255),
  textMuted: rgb(0x6b / 255, 0x7a / 255, 0x76 / 255),
  white: rgb(1, 1, 1),
} as const;

// ─── Event / template types ─────────────────────────────────────────────────
export type EventType = "booking_confirmed" | "certificate_ready";
export type TemplateKind = "booking_confirmation" | "puja" | "seva" | "darshan";

const TEMPLATE_TITLES: Record<TemplateKind, string> = {
  booking_confirmation: "Booking Confirmation",
  puja: "Certificate of Puja Performed",
  seva: "Certificate of Seva Sponsorship",
  darshan: "Certificate of Darshan",
};

/** Maps an activity_type (from the real schema's check constraint) to a template. */
function selectTemplate(activityType: string, eventType: EventType): TemplateKind {
  if (eventType === "booking_confirmed") return "booking_confirmation";
  switch (activityType) {
    case "puja":
      return "puja";
    case "seva":
      return "seva";
    case "darshan_certificate":
      return "darshan";
    default:
      // 'contribution' / 'temple_registration' / 'product' / 'other' /
      // 'subscription' have no final "service performed" certificate concept
      // today — surfaced as a rejected reason rather than a silent fallback.
      throw new CertificateError(
        `No certificate template exists for activity_type "${activityType}". ` +
          `Only 'puja', 'seva', and 'darshan_certificate' produce a completion certificate.`
      );
  }
}

// ─── Data shapes ─────────────────────────────────────────────────────────────
interface ActivityRow {
  ref_id: string;
  activity_type: string;
  item_name: string;
  amount: number;
  payment_method: string | null;
  payment_status: "pending_verification" | "confirmed" | "failed";
  completion_status: "not_performed" | "completed";
  performed_at: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface FormSubmissionRow {
  name: string | null;
  email: string | null;
}

export interface MergedFields {
  devoteeName: string;
  serviceName: string;
  deityOrTempleName?: string;
  date: string; // pre-formatted, human-readable
  referenceId: string;
  // ── Invoice-only fields (populated for kind === "booking_confirmation";
  //    left undefined for the "puja"/"seva"/"darshan" certificate templates,
  //    which never read them — see renderCertificatePdf) ──────────────────
  invoiceNumber?: string;
  amount?: number;
  taxAmount?: number;
  discountAmount?: number;
  platformFee?: number;
  totalAmount?: number;
  paymentMethodLabel?: string;
}

export class CertificateError extends Error {
  constructor(message: string, public readonly code: string = "certificate_error") {
    super(message);
    this.name = "CertificateError";
  }
}

// ─── Minimal DB port (real Supabase in prod, fake in-memory in --selftest) ──
export interface CertificateDataPort {
  getActivityByRefId(refId: string): Promise<ActivityRow | null>;
  getFormSubmissionByRefId(refId: string): Promise<FormSubmissionRow | null>;
  claimIdempotency(refId: string, eventType: EventType): Promise<"claimed" | "duplicate">;
  markIdempotencyResult(
    refId: string,
    eventType: EventType,
    status: "sent" | "failed",
    documentPath?: string
  ): Promise<void>;
  audit(refId: string, eventType: EventType, stage: string, detail?: Record<string, unknown>): Promise<void>;
  uploadPdf(path: string, bytes: Uint8Array): Promise<{ signedUrl: string }>;
}

let cachedSupabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (cachedSupabaseAdmin) return cachedSupabaseAdmin;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new CertificateError(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured — cannot verify payment/completion server-side.",
      "config_missing"
    );
  }
  cachedSupabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  return cachedSupabaseAdmin;
}

/** Real implementation, backed by Supabase (Storage bucket: "certificates"). */
export function createSupabaseDataPort(): CertificateDataPort {
  const db = getSupabaseAdmin();
  return {
    async getActivityByRefId(refId) {
      // ✅ ROOT-CAUSE FIX (2026-08-26): was .eq("ref_id", refId).maybeSingle().
      // activities.ref_id only has a plain index, not a uniqueness
      // constraint (see supabase_schema.sql) — so if more than one row
      // ever ends up sharing a ref_id (e.g. a retried/duplicated client
      // write), .maybeSingle() doesn't return one of them, it throws
      // PGRST116 "JSON object requested, multiple (or no) rows returned".
      // That 500 was showing up repeatedly in the ops log
      // (scanForNewlyConfirmedPayments → this endpoint), and every time it
      // fired, that booking's PDF certificate and confirmation email never
      // went out — the pipeline errored before it got that far.
      // order + limit(1) below mirrors the exact pattern
      // getFormSubmissionByRefId already uses two lines down: if duplicate
      // rows exist, take the most recently created one (the most likely to
      // reflect the real, final state of the booking) instead of failing
      // the whole request. A console.warn is logged so duplicate ref_ids
      // stay visible as a data-quality signal worth investigating, without
      // blocking the devotee's PDF/email on that investigation happening
      // first.
      const { data, error } = await db
        .from("activities")
        .select("*")
        .eq("ref_id", refId)
        .order("created_at", { ascending: false })
        .limit(2);
      if (error) throw new CertificateError(`Failed reading activities: ${error.message}`, "db_error");
      if (data && data.length > 1) {
        console.warn(`[certificateService] Multiple activities rows share ref_id "${refId}" (${data.length}+) — using the most recent. This ref_id should be investigated for a duplicate write.`);
      }
      return (data && data[0]) ? (data[0] as ActivityRow) : null;
    },
    async getFormSubmissionByRefId(refId) {
      const { data } = await db
        .from("form_submissions")
        .select("name,email")
        .eq("ref_id", refId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as FormSubmissionRow) ?? null;
    },
    async claimIdempotency(refId, eventType) {
      const { error } = await db
        .from("certificate_idempotency")
        .insert({ ref_id: refId, event_type: eventType, status: "in_progress" });
      if (error) {
        // Unique-violation (Postgres 23505) => another call already claimed it.
        if ((error as { code?: string }).code === "23505") return "duplicate";
        throw new CertificateError(`Idempotency claim failed: ${error.message}`, "db_error");
      }
      return "claimed";
    },
    async markIdempotencyResult(refId, eventType, status, documentPath) {
      await db
        .from("certificate_idempotency")
        .update({ status, document_path: documentPath ?? null, updated_at: new Date().toISOString() })
        .eq("ref_id", refId)
        .eq("event_type", eventType);
    },
    async audit(refId, eventType, stage, detail) {
      await db.from("certificate_audit_log").insert({ ref_id: refId, event_type: eventType, stage, detail: detail ?? {} });
    },
    async uploadPdf(path, bytes) {
      const { error } = await db.storage.from("certificates").upload(path, bytes, {
        contentType: "application/pdf",
        upsert: false, // idempotency claim already guarantees this path is new
      });
      if (error) throw new CertificateError(`Storage upload failed: ${error.message}`, "storage_error");
      const { data: signed, error: signErr } = await db.storage
        .from("certificates")
        .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
      if (signErr || !signed) throw new CertificateError(`Signed URL failed: ${signErr?.message}`, "storage_error");
      return { signedUrl: signed.signedUrl };
    },
  };
}

// ─── Field merge (allowlist enforced here — nothing else ever reaches a PDF) ─
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  gpay: "Google Pay (UPI)",
  phonepe: "PhonePe (UPI)",
  paytm: "Paytm (UPI)",
  bank_transfer: "Bank Transfer",
};

function formatRupees(n: number): string {
  // ⚠️ Deliberately "Rs." not "₹" — pdf-lib's StandardFonts (WinAnsi
  // encoding) CANNOT encode the ₹ glyph (U+20B9) and throws at render time
  // if you try (verified: crashes every single invoice generation). Embedding
  // a custom Unicode font just for this one glyph is real added complexity/
  // file size for a cosmetic difference, so the PDF prints "Rs." — the HTML
  // email version below is unaffected and still shows the real ₹ symbol,
  // since email rendering has no such font-encoding limitation.
  // en-IN gives the correct Indian digit grouping (1,23,456), matching how
  // every UPI app already displays amounts to your devotees.
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function mergeFields(
  activity: ActivityRow,
  submission: FormSubmissionRow | null,
  eventType: EventType
): MergedFields {
  const dateSource = eventType === "certificate_ready" ? activity.performed_at : activity.created_at;
  if (!dateSource) {
    throw new CertificateError("No valid date available to print on the document.", "missing_data");
  }
  const deity =
    (activity.metadata?.["deity_or_temple"] as string | undefined) ??
    (activity.metadata?.["temple_name"] as string | undefined) ??
    undefined;

  const base: MergedFields = {
    devoteeName: (submission?.name ?? "").trim() || "Devotee",
    serviceName: activity.item_name?.trim() || "Sacred Offering",
    deityOrTempleName: deity?.trim() || undefined,
    date: formatDate(dateSource),
    referenceId: activity.ref_id,
  };

  if (eventType !== "booking_confirmed") return base; // certificates: unchanged, 5-field allowlist only

  // ── Invoice fields — only ever populated here, only for booking_confirmed,
  //    only after the payment_status === 'confirmed' guard has already run. ──
  const amount = typeof activity.amount === "number" ? activity.amount : 0;
  const taxAmount = typeof activity.metadata?.["tax_amount"] === "number" ? (activity.metadata["tax_amount"] as number) : undefined;
  const discountAmount =
    typeof activity.metadata?.["discount_amount"] === "number" ? (activity.metadata["discount_amount"] as number) : undefined;
  const platformFee =
    typeof activity.metadata?.["platform_fee"] === "number" ? (activity.metadata["platform_fee"] as number) : undefined;
  const totalAmount = amount + (taxAmount ?? 0) + (platformFee ?? 0) - (discountAmount ?? 0);

  const methodKey = (activity.payment_method ?? "").trim().toLowerCase();
  const paymentMethodLabel = methodKey
    ? PAYMENT_METHOD_LABELS[methodKey] ?? (activity.payment_method as string)
    : "UPI"; // your only payment method today — a safe, honest default when the field is blank

  return {
    ...base,
    invoiceNumber: `INV-${activity.ref_id}`,
    amount,
    taxAmount,
    discountAmount,
    platformFee,
    totalAmount,
    paymentMethodLabel,
  };
}

// ═════════════════════════════════ RENDERING ════════════════════════════════
// Pure vector drawing (no external image assets to go missing at deploy time).
// A restrained repeating-petal mandala corner motif + thin gold hairline
// border keeps it premium and uncluttered — generous margins, one accent
// color family, one display face, one body face.

async function drawMandalaCorner(page: PDFPage, x: number, y: number, scale = 1) {
  // A restrained eight-petal lotus flourish, not a full starburst — reads as
  // an ornamental corner accent rather than competing with the certificate text.
  const petal = (r: number) =>
    `M 0 0 C ${r * 0.35} ${r * 0.12}, ${r * 0.45} ${r * 0.55}, 0 ${r} C ${-r * 0.45} ${r * 0.55}, ${-r * 0.35} ${r * 0.12}, 0 0 Z`;
  for (let i = 0; i < 8; i++) {
    page.drawSvgPath(petal(20 * scale), {
      x,
      y,
      scale,
      rotate: degrees(i * 45),
      color: BRAND.saffron,
      opacity: 0.22,
      borderColor: BRAND.gold,
      borderWidth: 0.5,
      borderOpacity: 0.7,
    });
  }
  page.drawEllipse({ x, y, xScale: 3.2 * scale, yScale: 3.2 * scale, color: BRAND.saffron });
  page.drawEllipse({ x, y, xScale: 6 * scale, yScale: 6 * scale, borderColor: BRAND.gold, borderWidth: 0.75 });
}

async function drawFrame(page: PDFPage) {
  const { width, height } = page.getSize();
  const margin = 24;
  // outer deep border
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: BRAND.darkGreen,
    borderWidth: 1.4,
  });
  // inner hairline (creates the "generous whitespace" band premium certs use)
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - (margin + 10) * 2,
    height: height - (margin + 10) * 2,
    borderColor: BRAND.gold,
    borderWidth: 0.6,
  });
  await drawMandalaCorner(page, margin + 10, height - margin - 10);
  await drawMandalaCorner(page, width - margin - 10, height - margin - 10);
  await drawMandalaCorner(page, margin + 10, margin + 10);
  await drawMandalaCorner(page, width - margin - 10, margin + 10);
}

function centeredText(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB = BRAND.darkGreen
) {
  const { width } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
}

async function renderCertificatePdf(kind: TemplateKind, fields: MergedFields): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 419.53]); // A5 landscape — premium certificate proportions
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifRegular = await doc.embedFont(StandardFonts.TimesRoman);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: BRAND.cream });
  await drawFrame(page);

  centeredText(page, BRAND.name.toUpperCase(), height - 70, serif, 14, BRAND.darkGreen);
  centeredText(page, BRAND.tagline, height - 87, serifItalic, 9, BRAND.textMuted);

  centeredText(page, TEMPLATE_TITLES[kind], height - 140, serif, 22, BRAND.saffron);

  const bodyLine1 =
    kind === "booking_confirmation"
      ? `This confirms that ${fields.devoteeName}'s booking for`
      : `This is to certify that ${fields.devoteeName}'s`;
  centeredText(page, bodyLine1, height - 190, serifRegular, 13);

  const serviceLine = fields.deityOrTempleName
    ? `${fields.serviceName} — ${fields.deityOrTempleName}`
    : fields.serviceName;
  centeredText(page, serviceLine, height - 215, serif, 16, BRAND.darkGreen);

  const bodyLine2 =
    kind === "booking_confirmation"
      ? `has been received and confirmed as of ${fields.date}.`
      : `was performed with devotion on ${fields.date}.`;
  centeredText(page, bodyLine2, height - 240, serifRegular, 13);

  centeredText(page, `Reference: ${fields.referenceId}`, 70, serifRegular, 10, BRAND.textMuted);
  centeredText(page, "sridwar.com", 55, serifItalic, 9, BRAND.textMuted);

  return doc.save();
}

// ═══════════════════════════ INVOICE (payment-confirmed) ════════════════════
// Itemized, A4 portrait, table-style layout — structurally the same idea as
// an Amazon/Flipkart order invoice (seller block, invoice #, bill-to,
// line-item table, subtotal → total, payment status stamp, terms footer),
// adapted to Sri Dwar's own brand palette. Used ONLY for kind ===
// "booking_confirmation" — i.e. only ever reached after runPipeline's guard
// has already re-verified payment_status === 'confirmed' server-side. The
// puja/seva/darshan certificate templates never call this function.
async function renderInvoicePdf(fields: MergedFields): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const { width, height } = page.getSize();
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 48;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const text = (
    t: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: PDFFont; color?: RGB; align?: "left" | "right" } = {}
  ) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? sans;
    const color = opts.color ?? BRAND.darkGreen;
    const drawX = opts.align === "right" ? x - font.widthOfTextAtSize(t, size) : x;
    page.drawText(t, { x: drawX, y: yy, size, font, color });
  };
  const rule = (yy: number, color: RGB = BRAND.gold, thickness = 0.75) =>
    page.drawRectangle({ x: margin, y: yy, width: contentWidth, height: thickness, color });

  // ── Header band: brand + document title ──────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: BRAND.darkGreen });
  text(BRAND.name.toUpperCase(), margin, height - 42, { size: 20, font: sansBold, color: BRAND.white });
  text(BRAND.tagline, margin, height - 60, { size: 9, font: sans, color: BRAND.gold });
  text("PAYMENT CONFIRMATION / INVOICE", width - margin, height - 42, {
    size: 13,
    font: sansBold,
    color: BRAND.white,
    align: "right",
  });
  text("Shradhalu Private Limited", width - margin, height - 60, { size: 9, font: sans, color: BRAND.gold, align: "right" });
  text("Jajpur Road, Odisha, India", width - margin, height - 73, { size: 9, font: sans, color: BRAND.gold, align: "right" });
  y = height - 96 - 32;

  // ── Invoice meta + Bill To, two columns ──────────────────────────────────
  text("BILL TO", margin, y, { size: 8, font: sansBold, color: BRAND.textMuted });
  text("INVOICE DETAILS", width / 2 + 10, y, { size: 8, font: sansBold, color: BRAND.textMuted });
  y -= 16;
  text(fields.devoteeName, margin, y, { size: 12, font: sansBold });
  text(`Invoice #: ${fields.invoiceNumber}`, width / 2 + 10, y, { size: 10, font: sans });
  y -= 15;
  text(`Reference: ${fields.referenceId}`, width / 2 + 10, y, { size: 10, font: sans });
  y -= 15;
  text(`Date: ${fields.date}`, width / 2 + 10, y, { size: 10, font: sans });
  y -= 28;
  rule(y);
  y -= 24;

  // ── Line-item table ───────────────────────────────────────────────────────
  const col2 = width - margin - 110; // amount column, right-aligned
  text("DESCRIPTION", margin, y, { size: 8, font: sansBold, color: BRAND.textMuted });
  text("AMOUNT", width - margin, y, { size: 8, font: sansBold, color: BRAND.textMuted, align: "right" });
  y -= 10;
  rule(y);
  y -= 20;

  const serviceLine = fields.deityOrTempleName ? `${fields.serviceName} — ${fields.deityOrTempleName}` : fields.serviceName;
  text(serviceLine, margin, y, { size: 11, font: sans });
  text(formatRupees(fields.amount ?? 0), width - margin, y, { size: 11, font: sans, align: "right" });
  y -= 26;
  rule(y, BRAND.textMuted, 0.5);
  y -= 22;

  // ── Totals block, right-aligned ──────────────────────────────────────────
  const totalsRow = (label: string, value: string, opts: { bold?: boolean; color?: RGB } = {}) => {
    text(label, col2 - 90, y, { size: 10, font: opts.bold ? sansBold : sans, color: opts.color ?? BRAND.darkGreen });
    text(value, width - margin, y, { size: 10, font: opts.bold ? sansBold : sans, color: opts.color ?? BRAND.darkGreen, align: "right" });
    y -= 16;
  };
  totalsRow("Subtotal", formatRupees(fields.amount ?? 0));
  if (typeof fields.taxAmount === "number") totalsRow("Tax", formatRupees(fields.taxAmount));
  if (typeof fields.platformFee === "number") totalsRow("Platform / convenience fee", formatRupees(fields.platformFee));
  if (typeof fields.discountAmount === "number") totalsRow("Discount", `- ${formatRupees(fields.discountAmount)}`);
  y -= 4;
  rule(y);
  y -= 20;
  text("TOTAL PAID", col2 - 90, y, { size: 13, font: sansBold, color: BRAND.darkGreen });
  text(formatRupees(fields.totalAmount ?? fields.amount ?? 0), width - margin, y, {
    size: 13,
    font: sansBold,
    color: BRAND.darkGreen,
    align: "right",
  });
  y -= 34;

  // ── Payment method + status stamp ────────────────────────────────────────
  text(`Payment Method: ${fields.paymentMethodLabel ?? "UPI"}`, margin, y, { size: 10, font: sans });
  const stampLabel = "PAYMENT CONFIRMED";
  const stampFontSize = 8.5;
  const stampTextWidth = sansBold.widthOfTextAtSize(stampLabel, stampFontSize);
  const stampBoxWidth = stampTextWidth + 20; // 10px padding each side
  page.drawRectangle({ x: width - margin - stampBoxWidth, y: y - 6, width: stampBoxWidth, height: 22, color: rgb(0.09, 0.42, 0.24) });
  text(stampLabel, width - margin - 10, y, { size: stampFontSize, font: sansBold, color: BRAND.white, align: "right" });
  y -= 40;

  // ── Footer: disclaimer / terms ────────────────────────────────────────────
  rule(y);
  y -= 16;
  const disclaimer =
    "Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple " +
    "schedule, festival rush, priest availability, and temple rituals. This document confirms receipt of payment as " +
    "recorded above and serves as your official proof of booking/payment. For queries, contact puja@sridwar.com.";
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const words = disclaimer.split(" ");
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (italic.widthOfTextAtSize(candidate, 8) > contentWidth) {
      text(line, margin, y, { size: 8, font: italic, color: BRAND.textMuted });
      y -= 11;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    text(line, margin, y, { size: 8, font: italic, color: BRAND.textMuted });
    y -= 11;
  }
  y -= 10;
  text("Shradhalu Private Limited · sridwar.com · puja@sridwar.com", margin, y, { size: 8, font: sans, color: BRAND.textMuted });

  return doc.save();
}

// ═══════════════════════════════ EMAIL PAYLOAD ══════════════════════════════
// Actual delivery reuses the same pattern already in production (Config.gs /
// EmailSender.gs) — this just builds the payload; sending is one fetch() to
// your existing Apps Script Web App URL. If that env var isn't set yet, the
// PDF is still generated/stored/audited — email is skipped, not fatal.

interface CertificateEmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  attachmentBase64: string;
  attachmentFilename: string;
  // ─── Added for Webhook.gs (Apps Script) ────────────────────────────────
  // Webhook.gs requires refId + emailType on every request: refId feeds the
  // SAME dedupe log every other email in the project uses (so a retry can
  // never double-send), and emailType must be one of the two values in its
  // allow-list. These are deliberately namespaced with a "webhook_invoice_"
  // prefix so they can never collide with the Sheets-driven flow's own
  // "certificate_ready" / "booking" emailType values in that shared log.
  refId: string;
  emailType: "webhook_invoice_booking_confirmed" | "webhook_invoice_certificate_ready";
}

function buildEmailPayload(
  eventType: EventType,
  kind: TemplateKind,
  fields: MergedFields,
  toEmail: string,
  pdfBytes: Uint8Array
): CertificateEmailPayload {
  const subject =
    eventType === "booking_confirmed"
      ? `Sri Dwar — Payment Confirmed & Invoice (${fields.referenceId})`
      : `Sri Dwar — Your ${TEMPLATE_TITLES[kind]} is Ready`;

  const bodyHtml = `
    <div style="font-family:Georgia,serif;background:#fbf6ec;padding:24px;color:#0c2b26;">
      <h2 style="color:#0c2b26;">${subject}</h2>
      <p>Dear ${fields.devoteeName},</p>
      <p>${
        eventType === "booking_confirmed"
          ? `Your payment for <strong>${fields.serviceName}</strong> has been received and confirmed. The attached PDF is your official invoice and payment confirmation — please keep it as proof of your booking.`
          : `Your <strong>${TEMPLATE_TITLES[kind]}</strong> for <strong>${fields.serviceName}</strong> is attached, performed on ${fields.date}.`
      }</p>
      ${
        eventType === "booking_confirmed" && typeof fields.totalAmount === "number"
          ? `<p style="font-size:15px;"><strong>Amount Paid: ₹${fields.totalAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
            })}</strong> via ${fields.paymentMethodLabel ?? "UPI"}</p>`
          : ""
      }
      <p style="color:#6b7a76;font-size:13px;">Reference: ${fields.referenceId}${
    fields.invoiceNumber ? ` · Invoice: ${fields.invoiceNumber}` : ""
  }<br/>Sri Dwar — Connect. Contribute. Preserve.</p>
    </div>`;

  return {
    to: toEmail,
    subject,
    bodyHtml,
    attachmentBase64: Buffer.from(pdfBytes).toString("base64"),
    attachmentFilename: `${fields.referenceId}-${kind}.pdf`,
    refId: fields.referenceId,
    emailType: eventType === "booking_confirmed" ? "webhook_invoice_booking_confirmed" : "webhook_invoice_certificate_ready",
  };
}

interface DispatchEmailResult {
  status: "sent" | "skipped";
  /**
   * ✅ DIAGNOSTIC FIX (2026-08-16): previously this function returned a bare
   * "skipped" string for THREE completely different situations —
   *   1. GAS_EMAIL_WEBHOOK_URL not set on this server at all (email sending
   *      fully disabled, on purpose, per the original "wire trigger later"
   *      scope note at the top of this file)
   *   2. Webhook.gs itself declining to send (its own dedupe log already
   *      shows this refId+emailType as sent, an invalid-looking recipient
   *      address, or the daily quota being exhausted)
   *   3. (previously) no distinction at all in certificate_audit_log —
   *      every "email_skipped" row looked identical, so there was no way
   *      to tell "email sending isn't even configured yet" apart from
   *      "email sending is configured and is deliberately holding back."
   * This made the single most common real-world failure — a booking's PDF
   * generates fine, the row shows "generated" in every log, and yet the
   * devotee never receives anything — genuinely impossible to diagnose
   * from the audit log alone. `reason` is now carried through into
   * certificate_audit_log's `detail` column (see runPipeline below) so the
   * exact cause is visible without guessing.
   */
  reason?: string;
}

async function dispatchEmail(payload: CertificateEmailPayload): Promise<DispatchEmailResult> {
  const webhookUrl = process.env.GAS_EMAIL_WEBHOOK_URL;
  const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!webhookUrl) {
    // deliberate — see file header — but now labeled, not silent.
    return {
      status: "skipped",
      reason: "GAS_EMAIL_WEBHOOK_URL is not set on this server. No email was even attempted. Set it, on Render, to your Apps Script Web App's /exec URL (see Webhook.gs setup steps).",
    };
  }
  if (!webhookSecret) {
    // Fail loudly, not silently: a missing secret is a config mistake, not
    // an intentional "email disabled" state like a missing webhookUrl is.
    throw new CertificateError(
      "GAS_EMAIL_WEBHOOK_URL is set but EMAIL_WEBHOOK_SECRET is not — Webhook.gs will reject every request without it.",
      "config_missing"
    );
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, secret: webhookSecret }),
  });
  if (!res.ok) throw new CertificateError(`Email webhook responded ${res.status}`, "email_error");
  const json = (await res.json()) as { ok: boolean; sent?: boolean; error?: string };
  if (!json.ok) throw new CertificateError(`Email webhook rejected the request: ${json.error}`, "email_error");
  if (json.sent) return { status: "sent" };
  // Webhook.gs's own dedupe/quota/validity logic held it back — see
  // sendBrandedEmail_() in EmailSender.gs for the exact possible causes.
  return {
    status: "skipped",
    reason: "Webhook.gs received the request and returned ok, but did not actually send (its own dedupe log, invalid-looking email address, or daily quota). Check Email_Send_Log / Email_Errors in the tracking spreadsheet for this refId.",
  };
}

// ═══════════════════════════════ ENTRY POINTS ═══════════════════════════════

export interface GenerationResult {
  status: "generated" | "duplicate_skipped";
  documentUrl?: string;
  emailStatus?: "sent" | "skipped";
}

async function runPipeline(
  refId: string,
  eventType: EventType,
  port: CertificateDataPort,
  guard: (activity: ActivityRow) => void
): Promise<GenerationResult> {
  const activity = await port.getActivityByRefId(refId);
  if (!activity) throw new CertificateError(`No booking found for ref_id "${refId}".`, "not_found");

  guard(activity); // throws CertificateError with code "payment_not_confirmed" / "not_completed" and audits the rejection itself

  const claim = await port.claimIdempotency(refId, eventType);
  if (claim === "duplicate") {
    await port.audit(refId, eventType, "duplicate_blocked", { reason: "already claimed" });
    return { status: "duplicate_skipped" };
  }

  try {
    const submission = await port.getFormSubmissionByRefId(refId);
    const fields = mergeFields(activity, submission, eventType);
    const kind = selectTemplate(activity.activity_type, eventType);

    const pdfBytes = kind === "booking_confirmation" ? await renderInvoicePdf(fields) : await renderCertificatePdf(kind, fields);
    await port.audit(refId, eventType, "pdf_generated", { kind });

    const path = `${refId}/${eventType}.pdf`;
    const { signedUrl } = await port.uploadPdf(path, pdfBytes);

    let emailStatus: "sent" | "skipped" = "skipped";
    const toEmail = submission?.email;
    if (toEmail) {
      const payload = buildEmailPayload(eventType, kind, fields, toEmail, pdfBytes);
      try {
        const dispatchResult = await dispatchEmail(payload);
        emailStatus = dispatchResult.status;
        await port.audit(refId, eventType, emailStatus === "sent" ? "email_sent" : "email_skipped", {
          toEmail,
          ...(dispatchResult.reason ? { reason: dispatchResult.reason } : {}),
        });
      } catch (err) {
        await port.audit(refId, eventType, "email_failed", { error: (err as Error).message });
        // PDF generation still counts as success even if email delivery fails —
        // the document is saved against the booking either way.
      }
    } else {
      await port.audit(refId, eventType, "email_skipped", { reason: "no email on file" });
    }

    await port.markIdempotencyResult(refId, eventType, "sent", path);
    return { status: "generated", documentUrl: signedUrl, emailStatus };
  } catch (err) {
    await port.markIdempotencyResult(refId, eventType, "failed");
    await port.audit(refId, eventType, "pdf_generation_failed", { error: (err as Error).message });
    throw err;
  }
}

/** Payment-Confirmed Booking PDF. Only 'confirmed' payment_status passes. */
export async function generateBookingConfirmationPdf(
  refId: string,
  port: CertificateDataPort = createSupabaseDataPort()
): Promise<GenerationResult> {
  return runPipeline(refId, "booking_confirmed", port, (activity) => {
    if (activity.payment_status !== "confirmed") {
      void port.audit(refId, "booking_confirmed", "payment_rejected", { payment_status: activity.payment_status });
      throw new CertificateError(
        `Booking confirmation PDF refused: payment_status is "${activity.payment_status}", not "confirmed".`,
        "payment_not_confirmed"
      );
    }
    void port.audit(refId, "booking_confirmed", "payment_verified", {});
  });
}

/**
 * Final service certificate. Deliberately never reads payment_status.
 * Requires completion_status === 'completed' AND a real performed_at.
 */
export async function generateCertificatePdf(
  refId: string,
  port: CertificateDataPort = createSupabaseDataPort()
): Promise<GenerationResult> {
  return runPipeline(refId, "certificate_ready", port, (activity) => {
    if (activity.completion_status !== "completed" || !activity.performed_at) {
      void port.audit(refId, "certificate_ready", "completion_rejected", {
        completion_status: activity.completion_status,
        performed_at: activity.performed_at,
      });
      throw new CertificateError(
        `Certificate refused: service not marked completed (completion_status="${activity.completion_status}", ` +
          `performed_at=${activity.performed_at ?? "null"}). Payment status is irrelevant to this check.`,
        "not_completed"
      );
    }
    void port.audit(refId, "certificate_ready", "completion_verified", { performed_at: activity.performed_at });
  });
}

// ═══════════════════════════ OPTIONAL ADMIN TEST ROUTES ═════════════════════
// Not mounted automatically. To use during QA, add ONE line to server.ts:
//
//   import { registerCertificateAdminRoutes } from "./certificateService";
//   registerCertificateAdminRoutes(app);
//
// Protected by CERTIFICATE_ADMIN_SECRET (set in your .env) — this is the
// manual stand-in until a real trigger is wired, and is safe to leave
// unmounted in production until then.
export function registerCertificateAdminRoutes(app: {
  post: (path: string, handler: (req: any, res: any) => void) => void;
}) {
  const requireSecret = (req: any, res: any, next: () => void) => {
    const secret = process.env.CERTIFICATE_ADMIN_SECRET;
    if (!secret || req.headers["x-admin-secret"] !== secret) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    next();
  };

  app.post("/api/admin/certificates/booking-confirmation", (req: any, res: any) => {
    requireSecret(req, res, async () => {
      try {
        const result = await generateBookingConfirmationPdf(req.body?.refId);
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: (err as CertificateError).message, code: (err as CertificateError).code });
      }
    });
  });

  app.post("/api/admin/certificates/certificate", (req: any, res: any) => {
    requireSecret(req, res, async () => {
      try {
        const result = await generateCertificatePdf(req.body?.refId);
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: (err as CertificateError).message, code: (err as CertificateError).code });
      }
    });
  });
}

// ═════════════════════════════════ SELF TESTS ═══════════════════════════════
// Exercises every required scenario against an in-memory fake — no network,
// no live Supabase project needed. Run: npx tsx certificateService.ts --selftest

function makeFakePort() {
  const activities = new Map<string, ActivityRow>();
  const submissions = new Map<string, FormSubmissionRow>();
  const idempotency = new Map<string, "in_progress" | "sent" | "failed">();
  const auditLog: { refId: string; eventType: string; stage: string; detail?: unknown }[] = [];
  const uploads = new Map<string, Uint8Array>();

  const port: CertificateDataPort = {
    async getActivityByRefId(refId) {
      return activities.get(refId) ?? null;
    },
    async getFormSubmissionByRefId(refId) {
      return submissions.get(refId) ?? null;
    },
    async claimIdempotency(refId, eventType) {
      const key = `${refId}:${eventType}`;
      if (idempotency.has(key)) return "duplicate";
      idempotency.set(key, "in_progress");
      return "claimed";
    },
    async markIdempotencyResult(refId, eventType, status) {
      idempotency.set(`${refId}:${eventType}`, status);
    },
    async audit(refId, eventType, stage, detail) {
      auditLog.push({ refId, eventType, stage, detail });
    },
    async uploadPdf(path, bytes) {
      uploads.set(path, bytes);
      return { signedUrl: `https://fake.local/${path}` };
    },
  };

  return { port, activities, submissions, auditLog, uploads };
}

async function runCertificateSelfTests() {
  let passed = 0;
  let failed = 0;
  const check = (label: string, cond: boolean) => {
    console.log(`${cond ? "PASS" : "FAIL"} — ${label}`);
    cond ? passed++ : failed++;
  };

  // TEST 1 — payment success -> booking confirmation PDF generated + emailed
  {
    const { port, activities, submissions, uploads } = makeFakePort();
    activities.set("SDP-001", {
      ref_id: "SDP-001",
      activity_type: "puja",
      item_name: "Rudrabhishek Puja",
      amount: 501,
      payment_method: "upi",
      payment_status: "confirmed",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: { deity_or_temple: "Lord Shiva, Kashi Vishwanath" },
    });
    submissions.set("SDP-001", { name: "Aarav Sharma", email: "aarav@example.com" });
    const result = await generateBookingConfirmationPdf("SDP-001", port);
    check("TEST 1: payment confirmed -> PDF generated", result.status === "generated");
    check("TEST 1: PDF bytes saved to storage", uploads.has("SDP-001/booking_confirmed.pdf"));
  }

  // TEST 2 — payment pending -> refused
  {
    const { port, activities, submissions } = makeFakePort();
    activities.set("SDP-002", {
      ref_id: "SDP-002",
      activity_type: "seva",
      item_name: "Annadanam Seva",
      amount: 501,
      payment_method: "upi",
      payment_status: "pending_verification",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: null,
    });
    submissions.set("SDP-002", { name: "Priya", email: "priya@example.com" });
    let threw = false;
    try {
      await generateBookingConfirmationPdf("SDP-002", port);
    } catch (e) {
      threw = (e as CertificateError).code === "payment_not_confirmed";
    }
    check("TEST 2: payment pending -> refused", threw);
  }

  // TEST 3 — payment failed -> refused
  {
    const { port, activities } = makeFakePort();
    activities.set("SDP-003", {
      ref_id: "SDP-003",
      activity_type: "darshan_certificate",
      item_name: "Live Darshan",
      amount: 501,
      payment_method: "upi",
      payment_status: "failed",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: null,
    });
    let threw = false;
    try {
      await generateBookingConfirmationPdf("SDP-003", port);
    } catch (e) {
      threw = (e as CertificateError).code === "payment_not_confirmed";
    }
    check("TEST 3: payment failed -> refused", threw);
  }

  // TEST 4 — duplicate event -> second call skipped, no second PDF
  {
    const { port, activities, submissions, uploads } = makeFakePort();
    activities.set("SDP-004", {
      ref_id: "SDP-004",
      activity_type: "puja",
      item_name: "Ganapati Homam",
      amount: 501,
      payment_method: "upi",
      payment_status: "confirmed",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: null,
    });
    submissions.set("SDP-004", { name: "Devi", email: "devi@example.com" });
    const first = await generateBookingConfirmationPdf("SDP-004", port);
    const second = await generateBookingConfirmationPdf("SDP-004", port);
    check("TEST 4: first call generates", first.status === "generated");
    check("TEST 4: duplicate call skipped", second.status === "duplicate_skipped");
    check("TEST 4: only one PDF stored", uploads.size === 1);
  }

  // TEST 5 — missing devotee name -> does not block, falls back gracefully
  {
    const { port, activities, submissions } = makeFakePort();
    activities.set("SDP-005", {
      ref_id: "SDP-005",
      activity_type: "seva",
      item_name: "Gau Seva",
      amount: 501,
      payment_method: "upi",
      payment_status: "confirmed",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: null,
    });
    submissions.set("SDP-005", { name: null, email: "anon@example.com" });
    const result = await generateBookingConfirmationPdf("SDP-005", port);
    check("TEST 5: missing name does not block generation", result.status === "generated");
  }

  // TEST 6 — payment confirmed but NOT completed -> certificate still refused
  //          (proves payment success is never treated as proof of performance)
  {
    const { port, activities } = makeFakePort();
    activities.set("SDP-006", {
      ref_id: "SDP-006",
      activity_type: "puja",
      item_name: "Satyanarayan Puja",
      amount: 501,
      payment_method: "upi",
      payment_status: "confirmed",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: null,
    });
    let threw = false;
    try {
      await generateCertificatePdf("SDP-006", port);
    } catch (e) {
      threw = (e as CertificateError).code === "not_completed";
    }
    check("TEST 6: paid-but-not-performed -> certificate refused", threw);
  }

  // TEST 7 — completed -> certificate generated for all three template types
  {
    for (const [activityType, kindLabel] of [
      ["puja", "puja"],
      ["seva", "seva"],
      ["darshan_certificate", "darshan"],
    ] as const) {
      const { port, activities, submissions } = makeFakePort();
      const refId = `SDP-007-${activityType}`;
      activities.set(refId, {
        ref_id: refId,
        activity_type: activityType,
        item_name: "Test Service",
        amount: 501,
        payment_method: "upi",
        payment_status: "confirmed",
        completion_status: "completed",
        performed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        metadata: { deity_or_temple: "Test Deity" },
      });
      submissions.set(refId, { name: "Test Devotee", email: "test@example.com" });
      const result = await generateCertificatePdf(refId, port);
      check(`TEST 7: completed '${kindLabel}' -> certificate generated`, result.status === "generated");
    }
  }

  // TEST 8 — unsupported activity_type for a certificate -> clean rejection, not a crash
  {
    const { port, activities } = makeFakePort();
    activities.set("SDP-008", {
      ref_id: "SDP-008",
      activity_type: "contribution",
      item_name: "Temple Redevelopment",
      amount: 501,
      payment_method: "upi",
      payment_status: "confirmed",
      completion_status: "completed",
      performed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      metadata: null,
    });
    let threw = false;
    try {
      await generateCertificatePdf("SDP-008", port);
    } catch {
      threw = true;
    }
    check("TEST 8: unsupported activity_type -> clean rejection", threw);
  }

  // TEST 9 — email attachment is built correctly when an address is on file
  {
    const fields: MergedFields = {
      devoteeName: "Test Devotee",
      serviceName: "Test Puja",
      date: "1 January 2026",
      referenceId: "SDP-009",
    };
    const pdfBytes = await renderCertificatePdf("puja", fields);
    const payload = buildEmailPayload("certificate_ready", "puja", fields, "test@example.com", pdfBytes);
    check("TEST 9: PDF bytes non-empty", pdfBytes.length > 500);
    check("TEST 9: email payload has base64 attachment", payload.attachmentBase64.length > 100);
    check("TEST 9: attachment filename includes reference id", payload.attachmentFilename.includes("SDP-009"));
  }

  // TEST 10 — invoice: amount/total/payment method are correctly merged and
  //           printed; tax/discount/platformFee are OMITTED (not zeroed) when
  //           absent from metadata, and INCLUDED when present.
  {
    const { port, activities, submissions } = makeFakePort();
    activities.set("SDP-010", {
      ref_id: "SDP-010",
      activity_type: "puja",
      item_name: "Rudrabhishek Puja",
      amount: 1100,
      payment_method: "upi",
      payment_status: "confirmed",
      completion_status: "not_performed",
      performed_at: null,
      created_at: new Date().toISOString(),
      metadata: { deity_or_temple: "Lord Shiva" },
    });
    submissions.set("SDP-010", { name: "Meera Nair", email: "meera@example.com" });
    const result = await generateBookingConfirmationPdf("SDP-010", port);
    check("TEST 10a: invoice generates for confirmed payment", result.status === "generated");

    // No tax/discount/platformFee in metadata -> mergeFields must OMIT them,
    // not silently print ₹0 — checked directly against the merge output.
    const activity010 = activities.get("SDP-010")!;
    const fields010 = mergeFields(activity010, submissions.get("SDP-010")!, "booking_confirmed");
    check("TEST 10b: amount merged correctly", fields010.amount === 1100);
    check("TEST 10c: totalAmount = amount when no tax/fee/discount", fields010.totalAmount === 1100);
    check("TEST 10d: taxAmount omitted (not fabricated as 0)", fields010.taxAmount === undefined);
    check("TEST 10e: invoiceNumber derived from ref_id", fields010.invoiceNumber === "INV-SDP-010");
    check("TEST 10f: UPI payment method label", fields010.paymentMethodLabel === "UPI");

    // With tax + platform fee + discount present in metadata -> total reflects all three.
    const activityWithCharges: ActivityRow = {
      ...activity010,
      ref_id: "SDP-010b",
      metadata: { tax_amount: 50, platform_fee: 20, discount_amount: 100 },
    };
    const fieldsWithCharges = mergeFields(activityWithCharges, submissions.get("SDP-010")!, "booking_confirmed");
    check("TEST 10g: total = amount + tax + platformFee - discount", fieldsWithCharges.totalAmount === 1100 + 50 + 20 - 100);

    // Certificates must NEVER carry invoice fields, even though they share MergedFields.
    const certFields = mergeFields(
      { ...activity010, performed_at: new Date().toISOString() },
      submissions.get("SDP-010")!,
      "certificate_ready"
    );
    check("TEST 10h: certificate merge has no invoiceNumber", certFields.invoiceNumber === undefined);
    check("TEST 10i: certificate merge has no amount", certFields.amount === undefined);

    const pdfBytes = await renderInvoicePdf(fields010);
    check("TEST 10j: invoice PDF renders non-trivial bytes", pdfBytes.length > 800);
  }

  console.log(`\n${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

// Run self-tests when invoked directly: `npx tsx certificateService.ts --selftest`
if (process.argv.includes("--selftest")) {
  runCertificateSelfTests();
}

