"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// certificateService.ts
var certificateService_exports = {};
__export(certificateService_exports, {
  CertificateError: () => CertificateError,
  createSupabaseDataPort: () => createSupabaseDataPort,
  generateBookingConfirmationPdf: () => generateBookingConfirmationPdf,
  generateCertificatePdf: () => generateCertificatePdf,
  registerCertificateAdminRoutes: () => registerCertificateAdminRoutes
});
function selectTemplate(activityType, eventType) {
  if (eventType === "booking_confirmed") return "booking_confirmation";
  switch (activityType) {
    case "puja":
      return "puja";
    case "seva":
      return "seva";
    case "darshan_certificate":
      return "darshan";
    default:
      throw new CertificateError(
        `No certificate template exists for activity_type "${activityType}". Only 'puja', 'seva', and 'darshan_certificate' produce a completion certificate.`
      );
  }
}
function getSupabaseAdmin() {
  if (cachedSupabaseAdmin) return cachedSupabaseAdmin;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new CertificateError(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured \u2014 cannot verify payment/completion server-side.",
      "config_missing"
    );
  }
  cachedSupabaseAdmin = (0, import_supabase_js.createClient)(url, key, { auth: { persistSession: false } });
  return cachedSupabaseAdmin;
}
function createSupabaseDataPort() {
  const db = getSupabaseAdmin();
  return {
    async getActivityByRefId(refId) {
      const { data, error } = await db.from("activities").select("*").eq("ref_id", refId).order("created_at", { ascending: false }).limit(2);
      if (error) throw new CertificateError(`Failed reading activities: ${error.message}`, "db_error");
      if (data && data.length > 1) {
        console.warn(`[certificateService] Multiple activities rows share ref_id "${refId}" (${data.length}+) \u2014 using the most recent. This ref_id should be investigated for a duplicate write.`);
      }
      return data && data[0] ? data[0] : null;
    },
    async getFormSubmissionByRefId(refId) {
      const { data } = await db.from("form_submissions").select("name,email").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data ?? null;
    },
    async claimIdempotency(refId, eventType) {
      const { error } = await db.from("certificate_idempotency").insert({ ref_id: refId, event_type: eventType, status: "in_progress" });
      if (error) {
        if (error.code === "23505") return "duplicate";
        throw new CertificateError(`Idempotency claim failed: ${error.message}`, "db_error");
      }
      return "claimed";
    },
    async markIdempotencyResult(refId, eventType, status, documentPath) {
      await db.from("certificate_idempotency").update({ status, document_path: documentPath ?? null, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("ref_id", refId).eq("event_type", eventType);
    },
    async audit(refId, eventType, stage, detail) {
      await db.from("certificate_audit_log").insert({ ref_id: refId, event_type: eventType, stage, detail: detail ?? {} });
    },
    async uploadPdf(path3, bytes) {
      const { error } = await db.storage.from("certificates").upload(path3, bytes, {
        contentType: "application/pdf",
        upsert: false
        // idempotency claim already guarantees this path is new
      });
      if (error) throw new CertificateError(`Storage upload failed: ${error.message}`, "storage_error");
      const { data: signed, error: signErr } = await db.storage.from("certificates").createSignedUrl(path3, 60 * 60 * 24 * 30);
      if (signErr || !signed) throw new CertificateError(`Signed URL failed: ${signErr?.message}`, "storage_error");
      return { signedUrl: signed.signedUrl };
    }
  };
}
function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}
function formatRupees(n) {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function mergeFields(activity, submission, eventType) {
  const dateSource = eventType === "certificate_ready" ? activity.performed_at : activity.created_at;
  if (!dateSource) {
    throw new CertificateError("No valid date available to print on the document.", "missing_data");
  }
  const deity = activity.metadata?.["deity_or_temple"] ?? activity.metadata?.["temple_name"] ?? void 0;
  const metadataDevoteeName = typeof activity.metadata?.["devoteeName"] === "string" ? activity.metadata["devoteeName"].trim() : "";
  const base = {
    devoteeName: metadataDevoteeName || (submission?.name ?? "").trim() || "Devotee",
    serviceName: activity.item_name?.trim() || "Sacred Offering",
    deityOrTempleName: deity?.trim() || void 0,
    date: formatDate(dateSource),
    referenceId: activity.ref_id
  };
  if (eventType !== "booking_confirmed") return base;
  const amount = typeof activity.amount === "number" ? activity.amount : 0;
  const taxAmount = typeof activity.metadata?.["tax_amount"] === "number" ? activity.metadata["tax_amount"] : void 0;
  const discountAmount = typeof activity.metadata?.["discount_amount"] === "number" ? activity.metadata["discount_amount"] : void 0;
  const platformFee = typeof activity.metadata?.["platform_fee"] === "number" ? activity.metadata["platform_fee"] : void 0;
  const totalAmount = amount + (taxAmount ?? 0) + (platformFee ?? 0) - (discountAmount ?? 0);
  const methodKey = (activity.payment_method ?? "").trim().toLowerCase();
  const paymentMethodLabel = methodKey ? PAYMENT_METHOD_LABELS[methodKey] ?? activity.payment_method : "UPI";
  return {
    ...base,
    invoiceNumber: `INV-${activity.ref_id}`,
    amount,
    taxAmount,
    discountAmount,
    platformFee,
    totalAmount,
    paymentMethodLabel,
    activityType: activity.activity_type
  };
}
function significanceLineFor(activityType) {
  if (!activityType) return void 0;
  return SIGNIFICANCE_BY_ACTIVITY_TYPE[activityType];
}
function loadBrandIconBytes() {
  if (cachedBrandIconBytes !== void 0) return cachedBrandIconBytes;
  try {
    const iconPath = import_path.default.join(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist" : "public",
      "android-chrome-512x512.png"
    );
    cachedBrandIconBytes = import_fs.default.readFileSync(iconPath);
  } catch {
    console.warn(
      "[certificateService] Brand icon not found at public/android-chrome-512x512.png (or dist/ in prod) \u2014 PDFs will render without it."
    );
    cachedBrandIconBytes = null;
  }
  return cachedBrandIconBytes;
}
function loadQrCodeBytes() {
  if (cachedQrCodeBytes !== void 0) return cachedQrCodeBytes;
  try {
    const qrPath = import_path.default.join(
      process.cwd(),
      process.env.NODE_ENV === "production" ? "dist" : "public",
      "images",
      "SridwarQR.jpg"
    );
    cachedQrCodeBytes = import_fs.default.readFileSync(qrPath);
  } catch {
    console.warn(
      "[certificateService] Website QR code not found at public/images/SridwarQR.jpg (or dist/images/ in prod) \u2014 invoices will render without it."
    );
    cachedQrCodeBytes = null;
  }
  return cachedQrCodeBytes;
}
async function drawMandalaCorner(page, x, y, scale = 1) {
  const petal = (r) => `M 0 0 C ${r * 0.35} ${r * 0.12}, ${r * 0.45} ${r * 0.55}, 0 ${r} C ${-r * 0.45} ${r * 0.55}, ${-r * 0.35} ${r * 0.12}, 0 0 Z`;
  for (let i = 0; i < 8; i++) {
    page.drawSvgPath(petal(20 * scale), {
      x,
      y,
      scale,
      rotate: (0, import_pdf_lib.degrees)(i * 45),
      color: BRAND.saffron,
      opacity: 0.22,
      borderColor: BRAND.gold,
      borderWidth: 0.5,
      borderOpacity: 0.7
    });
  }
  page.drawEllipse({ x, y, xScale: 3.2 * scale, yScale: 3.2 * scale, color: BRAND.saffron });
  page.drawEllipse({ x, y, xScale: 6 * scale, yScale: 6 * scale, borderColor: BRAND.gold, borderWidth: 0.75 });
}
async function drawFrame(page) {
  const { width, height } = page.getSize();
  const margin = 24;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: BRAND.darkGreen,
    borderWidth: 1.4
  });
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - (margin + 10) * 2,
    height: height - (margin + 10) * 2,
    borderColor: BRAND.gold,
    borderWidth: 0.6
  });
  await drawMandalaCorner(page, margin + 10, height - margin - 10);
  await drawMandalaCorner(page, width - margin - 10, height - margin - 10);
  await drawMandalaCorner(page, margin + 10, margin + 10);
  await drawMandalaCorner(page, width - margin - 10, margin + 10);
}
function centeredText(page, text, y, font, size, color = BRAND.darkGreen) {
  const { width } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
}
function centeredTextAt(page, text, centerX, y, font, size, color) {
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - textWidth / 2, y, size, font, color });
}
function fitTextWidth(font, text, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size };
  let truncated = text;
  while (truncated.length > 1 && font.widthOfTextAtSize(`${truncated}\u2026`, size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return { text: `${truncated.trimEnd()}\u2026`, size };
}
function centeredTextFit(page, text, y, font, startSize, minSize, maxWidth, color = BRAND.darkGreen) {
  const { width } = page.getSize();
  const fitted = fitTextWidth(font, text, maxWidth, startSize, minSize);
  const textWidth = font.widthOfTextAtSize(fitted.text, fitted.size);
  page.drawText(fitted.text, { x: (width - textWidth) / 2, y, size: fitted.size, font, color });
}
function leftTextFit(page, text, x, y, font, startSize, minSize, maxWidth, color) {
  const fitted = fitTextWidth(font, text, maxWidth, startSize, minSize);
  page.drawText(fitted.text, { x, y, size: fitted.size, font, color });
}
async function renderCertificatePdf(kind, fields) {
  const doc = await import_pdf_lib.PDFDocument.create();
  const page = doc.addPage([595.28, 419.53]);
  const serif = await doc.embedFont(import_pdf_lib.StandardFonts.TimesRomanBold);
  const serifRegular = await doc.embedFont(import_pdf_lib.StandardFonts.TimesRoman);
  const serifItalic = await doc.embedFont(import_pdf_lib.StandardFonts.TimesRomanItalic);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: 0, width, height, color: BRAND.cream });
  await drawFrame(page);
  const iconBytes = loadBrandIconBytes();
  if (iconBytes) {
    try {
      const iconImage = await doc.embedPng(iconBytes);
      const iconH = 24;
      const iconW = iconImage.width * (iconH / iconImage.height);
      page.drawImage(iconImage, { x: (width - iconW) / 2, y: height - 36 - iconH, width: iconW, height: iconH });
    } catch {
    }
  }
  centeredText(page, BRAND.name.toUpperCase(), height - 76, serif, 14, BRAND.darkGreen);
  centeredText(page, BRAND.tagline, height - 93, serifItalic, 9, BRAND.textMuted);
  centeredText(page, TEMPLATE_TITLES[kind], height - 140, serif, 22, BRAND.saffron);
  const bodyLine1 = kind === "booking_confirmation" ? `This confirms that ${fields.devoteeName}'s booking for` : `This is to certify that ${fields.devoteeName}'s`;
  centeredTextFit(page, bodyLine1, height - 190, serifRegular, 13, 9, width - 68);
  const serviceLine = fields.deityOrTempleName ? `${fields.serviceName} \u2014 ${fields.deityOrTempleName}` : fields.serviceName;
  centeredTextFit(page, serviceLine, height - 215, serif, 16, 10, width - 68, BRAND.darkGreen);
  const bodyLine2 = kind === "booking_confirmation" ? `has been received and confirmed as of ${fields.date}.` : `was performed with devotion on ${fields.date}.`;
  centeredText(page, bodyLine2, height - 240, serifRegular, 13);
  const shloka = SHLOKA_BY_KIND[kind];
  centeredText(page, `"${shloka.translitAscii}" \u2014 ${shloka.attribution}`, height - 262, serifItalic, 7.5, BRAND.textMuted);
  centeredText(page, RELATED_SERVICES_LINE, height - 275, serifRegular, 6.5, BRAND.textMuted);
  centeredText(page, STONE_ENGRAVING_LINE_PDF_COMPACT, height - 286, serifItalic, 6, BRAND.textMuted);
  centeredText(page, `Reference: ${fields.referenceId}`, 70, serifRegular, 10, BRAND.textMuted);
  centeredText(page, "sridwar.com", 55, serifItalic, 9, BRAND.textMuted);
  return doc.save();
}
async function renderInvoicePdf(fields) {
  const doc = await import_pdf_lib.PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const sans = await doc.embedFont(import_pdf_lib.StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(import_pdf_lib.StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(import_pdf_lib.StandardFonts.HelveticaOblique);
  const margin = 48;
  const contentWidth = width - margin * 2;
  let y = height - margin;
  const text = (t, x, yy, opts = {}) => {
    const size = opts.size ?? 10;
    const font = opts.font ?? sans;
    const color = opts.color ?? BRAND.darkGreen;
    const drawX = opts.align === "right" ? x - font.widthOfTextAtSize(t, size) : x;
    page.drawText(t, { x: drawX, y: yy, size, font, color });
  };
  const rule = (yy, color = BRAND.gold, thickness = 0.75) => page.drawRectangle({ x: margin, y: yy, width: contentWidth, height: thickness, color });
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: BRAND.darkGreen });
  let headerTextX = margin;
  const iconBytes = loadBrandIconBytes();
  if (iconBytes) {
    try {
      const iconImage = await doc.embedPng(iconBytes);
      const iconH = 34;
      const iconW = iconImage.width * (iconH / iconImage.height);
      page.drawImage(iconImage, { x: margin, y: height - 62, width: iconW, height: iconH });
      headerTextX = margin + iconW + 12;
    } catch {
    }
  }
  text(BRAND.name.toUpperCase(), headerTextX, height - 42, { size: 20, font: sansBold, color: BRAND.white });
  text(BRAND.tagline, headerTextX, height - 60, { size: 9, font: sans, color: BRAND.gold });
  text("PAYMENT CONFIRMATION / INVOICE", width - margin, height - 42, {
    size: 13,
    font: sansBold,
    color: BRAND.white,
    align: "right"
  });
  text("Shradhalu Private Limited", width - margin, height - 60, { size: 9, font: sans, color: BRAND.gold, align: "right" });
  text("Jajpur Road, Odisha, India", width - margin, height - 73, { size: 9, font: sans, color: BRAND.gold, align: "right" });
  y = height - 96 - 32;
  text("BILL TO", margin, y, { size: 8, font: sansBold, color: BRAND.textMuted });
  text("INVOICE DETAILS", width / 2 + 10, y, { size: 8, font: sansBold, color: BRAND.textMuted });
  y -= 16;
  leftTextFit(page, fields.devoteeName, margin, y, sansBold, 12, 8, width / 2 - margin - 6, BRAND.darkGreen);
  text(`Invoice #: ${fields.invoiceNumber}`, width / 2 + 10, y, { size: 10, font: sans });
  y -= 15;
  text(`Reference: ${fields.referenceId}`, width / 2 + 10, y, { size: 10, font: sans });
  y -= 15;
  text(`Date: ${fields.date}`, width / 2 + 10, y, { size: 10, font: sans });
  y -= 28;
  rule(y);
  y -= 24;
  const col2 = width - margin - 110;
  text("DESCRIPTION", margin, y, { size: 8, font: sansBold, color: BRAND.textMuted });
  text("AMOUNT", width - margin, y, { size: 8, font: sansBold, color: BRAND.textMuted, align: "right" });
  y -= 10;
  rule(y);
  y -= 20;
  const serviceLine = fields.deityOrTempleName ? `${fields.serviceName} \u2014 ${fields.deityOrTempleName}` : fields.serviceName;
  leftTextFit(page, serviceLine, margin, y, sansBold, 11, 8, contentWidth - 140, BRAND.darkGreen);
  text(formatRupees(fields.amount ?? 0), width - margin, y, { size: 11, font: sans, align: "right" });
  y -= 16;
  const significance = significanceLineFor(fields.activityType);
  if (significance) {
    text(significance, margin, y, { size: 8.5, font: italic, color: BRAND.textMuted });
    y -= 14;
  }
  y -= 10;
  rule(y, BRAND.textMuted, 0.5);
  y -= 22;
  const totalsRow = (label, value, opts = {}) => {
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
    align: "right"
  });
  y -= 34;
  text(`Payment Method: ${fields.paymentMethodLabel ?? "UPI"}`, margin, y, { size: 10, font: sans });
  const stampLabel = "PAYMENT CONFIRMED";
  const stampFontSize = 8.5;
  const stampTextWidth = sansBold.widthOfTextAtSize(stampLabel, stampFontSize);
  const stampBoxWidth = stampTextWidth + 20;
  page.drawRectangle({ x: width - margin - stampBoxWidth, y: y - 6, width: stampBoxWidth, height: 22, color: (0, import_pdf_lib.rgb)(0.09, 0.42, 0.24) });
  text(stampLabel, width - margin - 10, y, { size: stampFontSize, font: sansBold, color: BRAND.white, align: "right" });
  y -= 40;
  rule(y);
  y -= 16;
  const disclaimer = "Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, and temple rituals. This document confirms receipt of payment as recorded above and serves as your official proof of booking/payment. For queries, contact puja@sridwar.com.";
  const drawWrapped = (t, size, useFont, color, lineGap) => {
    const words = t.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (useFont.widthOfTextAtSize(candidate, size) > contentWidth) {
        text(line, margin, y, { size, font: useFont, color });
        y -= lineGap;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      text(line, margin, y, { size, font: useFont, color });
      y -= lineGap;
    }
  };
  drawWrapped(disclaimer, 8, italic, BRAND.textMuted, 11);
  y -= 6;
  const invoiceShloka = SHLOKA_BY_KIND.booking_confirmation;
  drawWrapped(`"${invoiceShloka.translitAscii}" \u2014 ${invoiceShloka.attribution}. "${invoiceShloka.meaning}"`, 8, italic, BRAND.darkGreen, 11);
  y -= 4;
  drawWrapped(RELATED_SERVICES_LINE, 8, sans, BRAND.textMuted, 11);
  y -= 4;
  drawWrapped(STONE_ENGRAVING_LINE_PDF, 8, italic, BRAND.textMuted, 11);
  y -= 6;
  const qrBytes = loadQrCodeBytes();
  let footerTextWidth = contentWidth;
  if (qrBytes) {
    try {
      const qrImage = await doc.embedJpg(qrBytes);
      const qrSize = 46;
      footerTextWidth = contentWidth - qrSize - 12;
      const qrX = width - margin - qrSize;
      page.drawImage(qrImage, { x: qrX, y: y - qrSize + 8, width: qrSize, height: qrSize });
      centeredTextAt(page, "Scan to visit", qrX + qrSize / 2, y - qrSize - 2, sans, 6, BRAND.textMuted);
    } catch {
    }
  }
  const contactLine1 = "Shradhalu Private Limited \xB7 sridwar.com \xB7 puja@sridwar.com";
  const contactLine2 = "WhatsApp: wa.me/message/325QR2O5II3IH1 \xB7 Instagram/Facebook/YouTube: @sridwar";
  page.drawText(contactLine1, { x: margin, y, size: 8, font: sans, color: BRAND.textMuted, maxWidth: footerTextWidth });
  y -= 11;
  page.drawText(contactLine2, { x: margin, y, size: 8, font: sans, color: BRAND.textMuted, maxWidth: footerTextWidth });
  return doc.save();
}
function buildEmailPayload(eventType, kind, fields, toEmail, pdfBytes) {
  const subject = eventType === "booking_confirmed" ? `Sri Dwar \u2014 Payment Confirmed & Invoice (${fields.referenceId})` : `Sri Dwar \u2014 Your ${TEMPLATE_TITLES[kind]} is Ready`;
  const bodyHtml = `
    <div style="font-family:Georgia,serif;background:#fbf6ec;padding:24px;color:#0c2b26;">
      <h2 style="color:#0c2b26;">${subject}</h2>
      <p>Dear ${fields.devoteeName},</p>
      <p>${eventType === "booking_confirmed" ? `Your payment for <strong>${fields.serviceName}</strong> has been received and confirmed. The attached PDF is your official invoice and payment confirmation \u2014 please keep it as proof of your booking.` : `Your <strong>${TEMPLATE_TITLES[kind]}</strong> for <strong>${fields.serviceName}</strong> is attached, performed on ${fields.date}.`}</p>
      ${eventType === "booking_confirmed" && typeof fields.totalAmount === "number" ? `<p style="font-size:15px;"><strong>Amount Paid: \u20B9${fields.totalAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2
  })}</strong> via ${fields.paymentMethodLabel ?? "UPI"}</p>` : ""}
      <p style="color:#6b7a76;font-size:13px;">Reference: ${fields.referenceId}${fields.invoiceNumber ? ` \xB7 Invoice: ${fields.invoiceNumber}` : ""}<br/>Sri Dwar \u2014 Connect. Contribute. Preserve.</p>
      ${(() => {
    const s = SHLOKA_BY_KIND[kind];
    return `
      <div style="margin-top:18px;padding:14px 16px;background:#fbf6ec;border-left:3px solid #e8a33d;border-radius:0 8px 8px 0;">
        <div style="font-size:15px;color:#0c2b26;font-weight:bold;">${s.sa}</div>
        <div style="font-size:11px;color:#6b7a76;font-style:italic;margin-top:2px;">${s.translit}</div>
        <div style="font-size:12px;color:#444;margin-top:6px;line-height:1.6;">&#8220;${s.meaning}&#8221; \u2014 ${s.attribution}</div>
      </div>
      <div style="font-size:12px;color:#444;line-height:1.7;margin-top:16px;">${RELATED_SERVICES_LINE_HTML}</div>
      <div style="font-size:11px;color:#6b7a76;line-height:1.7;margin-top:14px;padding-top:12px;border-top:1px dashed #e7ddc7;">${STONE_ENGRAVING_LINE_HTML}</div>`;
  })()}
    </div>`;
  return {
    to: toEmail,
    subject,
    bodyHtml,
    attachmentBase64: Buffer.from(pdfBytes).toString("base64"),
    attachmentFilename: `${fields.referenceId}-${kind}.pdf`,
    refId: fields.referenceId,
    emailType: eventType === "booking_confirmed" ? "webhook_invoice_booking_confirmed" : "webhook_invoice_certificate_ready"
  };
}
async function dispatchEmail(payload) {
  const webhookUrl = process.env.GAS_EMAIL_WEBHOOK_URL;
  const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!webhookUrl) {
    return {
      status: "skipped",
      reason: "GAS_EMAIL_WEBHOOK_URL is not set on this server. No email was even attempted. Set it, on Render, to your Apps Script Web App's /exec URL (see Webhook.gs setup steps)."
    };
  }
  if (!webhookSecret) {
    throw new CertificateError(
      "GAS_EMAIL_WEBHOOK_URL is set but EMAIL_WEBHOOK_SECRET is not \u2014 Webhook.gs will reject every request without it.",
      "config_missing"
    );
  }
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, secret: webhookSecret })
  });
  if (!res.ok) throw new CertificateError(`Email webhook responded ${res.status}`, "email_error");
  const json = await res.json();
  if (!json.ok) throw new CertificateError(`Email webhook rejected the request: ${json.error}`, "email_error");
  if (json.sent) return { status: "sent" };
  return {
    status: "skipped",
    reason: "Webhook.gs received the request and returned ok, but did not actually send (its own dedupe log, invalid-looking email address, or daily quota). Check Email_Send_Log / Email_Errors in the tracking spreadsheet for this refId."
  };
}
async function runPipeline(refId, eventType, port, guard) {
  const activity = await port.getActivityByRefId(refId);
  if (!activity) throw new CertificateError(`No booking found for ref_id "${refId}".`, "not_found");
  guard(activity);
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
    const path3 = `${refId}/${eventType}.pdf`;
    const { signedUrl } = await port.uploadPdf(path3, pdfBytes);
    let emailStatus = "skipped";
    const toEmail = submission?.email;
    if (toEmail) {
      const payload = buildEmailPayload(eventType, kind, fields, toEmail, pdfBytes);
      try {
        const dispatchResult = await dispatchEmail(payload);
        emailStatus = dispatchResult.status;
        await port.audit(refId, eventType, emailStatus === "sent" ? "email_sent" : "email_skipped", {
          toEmail,
          ...dispatchResult.reason ? { reason: dispatchResult.reason } : {}
        });
      } catch (err) {
        await port.audit(refId, eventType, "email_failed", { error: err.message });
      }
    } else {
      await port.audit(refId, eventType, "email_skipped", { reason: "no email on file" });
    }
    await port.markIdempotencyResult(refId, eventType, "sent", path3);
    return { status: "generated", documentUrl: signedUrl, emailStatus };
  } catch (err) {
    await port.markIdempotencyResult(refId, eventType, "failed");
    await port.audit(refId, eventType, "pdf_generation_failed", { error: err.message });
    throw err;
  }
}
async function generateBookingConfirmationPdf(refId, port = createSupabaseDataPort()) {
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
async function generateCertificatePdf(refId, port = createSupabaseDataPort()) {
  return runPipeline(refId, "certificate_ready", port, (activity) => {
    if (activity.completion_status !== "completed" || !activity.performed_at) {
      void port.audit(refId, "certificate_ready", "completion_rejected", {
        completion_status: activity.completion_status,
        performed_at: activity.performed_at
      });
      throw new CertificateError(
        `Certificate refused: service not marked completed (completion_status="${activity.completion_status}", performed_at=${activity.performed_at ?? "null"}). Payment status is irrelevant to this check.`,
        "not_completed"
      );
    }
    void port.audit(refId, "certificate_ready", "completion_verified", { performed_at: activity.performed_at });
  });
}
function registerCertificateAdminRoutes(app2) {
  const requireSecret = (req, res, next) => {
    const secret = process.env.CERTIFICATE_ADMIN_SECRET;
    if (!secret || req.headers["x-admin-secret"] !== secret) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    next();
  };
  app2.post("/api/admin/certificates/booking-confirmation", (req, res) => {
    requireSecret(req, res, async () => {
      try {
        const result = await generateBookingConfirmationPdf(req.body?.refId);
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: err.message, code: err.code });
      }
    });
  });
  app2.post("/api/admin/certificates/certificate", (req, res) => {
    requireSecret(req, res, async () => {
      try {
        const result = await generateCertificatePdf(req.body?.refId);
        res.json(result);
      } catch (err) {
        res.status(400).json({ error: err.message, code: err.code });
      }
    });
  });
}
function makeFakePort() {
  const activities = /* @__PURE__ */ new Map();
  const submissions = /* @__PURE__ */ new Map();
  const idempotency = /* @__PURE__ */ new Map();
  const auditLog = [];
  const uploads = /* @__PURE__ */ new Map();
  const port = {
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
    async uploadPdf(path3, bytes) {
      uploads.set(path3, bytes);
      return { signedUrl: `https://fake.local/${path3}` };
    }
  };
  return { port, activities, submissions, auditLog, uploads };
}
async function runCertificateSelfTests() {
  let passed = 0;
  let failed = 0;
  const check = (label, cond) => {
    console.log(`${cond ? "PASS" : "FAIL"} \u2014 ${label}`);
    cond ? passed++ : failed++;
  };
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: { deity_or_temple: "Lord Shiva, Kashi Vishwanath" }
    });
    submissions.set("SDP-001", { name: "Aarav Sharma", email: "aarav@example.com" });
    const result = await generateBookingConfirmationPdf("SDP-001", port);
    check("TEST 1: payment confirmed -> PDF generated", result.status === "generated");
    check("TEST 1: PDF bytes saved to storage", uploads.has("SDP-001/booking_confirmed.pdf"));
  }
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: null
    });
    submissions.set("SDP-002", { name: "Priya", email: "priya@example.com" });
    let threw = false;
    try {
      await generateBookingConfirmationPdf("SDP-002", port);
    } catch (e) {
      threw = e.code === "payment_not_confirmed";
    }
    check("TEST 2: payment pending -> refused", threw);
  }
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: null
    });
    let threw = false;
    try {
      await generateBookingConfirmationPdf("SDP-003", port);
    } catch (e) {
      threw = e.code === "payment_not_confirmed";
    }
    check("TEST 3: payment failed -> refused", threw);
  }
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: null
    });
    submissions.set("SDP-004", { name: "Devi", email: "devi@example.com" });
    const first = await generateBookingConfirmationPdf("SDP-004", port);
    const second = await generateBookingConfirmationPdf("SDP-004", port);
    check("TEST 4: first call generates", first.status === "generated");
    check("TEST 4: duplicate call skipped", second.status === "duplicate_skipped");
    check("TEST 4: only one PDF stored", uploads.size === 1);
  }
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: null
    });
    submissions.set("SDP-005", { name: null, email: "anon@example.com" });
    const result = await generateBookingConfirmationPdf("SDP-005", port);
    check("TEST 5: missing name does not block generation", result.status === "generated");
  }
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: null
    });
    let threw = false;
    try {
      await generateCertificatePdf("SDP-006", port);
    } catch (e) {
      threw = e.code === "not_completed";
    }
    check("TEST 6: paid-but-not-performed -> certificate refused", threw);
  }
  {
    for (const [activityType, kindLabel] of [
      ["puja", "puja"],
      ["seva", "seva"],
      ["darshan_certificate", "darshan"]
    ]) {
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
        performed_at: (/* @__PURE__ */ new Date()).toISOString(),
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        metadata: { deity_or_temple: "Test Deity" }
      });
      submissions.set(refId, { name: "Test Devotee", email: "test@example.com" });
      const result = await generateCertificatePdf(refId, port);
      check(`TEST 7: completed '${kindLabel}' -> certificate generated`, result.status === "generated");
    }
  }
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
      performed_at: (/* @__PURE__ */ new Date()).toISOString(),
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: null
    });
    let threw = false;
    try {
      await generateCertificatePdf("SDP-008", port);
    } catch {
      threw = true;
    }
    check("TEST 8: unsupported activity_type -> clean rejection", threw);
  }
  {
    const fields = {
      devoteeName: "Test Devotee",
      serviceName: "Test Puja",
      date: "1 January 2026",
      referenceId: "SDP-009"
    };
    const pdfBytes = await renderCertificatePdf("puja", fields);
    const payload = buildEmailPayload("certificate_ready", "puja", fields, "test@example.com", pdfBytes);
    check("TEST 9: PDF bytes non-empty", pdfBytes.length > 500);
    check("TEST 9: email payload has base64 attachment", payload.attachmentBase64.length > 100);
    check("TEST 9: attachment filename includes reference id", payload.attachmentFilename.includes("SDP-009"));
  }
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
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      metadata: { deity_or_temple: "Lord Shiva" }
    });
    submissions.set("SDP-010", { name: "Meera Nair", email: "meera@example.com" });
    const result = await generateBookingConfirmationPdf("SDP-010", port);
    check("TEST 10a: invoice generates for confirmed payment", result.status === "generated");
    const activity010 = activities.get("SDP-010");
    const fields010 = mergeFields(activity010, submissions.get("SDP-010"), "booking_confirmed");
    check("TEST 10b: amount merged correctly", fields010.amount === 1100);
    check("TEST 10c: totalAmount = amount when no tax/fee/discount", fields010.totalAmount === 1100);
    check("TEST 10d: taxAmount omitted (not fabricated as 0)", fields010.taxAmount === void 0);
    check("TEST 10e: invoiceNumber derived from ref_id", fields010.invoiceNumber === "INV-SDP-010");
    check("TEST 10f: UPI payment method label", fields010.paymentMethodLabel === "UPI");
    const activityWithCharges = {
      ...activity010,
      ref_id: "SDP-010b",
      metadata: { tax_amount: 50, platform_fee: 20, discount_amount: 100 }
    };
    const fieldsWithCharges = mergeFields(activityWithCharges, submissions.get("SDP-010"), "booking_confirmed");
    check("TEST 10g: total = amount + tax + platformFee - discount", fieldsWithCharges.totalAmount === 1100 + 50 + 20 - 100);
    const certFields = mergeFields(
      { ...activity010, performed_at: (/* @__PURE__ */ new Date()).toISOString() },
      submissions.get("SDP-010"),
      "certificate_ready"
    );
    check("TEST 10h: certificate merge has no invoiceNumber", certFields.invoiceNumber === void 0);
    check("TEST 10i: certificate merge has no amount", certFields.amount === void 0);
    const pdfBytes = await renderInvoicePdf(fields010);
    check("TEST 10j: invoice PDF renders non-trivial bytes", pdfBytes.length > 800);
  }
  console.log(`
${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}
var import_fs, import_path, import_pdf_lib, import_supabase_js, BRAND, SHLOKA_BY_KIND, RELATED_SERVICES_LINE, RELATED_SERVICES_LINE_HTML, STONE_ENGRAVING_LINE_PDF, STONE_ENGRAVING_LINE_PDF_COMPACT, STONE_ENGRAVING_LINE_HTML, TEMPLATE_TITLES, CertificateError, cachedSupabaseAdmin, PAYMENT_METHOD_LABELS, SIGNIFICANCE_BY_ACTIVITY_TYPE, cachedBrandIconBytes, cachedQrCodeBytes;
var init_certificateService = __esm({
  "certificateService.ts"() {
    "use strict";
    import_fs = __toESM(require("fs"), 1);
    import_path = __toESM(require("path"), 1);
    import_pdf_lib = require("pdf-lib");
    import_supabase_js = require("@supabase/supabase-js");
    BRAND = {
      name: "Sri Dwar",
      tagline: "Connect. Contribute. Preserve.",
      darkGreen: (0, import_pdf_lib.rgb)(12 / 255, 43 / 255, 38 / 255),
      darkGreenEnd: (0, import_pdf_lib.rgb)(18 / 255, 56 / 255, 50 / 255),
      saffron: (0, import_pdf_lib.rgb)(232 / 255, 163 / 255, 61 / 255),
      gold: (0, import_pdf_lib.rgb)(244 / 255, 197 / 255, 99 / 255),
      cream: (0, import_pdf_lib.rgb)(251 / 255, 246 / 255, 236 / 255),
      textMuted: (0, import_pdf_lib.rgb)(107 / 255, 122 / 255, 118 / 255),
      white: (0, import_pdf_lib.rgb)(1, 1, 1)
    };
    SHLOKA_BY_KIND = {
      booking_confirmation: {
        sa: "\u092F\u0924\u094D\u0915\u0930\u094B\u0937\u093F \u092F\u0926\u0936\u094D\u0928\u093E\u0938\u093F \u092F\u091C\u094D\u091C\u0941\u0939\u094B\u0937\u093F \u0926\u0926\u093E\u0938\u093F \u092F\u0924\u094D",
        translit: "Yat karo\u1E63i yad a\u015Bn\u0101si yaj juho\u1E63i dad\u0101si yat",
        translitAscii: "Yat karoshi yad ashnasi yaj juhoshi dadasi yat",
        meaning: "Whatever you do, whatever you eat, whatever you offer, whatever you give, do it as an offering.",
        attribution: "Bhagavad Gita 9.27"
      },
      puja: {
        sa: "\u092A\u0924\u094D\u0930\u0902 \u092A\u0941\u0937\u094D\u092A\u0902 \u092B\u0932\u0902 \u0924\u094B\u092F\u0902 \u092F\u094B \u092E\u0947 \u092D\u0915\u094D\u0924\u094D\u092F\u093E \u092A\u094D\u0930\u092F\u091A\u094D\u091B\u0924\u093F",
        translit: "Patra\u1E41 pu\u1E63pa\u1E41 phala\u1E41 toya\u1E41 yo me bhakty\u0101 pray\u0101cchati",
        translitAscii: "Patram pushpam phalam toyam yo me bhaktya prayachchati",
        meaning: "Whoever offers Me a leaf, a flower, a fruit, or water with devotion, I accept it.",
        attribution: "Bhagavad Gita 9.26"
      },
      seva: {
        sa: "\u0924\u0938\u094D\u092E\u093E\u0926\u0938\u0915\u094D\u0924\u0903 \u0938\u0924\u0924\u0902 \u0915\u093E\u0930\u094D\u092F\u0902 \u0915\u0930\u094D\u092E \u0938\u092E\u093E\u091A\u0930",
        translit: "Tasm\u0101d asakta\u1E25 satata\u1E41 k\u0101rya\u1E41 karma sam\u0101cara",
        translitAscii: "Tasmad asaktah satatam karyam karma samachara",
        meaning: "Therefore, without attachment, perform your duty at all times.",
        attribution: "Bhagavad Gita 3.19"
      },
      darshan: {
        sa: "\u092F\u094B \u092E\u093E\u0902 \u092A\u0936\u094D\u092F\u0924\u093F \u0938\u0930\u094D\u0935\u0924\u094D\u0930 \u0938\u0930\u094D\u0935\u0902 \u091A \u092E\u092F\u093F \u092A\u0936\u094D\u092F\u0924\u093F",
        translit: "Yo m\u0101\u1E41 pa\u015Byati sarvatra sarva\u1E41 ca mayi pa\u015Byati",
        translitAscii: "Yo mam pashyati sarvatra sarvam cha mayi pashyati",
        meaning: "One who sees Me everywhere, and sees everything in Me.",
        attribution: "Bhagavad Gita 6.30"
      }
    };
    RELATED_SERVICES_LINE = "Also open to devotees: the Veer Raksha Kavach Puja, the Traditional Red-Cloth & Coconut Offering, and the voluntary Stone-Name Engraving Seva.";
    RELATED_SERVICES_LINE_HTML = "Whenever your heart calls you back, Sri Dwar is also here for the <strong>Veer Raksha Kavach Puja</strong> (a rite of protection and courage), the <strong>Traditional Red-Cloth &amp; Coconut Offering</strong> at the temple of your choice, and the <strong>Stone-Name Engraving Seva</strong> \u2014 each offered with the same care as this one.";
    STONE_ENGRAVING_LINE_PDF = "Separately, and by choice, some devotees also take part in our Stone-Name Engraving Seva: contributions above Rs. 200 may include a name lovingly engraved on a stone slab placed within a temple we serve. Entirely voluntary \u2014 sridwar.com.";
    STONE_ENGRAVING_LINE_PDF_COMPACT = "Some devotees also choose our voluntary Stone-Name Engraving Seva \u2014 a name engraved in stone, entirely by choice. sridwar.com";
    STONE_ENGRAVING_LINE_HTML = '&#128591; Separately, and entirely by choice, some devotees also take part in our Stone-Name Engraving Seva: contributions above &#8377;200 include the opportunity for a name to be lovingly inscribed on a stone slab placed within a temple we serve; contributions above &#8377;1,000 are placed on a more exclusive slab. This remains entirely voluntary, and never a condition of anything above. Read more at <a href="https://sridwar.com" style="color:#e8a33d;">sridwar.com</a>.';
    TEMPLATE_TITLES = {
      booking_confirmation: "Booking Confirmation",
      puja: "Certificate of Puja Performed",
      seva: "Certificate of Seva Sponsorship",
      darshan: "Certificate of Darshan"
    };
    CertificateError = class extends Error {
      constructor(message, code = "certificate_error") {
        super(message);
        this.code = code;
        this.name = "CertificateError";
      }
    };
    cachedSupabaseAdmin = null;
    PAYMENT_METHOD_LABELS = {
      upi: "UPI",
      gpay: "Google Pay (UPI)",
      phonepe: "PhonePe (UPI)",
      paytm: "Paytm (UPI)",
      bank_transfer: "Bank Transfer"
    };
    SIGNIFICANCE_BY_ACTIVITY_TYPE = {
      puja: "A puja booked to be performed with devotion at your chosen temple, per the selected sankalpa.",
      seva: "A seva sponsorship supporting ongoing temple service and upkeep, offered in your name.",
      product: "A traditional offering item from the Sri Dwar Bazaar, sourced for devotional and ritual use.",
      wellness: "An enrollment in a Holistic Wellness & Yogic Sciences session or program.",
      other: "A Counselling & Guidance session booked with a Sri Dwar-affiliated expert.",
      darshan_certificate: "A Temple Visit / Darshan Certificate contribution, commemorating your visit.",
      contribution: "A voluntary contribution toward Sri Dwar's temple-preservation and community work.",
      temple_registration: "A temple or priest registration submission with Sri Dwar's network.",
      subscription: "A Refer & Earn subscription plan enrollment."
    };
    if (process.argv.includes("--selftest")) {
      runCertificateSelfTests();
    }
  }
});

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = __toESM(require("fs"), 1);
var import_helmet = __toESM(require("helmet"), 1);
var import_zod = require("zod");
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_supabase_js2 = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var REF_SUFFIX_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
function randomRefSuffix(length = 6) {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += REF_SUFFIX_ALPHABET[Math.floor(Math.random() * REF_SUFFIX_ALPHABET.length)];
  }
  return out;
}
app.use(
  (0, import_helmet.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);
app.use(import_express.default.json());
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof import_zod.ZodError) {
        res.status(400).json({
          error: "Invalid request.",
          details: err.errors.map((e) => `${e.path.join(".") || "body"}: ${e.message}`)
        });
        return;
      }
      res.status(400).json({ error: "Invalid request." });
    }
  };
}
var AUDIT_LOG_PATH = import_path2.default.join(process.cwd(), "audit.log");
function appendAuditLog(event, details) {
  const entry = {
    event,
    at: (/* @__PURE__ */ new Date()).toISOString(),
    ...details
  };
  console.log(`[Audit] ${event}:`, JSON.stringify(entry));
  try {
    import_fs2.default.appendFile(AUDIT_LOG_PATH, JSON.stringify(entry) + "\n", (err) => {
      if (err) console.error("[Audit] Failed to write audit.log:", err.message);
    });
  } catch (err) {
    console.error("[Audit] Failed to write audit.log:", err?.message);
  }
}
var supabaseAdminClient = null;
function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  if (!supabaseAdminClient) {
    supabaseAdminClient = (0, import_supabase_js2.createClient)(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
  }
  return supabaseAdminClient;
}
var aiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
var ASSISTANT_RATE_LIMIT = 20;
var ASSISTANT_RATE_WINDOW_MS = 10 * 60 * 1e3;
var assistantRequestLog = /* @__PURE__ */ new Map();
function isRateLimited(ip) {
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
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of assistantRequestLog.entries()) {
    const fresh = timestamps.filter((t) => now - t < ASSISTANT_RATE_WINDOW_MS);
    if (fresh.length === 0) assistantRequestLog.delete(ip);
    else assistantRequestLog.set(ip, fresh);
  }
}, ASSISTANT_RATE_WINDOW_MS).unref?.();
var assistantRequestSchema = import_zod.z.object({
  message: import_zod.z.string().min(1, "Message is required").max(2e3, "Message is too long."),
  history: import_zod.z.array(
    import_zod.z.object({
      role: import_zod.z.string().optional(),
      text: import_zod.z.string().optional()
    }).passthrough()
  ).optional()
}).passthrough();
app.post("/api/assistant", validateBody(assistantRequestSchema), async (req, res) => {
  const clientIp = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(clientIp)) {
    res.status(429).json({
      error: "Too many requests to the Devotee Assistant. Please wait a few minutes and try again."
    });
    return;
  }
  const { message, history } = req.body;
  if (!message) {
    res.status(400).json({ error: "Message is required" });
    return;
  }
  if (typeof message !== "string" || message.length > 2e3) {
    res.status(400).json({ error: "Message is too long." });
    return;
  }
  const ai = getGeminiClient();
  if (!ai) {
    const query = message.toLowerCase();
    let reply = "Hari Om! \u{1F64F} Our AI Devotee Assistant is in localized mode. ";
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
        temperature: 0.7
      }
    });
    res.json({ text: response.text || "May peace be with you." });
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    res.status(500).json({ error: "Failed to generate spiritual response", details: error.message });
  }
});
var refundRequestSchema = import_zod.z.object({
  requestRefId: import_zod.z.string().min(1),
  bookingRefId: import_zod.z.string().min(1),
  itemName: import_zod.z.string().min(1),
  amount: import_zod.z.union([import_zod.z.number(), import_zod.z.string()]),
  devoteeName: import_zod.z.string().min(1),
  devoteeEmail: import_zod.z.string().min(1),
  devoteePhone: import_zod.z.string().min(1),
  reason: import_zod.z.string().min(1)
}).passthrough();
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
    reason
  });
  res.json({ status: "received", requestRefId });
});
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
    ENTRY_INQUIRY_MESSAGE: process.env.ENTRY_INQUIRY_MESSAGE || ""
  });
});
var submitFormRequestSchema = import_zod.z.object({
  formType: import_zod.z.string().min(1, "formType is required"),
  formData: import_zod.z.record(import_zod.z.any()).optional().default({})
}).passthrough();
app.post("/api/submit-form", validateBody(submitFormRequestSchema), (req, res) => {
  const { formType, formData } = req.body;
  console.log(`[Form Received - ${formType}]:`, JSON.stringify(formData, null, 2));
  const refId = `SD-${randomRefSuffix()}`;
  appendAuditLog("form_submission", { formType, refId });
  res.json({
    status: "received",
    message: "Form submission received.",
    syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
    refId
  });
});
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
      error: "Account deletion is temporarily unavailable. Please email puja@sridwar.com and we'll complete it for you within 30 days."
    });
    return;
  }
  try {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      res.status(401).json({ error: "Your session is invalid or has expired. Please log in again and retry." });
      return;
    }
    const userId = userData.user.id;
    const tablesToClean = [
      { table: "family_members", column: "user_id" },
      { table: "activities", column: "user_id" },
      { table: "form_submissions", column: "user_id" },
      { table: "profiles", column: "id" }
    ];
    for (const { table, column } of tablesToClean) {
      const { error: deleteError } = await supabaseAdmin.from(table).delete().eq(column, userId);
      if (deleteError) {
        console.error(`Account deletion: failed to clear "${table}" for user ${userId}:`, deleteError.message);
      }
    }
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error(`Account deletion: failed to delete auth user ${userId}:`, deleteUserError.message);
      appendAuditLog("account_deletion_failed", { userId, reason: deleteUserError.message });
      res.status(500).json({
        error: "We removed your saved data but couldn't finish deleting your login. Please email puja@sridwar.com to complete this."
      });
      return;
    }
    console.log(`Account deletion: user ${userId} and associated data deleted successfully.`);
    appendAuditLog("account_deletion_succeeded", { userId });
    res.json({ status: "deleted" });
  } catch (error) {
    console.error("Account deletion error:", error);
    appendAuditLog("account_deletion_error", { message: error?.message || "unknown error" });
    res.status(500).json({
      error: "Something went wrong deleting your account. Please email puja@sridwar.com and we'll complete it for you within 30 days."
    });
  }
});
function requireCertAdminSecret(req, res) {
  const configured = process.env.CERTIFICATE_ADMIN_SECRET;
  const provided = req.headers["x-admin-secret"];
  if (!configured || provided !== configured) {
    res.status(401).json({ error: "Unauthorized." });
    return false;
  }
  return true;
}
var markCompletedSchema = import_zod.z.object({
  refId: import_zod.z.string().min(1, "refId is required"),
  // Optional — if the certificate is being sent for a rite performed in the
  // past (e.g. catching up on a backlog), pass the real performed date.
  // Defaults to "now" only when omitted.
  performedAt: import_zod.z.string().datetime().optional()
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
        error: "Supabase is not configured on the server (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
      });
      return;
    }
    try {
      const { error: updateError } = await supabaseAdmin.from("activities").update({
        completion_status: "completed",
        performed_at: performedAt || (/* @__PURE__ */ new Date()).toISOString()
      }).eq("ref_id", refId);
      if (updateError) {
        appendAuditLog("certificate_mark_completed_failed", { refId, reason: updateError.message });
        res.status(500).json({ error: `Could not mark booking as completed: ${updateError.message}` });
        return;
      }
      appendAuditLog("certificate_mark_completed", { refId, performedAt: performedAt || (/* @__PURE__ */ new Date()).toISOString() });
      const { generateCertificatePdf: generateCertificatePdf2 } = await Promise.resolve().then(() => (init_certificateService(), certificateService_exports));
      const result = await generateCertificatePdf2(refId);
      appendAuditLog("certificate_generated", { refId, status: result.status, emailStatus: result.emailStatus });
      res.json(result);
    } catch (err) {
      const code = err?.code || "error";
      appendAuditLog("certificate_generation_failed", { refId, code, message: err?.message });
      res.status(code === "not_completed" || code === "payment_not_confirmed" ? 400 : 500).json({
        error: err?.message || "Certificate generation failed.",
        code
      });
    }
  }
);
var sendBookingConfirmationSchema = import_zod.z.object({
  refId: import_zod.z.string().min(1, "refId is required")
});
app.post(
  "/api/admin/certificates/send-booking-confirmation",
  validateBody(sendBookingConfirmationSchema),
  async (req, res) => {
    if (!requireCertAdminSecret(req, res)) return;
    const { refId } = req.body;
    try {
      const { generateBookingConfirmationPdf: generateBookingConfirmationPdf2 } = await Promise.resolve().then(() => (init_certificateService(), certificateService_exports));
      const result = await generateBookingConfirmationPdf2(refId);
      appendAuditLog("booking_confirmation_generated", { refId, status: result.status, emailStatus: result.emailStatus });
      res.json(result);
    } catch (err) {
      const code = err?.code || "error";
      appendAuditLog("booking_confirmation_generation_failed", { refId, code, message: err?.message });
      res.status(code === "payment_not_confirmed" ? 400 : 500).json({
        error: err?.message || "Booking confirmation generation failed.",
        code
      });
    }
  }
);
function requireSupabaseWebhookSecret(req, res) {
  const configured = process.env.SUPABASE_WEBHOOK_SECRET;
  const provided = req.headers["x-supabase-webhook-secret"];
  if (!configured || provided !== configured) {
    res.status(401).json({ error: "Unauthorized." });
    return false;
  }
  return true;
}
var supabaseActivityWebhookSchema = import_zod.z.object({
  type: import_zod.z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: import_zod.z.string(),
  record: import_zod.z.object({
    ref_id: import_zod.z.string().min(1),
    payment_status: import_zod.z.string()
  }).passthrough(),
  old_record: import_zod.z.object({
    payment_status: import_zod.z.string().optional()
  }).passthrough().nullable().optional()
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
      res.json({ ok: true, skipped: "payment_status was already confirmed" });
      return;
    }
    const refId = record.ref_id;
    try {
      const { generateBookingConfirmationPdf: generateBookingConfirmationPdf2 } = await Promise.resolve().then(() => (init_certificateService(), certificateService_exports));
      const result = await generateBookingConfirmationPdf2(refId);
      appendAuditLog("auto_invoice_generated_via_webhook", { refId, status: result.status, emailStatus: result.emailStatus });
      res.json({ ok: true, ...result });
    } catch (err) {
      const code = err?.code || "error";
      appendAuditLog("auto_invoice_generation_failed_via_webhook", { refId, code, message: err?.message });
      res.status(code === "payment_not_confirmed" ? 200 : 500).json({
        error: err?.message || "Automatic invoice generation failed.",
        code
      });
    }
  }
);
var RENDER_FONT_FAMILY = "DejaVu Serif";
var RENDER_FONT_PATH = import_path2.default.join(
  process.cwd(),
  process.env.NODE_ENV === "production" ? "dist" : "public",
  "fonts",
  "DejaVuSerif-Bold.ttf"
);
function escapeSvgText(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
var AVG_BOLD_SERIF_CHAR_WIDTH_RATIO = 0.56;
function fitFontSizeToWidth(text, maxWidth, startSize, minSize) {
  let size = startSize;
  while (size > minSize && text.length * size * AVG_BOLD_SERIF_CHAR_WIDTH_RATIO > maxWidth) {
    size -= 1;
  }
  return size;
}
function truncateToWidth(text, maxWidth, size) {
  const maxChars = Math.max(3, Math.floor(maxWidth / (size * AVG_BOLD_SERIF_CHAR_WIDTH_RATIO)));
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 1).trimEnd() + "\u2026";
}
function fittedTextElement(rawText, x, y, maxWidth, maxSize, minSize, color, anchor = "start") {
  const size = fitFontSizeToWidth(rawText, maxWidth, maxSize, minSize);
  const text = escapeSvgText(truncateToWidth(rawText, maxWidth, size));
  const anchorAttr = anchor === "end" ? ` text-anchor="end"` : anchor === "middle" ? ` text-anchor="middle" dominant-baseline="central"` : "";
  return `<text x="${x}" y="${y}" font-family="${RENDER_FONT_FAMILY}" font-weight="700" font-size="${size}" fill="${color}"${anchorAttr}>${text}</text>`;
}
async function renderTextLayerPng(width, height, textElements) {
  const { Resvg } = await import("@resvg/resvg-js");
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${textElements}</svg>`;
  const resvg = new Resvg(svg, {
    font: {
      fontFiles: [RENDER_FONT_PATH],
      loadSystemFonts: false,
      defaultFontFamily: RENDER_FONT_FAMILY
    },
    background: "rgba(0,0,0,0)"
  });
  return resvg.render().asPng();
}
var EMAIL_TEMPLATE_REFERENCE_SLOT = { x: 727, y: 515, maxWidth: 340, maxSize: 22, minSize: 13 };
var EMAIL_TEMPLATE_DEVOTEE_SLOT = { x: 727, y: 572, maxWidth: 340, maxSize: 22, minSize: 13 };
var EMAIL_TEMPLATE_FIELD_COLOR = "#2b1806";
async function renderInquiryBannerJpeg(name, refId, _label) {
  const sharp = (await import("sharp")).default;
  const imagePath = import_path2.default.join(
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
    refId,
    EMAIL_TEMPLATE_REFERENCE_SLOT.x,
    EMAIL_TEMPLATE_REFERENCE_SLOT.y,
    EMAIL_TEMPLATE_REFERENCE_SLOT.maxWidth,
    EMAIL_TEMPLATE_REFERENCE_SLOT.maxSize,
    EMAIL_TEMPLATE_REFERENCE_SLOT.minSize,
    EMAIL_TEMPLATE_FIELD_COLOR,
    "middle"
  );
  const devoteeEl = fittedTextElement(
    (name || "").trim() || "Devotee",
    EMAIL_TEMPLATE_DEVOTEE_SLOT.x,
    EMAIL_TEMPLATE_DEVOTEE_SLOT.y,
    EMAIL_TEMPLATE_DEVOTEE_SLOT.maxWidth,
    EMAIL_TEMPLATE_DEVOTEE_SLOT.maxSize,
    EMAIL_TEMPLATE_DEVOTEE_SLOT.minSize,
    EMAIL_TEMPLATE_FIELD_COLOR,
    "middle"
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
  } catch (err) {
    appendAuditLog("inquiry_banner_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(500).json({ error: "Could not render the acknowledgement banner image." });
  }
});
var TEMPLE_CERT_NAME_SLOT = { x: 767, y: 392, maxWidth: 560, maxSize: 30, minSize: 16 };
var TEMPLE_CERT_TEMPLE_SLOT = { x: 767, y: 452, maxWidth: 560, maxSize: 26, minSize: 14 };
var TEMPLE_CERT_DATE_SLOT = { x: 235, y: 892, maxWidth: 230, maxSize: 15, minSize: 10 };
var TEMPLE_CERT_FIELD_COLOR = "#2b1806";
async function renderTempleVisitCertificateJpeg(name, temple, dateOfIssue) {
  const sharp = (await import("sharp")).default;
  const imagePath = import_path2.default.join(
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
    name,
    TEMPLE_CERT_NAME_SLOT.x,
    TEMPLE_CERT_NAME_SLOT.y,
    TEMPLE_CERT_NAME_SLOT.maxWidth,
    TEMPLE_CERT_NAME_SLOT.maxSize,
    TEMPLE_CERT_NAME_SLOT.minSize,
    TEMPLE_CERT_FIELD_COLOR,
    "middle"
  );
  const templeEl = fittedTextElement(
    temple,
    TEMPLE_CERT_TEMPLE_SLOT.x,
    TEMPLE_CERT_TEMPLE_SLOT.y,
    TEMPLE_CERT_TEMPLE_SLOT.maxWidth,
    TEMPLE_CERT_TEMPLE_SLOT.maxSize,
    TEMPLE_CERT_TEMPLE_SLOT.minSize,
    TEMPLE_CERT_FIELD_COLOR,
    "middle"
  );
  const dateEl = fittedTextElement(
    dateOfIssue,
    TEMPLE_CERT_DATE_SLOT.x,
    TEMPLE_CERT_DATE_SLOT.y,
    TEMPLE_CERT_DATE_SLOT.maxWidth,
    TEMPLE_CERT_DATE_SLOT.maxSize,
    TEMPLE_CERT_DATE_SLOT.minSize,
    TEMPLE_CERT_FIELD_COLOR,
    "middle"
  );
  const textLayer = await renderTextLayerPng(width, height, `${nameEl}${templeEl}${dateEl}`);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}
async function loadAndRenderTempleVisitJpeg(refId) {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase is not configured on the server.");
  const { data, error } = await supabaseAdmin.from("form_submissions").select("name, payload, created_at").eq("form_type", "darshan_certificate").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");
  const row = data;
  const devoteeName = (row.name || "").trim() || "Devotee";
  const temple = (row.payload?.["temple"] || "").trim() || "the temple";
  const dateOfIssue = new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
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
  } catch (err) {
    const notFound = err?.message === "not_found";
    appendAuditLog("temple_visit_certificate_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No Temple Visit Certificate request found for this reference." : "Could not generate the certificate right now. Please try again shortly." });
  }
});
var PUJA_CERT_NAME_SLOT = { x: 767, y: 392, maxWidth: 560, maxSize: 30, minSize: 16 };
var PUJA_CERT_SERVICE_SLOT = { x: 767, y: 452, maxWidth: 560, maxSize: 26, minSize: 14 };
var PUJA_CERT_DATE_SLOT = { x: 235, y: 892, maxWidth: 230, maxSize: 15, minSize: 10 };
var SEVA_CERT_NAME_SLOT = { x: 745, y: 445, maxWidth: 520, maxSize: 28, minSize: 15 };
var SEVA_CERT_SERVICE_SLOT = { x: 745, y: 515, maxWidth: 520, maxSize: 24, minSize: 13 };
var SERVICE_CERT_FIELD_COLOR = "#2b1806";
var BAZAAR_CERT_NAME_SLOT = { x: 768, y: 419, maxWidth: 560, maxSize: 30, minSize: 16 };
var BAZAAR_CERT_DATE_SLOT = { x: 228, y: 937, maxWidth: 210, maxSize: 15, minSize: 10 };
var BAZAAR_CERT_REF_SLOT = { x: 564, y: 937, maxWidth: 330, maxSize: 15, minSize: 10 };
var GUIDANCE_CERT_NAME_SLOT = BAZAAR_CERT_NAME_SLOT;
var GUIDANCE_CERT_DATE_SLOT = BAZAAR_CERT_DATE_SLOT;
var WELLNESS_CERT_NAME_SLOT = { x: 770, y: 420, maxWidth: 560, maxSize: 30, minSize: 16 };
var WELLNESS_CERT_DATE_SLOT = { x: 241, y: 902, maxWidth: 210, maxSize: 15, minSize: 10 };
async function renderServiceCertificateJpeg(name, serviceName, performedDate, activityType, refId) {
  const sharp = (await import("sharp")).default;
  const isSeva = activityType === "seva";
  const isBazaar = activityType === "product";
  const isGuidance = activityType === "other";
  const isWellness = activityType === "wellness";
  const imageFile = isBazaar ? "baazar_certificate.jpg" : isWellness ? "wellness_yoga.jpg" : isGuidance ? "Guidance_Certificate.jpg" : isSeva ? "seva_certificate.jpg" : "puja_certificate.jpg";
  const imagePath = import_path2.default.join(
    process.cwd(),
    process.env.NODE_ENV === "production" ? "dist" : "public",
    "images",
    imageFile
  );
  const base = sharp(imagePath);
  const meta = await base.metadata();
  const width = meta.width || (isSeva ? 1492 : 1536);
  const height = meta.height || (isSeva ? 1054 : 1024);
  if (isBazaar || isGuidance || isWellness) {
    const nameSlot2 = isBazaar ? BAZAAR_CERT_NAME_SLOT : isWellness ? WELLNESS_CERT_NAME_SLOT : GUIDANCE_CERT_NAME_SLOT;
    const dateSlot = isBazaar ? BAZAAR_CERT_DATE_SLOT : isWellness ? WELLNESS_CERT_DATE_SLOT : GUIDANCE_CERT_DATE_SLOT;
    const nameEl2 = fittedTextElement(name, nameSlot2.x, nameSlot2.y, nameSlot2.maxWidth, nameSlot2.maxSize, nameSlot2.minSize, SERVICE_CERT_FIELD_COLOR, "middle");
    const dateEl2 = fittedTextElement(performedDate, dateSlot.x, dateSlot.y, dateSlot.maxWidth, dateSlot.maxSize, dateSlot.minSize, SERVICE_CERT_FIELD_COLOR, "middle");
    const refEl = isWellness ? "" : fittedTextElement(
      refId,
      BAZAAR_CERT_REF_SLOT.x,
      BAZAAR_CERT_REF_SLOT.y,
      BAZAAR_CERT_REF_SLOT.maxWidth,
      BAZAAR_CERT_REF_SLOT.maxSize,
      BAZAAR_CERT_REF_SLOT.minSize,
      SERVICE_CERT_FIELD_COLOR,
      "middle"
    );
    const textLayer2 = await renderTextLayerPng(width, height, `${nameEl2}${dateEl2}${refEl}`);
    return base.composite([{ input: textLayer2 }]).jpeg({ quality: 90 }).toBuffer();
  }
  const nameSlot = isSeva ? SEVA_CERT_NAME_SLOT : PUJA_CERT_NAME_SLOT;
  const serviceSlot = isSeva ? SEVA_CERT_SERVICE_SLOT : PUJA_CERT_SERVICE_SLOT;
  const nameEl = fittedTextElement(
    name,
    nameSlot.x,
    nameSlot.y,
    nameSlot.maxWidth,
    nameSlot.maxSize,
    nameSlot.minSize,
    SERVICE_CERT_FIELD_COLOR,
    "middle"
  );
  const serviceEl = fittedTextElement(
    serviceName,
    serviceSlot.x,
    serviceSlot.y,
    serviceSlot.maxWidth,
    serviceSlot.maxSize,
    serviceSlot.minSize,
    SERVICE_CERT_FIELD_COLOR,
    "middle"
  );
  const dateEl = isSeva ? "" : fittedTextElement(
    performedDate,
    PUJA_CERT_DATE_SLOT.x,
    PUJA_CERT_DATE_SLOT.y,
    PUJA_CERT_DATE_SLOT.maxWidth,
    PUJA_CERT_DATE_SLOT.maxSize,
    PUJA_CERT_DATE_SLOT.minSize,
    SERVICE_CERT_FIELD_COLOR,
    "middle"
  );
  const textLayer = await renderTextLayerPng(width, height, `${nameEl}${serviceEl}${dateEl}`);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}
app.get("/api/stats/community", async (req, res) => {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    res.status(500).json({ error: "Supabase is not configured on the server." });
    return;
  }
  try {
    const startOfYear = new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 1).toISOString();
    const [pujaSevaCount, templeVisitCount] = await Promise.all([
      supabaseAdmin.from("activities").select("id", { count: "exact", head: true }).in("activity_type", ["puja", "seva"]).eq("payment_status", "confirmed").gte("created_at", startOfYear),
      supabaseAdmin.from("form_submissions").select("id", { count: "exact", head: true }).eq("form_type", "darshan_certificate").gte("created_at", startOfYear)
    ]);
    res.set("Cache-Control", "public, max-age=1800");
    res.json({
      pujaSevaCompletedThisYear: pujaSevaCount.count ?? 0,
      templeVisitsThisYear: templeVisitCount.count ?? 0,
      year: (/* @__PURE__ */ new Date()).getFullYear()
    });
  } catch (err) {
    appendAuditLog("community_stats_failed", { message: err?.message || "unknown error" });
    res.status(500).json({ error: "Could not load community stats right now." });
  }
});
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
    const { data: activity, error: activityError } = await supabaseAdmin.from("activities").select("item_name, created_at, user_id, activity_type, metadata").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (activityError) throw new Error(activityError.message);
    if (!activity) {
      res.status(404).json({ error: "No booking found for this reference." });
      return;
    }
    const row = activity;
    let devoteeName = (typeof row.metadata?.["devoteeName"] === "string" ? row.metadata["devoteeName"].trim() : "") || null;
    if (!devoteeName) {
      const { data: submission } = await supabaseAdmin.from("form_submissions").select("name").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
      devoteeName = submission?.name || null;
    }
    if (!devoteeName && row.user_id) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("name").eq("id", row.user_id).maybeSingle();
      devoteeName = profile?.name || null;
    }
    const serviceName = (row.item_name || "").trim() || "Sacred Offering";
    const bookingDate = new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
    const jpegBuffer = await renderServiceCertificateJpeg((devoteeName || "").trim() || "Devotee", serviceName, bookingDate, row.activity_type || "puja", refId);
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "private, max-age=300");
    res.set("Content-Disposition", `inline; filename="Sri-Dwar-Service-Certificate-${refId}.jpg"`);
    res.send(jpegBuffer);
  } catch (err) {
    appendAuditLog("service_certificate_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(500).json({ error: "Could not generate the certificate right now. Please try again shortly." });
  }
});
var GENERAL_CERT_FORM_LABELS = {
  contact_us: "Inquiry",
  testimonial: "Devotion Story Shared",
  devotee_registration: "Devotee Registration",
  expert_registration: "Dharmic Expert Registration",
  temple_committee_registration: "Temple Committee Registration",
  refund_cancellation_request: "Refund / Cancellation Request",
  subscription_signup: "Subscription Signup"
};
function resolveBlessedThroughText(formType, payload, refId) {
  const p = payload || {};
  if (formType === "expert_registration" && p["category"]) {
    return String(p["category"]).trim();
  }
  if (formType === "temple_committee_registration" && p["templeName"]) {
    return String(p["templeName"]).trim();
  }
  const gotra = typeof p["gotra"] === "string" ? p["gotra"].trim() : "";
  if (gotra) {
    return `Gotra: ${gotra} \u2014 Ref ${refId}`;
  }
  const label = GENERAL_CERT_FORM_LABELS[formType] || "Devotee Record";
  return `${label} \u2014 Ref ${refId}`;
}
async function loadAndRenderGeneralCertificateJpeg(refId) {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase is not configured on the server.");
  const { data, error } = await supabaseAdmin.from("form_submissions").select("name, form_type, payload, created_at").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");
  const row = data;
  const devoteeName = (row.name || "").trim() || "Devotee";
  const blessedThrough = resolveBlessedThroughText(row.form_type, row.payload, refId);
  const dateOfIssue = new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
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
  } catch (err) {
    const notFound = err?.message === "not_found";
    appendAuditLog("general_certificate_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No record found for this reference." : "Could not generate the certificate right now." });
  }
});
var REGISTER_TEMPLE_REFERENCE_SLOT = { x: 707, y: 930, maxWidth: 280, maxSize: 20, minSize: 12 };
var REGISTER_TEMPLE_DEVOTEE_SLOT = { x: 707, y: 987, maxWidth: 280, maxSize: 20, minSize: 12 };
var REGISTER_TEMPLE_FIELD_COLOR = "#2b1806";
var REGISTER_TEMPLE_FORM_TYPES = /* @__PURE__ */ new Set(["contact_us", "expert_registration", "temple_committee_registration"]);
async function renderRegisterTempleAcknowledgementJpeg(name, refId) {
  const sharp = (await import("sharp")).default;
  const imagePath = import_path2.default.join(
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
    refId,
    REGISTER_TEMPLE_REFERENCE_SLOT.x,
    REGISTER_TEMPLE_REFERENCE_SLOT.y,
    REGISTER_TEMPLE_REFERENCE_SLOT.maxWidth,
    REGISTER_TEMPLE_REFERENCE_SLOT.maxSize,
    REGISTER_TEMPLE_REFERENCE_SLOT.minSize,
    REGISTER_TEMPLE_FIELD_COLOR,
    "middle"
  );
  const devoteeEl = fittedTextElement(
    (name || "").trim() || "Devotee",
    REGISTER_TEMPLE_DEVOTEE_SLOT.x,
    REGISTER_TEMPLE_DEVOTEE_SLOT.y,
    REGISTER_TEMPLE_DEVOTEE_SLOT.maxWidth,
    REGISTER_TEMPLE_DEVOTEE_SLOT.maxSize,
    REGISTER_TEMPLE_DEVOTEE_SLOT.minSize,
    REGISTER_TEMPLE_FIELD_COLOR,
    "middle"
  );
  const textLayer = await renderTextLayerPng(width, height, `${refEl}${devoteeEl}`);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}
async function loadAndRenderRegisterTempleAcknowledgementJpeg(refId) {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) throw new Error("Supabase is not configured on the server.");
  const { data, error } = await supabaseAdmin.from("form_submissions").select("name, form_type, created_at").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("not_found");
  const row = data;
  if (!REGISTER_TEMPLE_FORM_TYPES.has(row.form_type)) {
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
  } catch (err) {
    const notFound = err?.message === "not_found";
    appendAuditLog("inquiry_acknowledgement_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No record found for this reference." : "Could not generate the acknowledgement certificate right now." });
  }
});
var TXN_BILLTO_SLOT = { x: 215, y: 350, maxWidth: 210, maxSize: 20, minSize: 11 };
var TXN_INVOICE_SLOT = { x: 615, y: 297, maxWidth: 150, maxSize: 14, minSize: 8 };
var TXN_REFERENCE_SLOT = { x: 624, y: 340, maxWidth: 143, maxSize: 14, minSize: 8 };
var TXN_DATE_SLOT = { x: 580, y: 378, maxWidth: 185, maxSize: 14, minSize: 9 };
var TXN_DESC_SLOT = { x: 140, y: 505, maxWidth: 690, maxSize: 17, minSize: 11 };
var TXN_AMOUNT_SLOT = { x: 980, y: 505, maxWidth: 250, maxSize: 17, minSize: 12 };
var TXN_PAYMENT_SLOT = { x: 440, y: 745, maxWidth: 280, maxSize: 14, minSize: 10 };
var TXN_TOTAL_SLOT = { x: 917, y: 731, maxWidth: 120, maxSize: 17, minSize: 12 };
var TXN_FIELD_COLOR = "#2b1806";
var TXN_PENDING_COLOR = "#6b1d0a";
function formatInr(amount) {
  return `\u20B9${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
var PAYMENT_METHOD_DISPLAY_LABELS = {
  upi: "UPI",
  gpay: "Google Pay (UPI)",
  phonepe: "PhonePe (UPI)",
  paytm: "Paytm (UPI)",
  "whatsapp pay": "WhatsApp Pay",
  bank_transfer: "Bank Transfer"
};
async function renderTransactionJpeg(fields) {
  const sharp = (await import("sharp")).default;
  const imagePath = import_path2.default.join(
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
    fittedTextElement(fields.billTo, TXN_BILLTO_SLOT.x, TXN_BILLTO_SLOT.y, TXN_BILLTO_SLOT.maxWidth, TXN_BILLTO_SLOT.maxSize, TXN_BILLTO_SLOT.minSize, TXN_FIELD_COLOR, "middle"),
    fittedTextElement(fields.invoice, TXN_INVOICE_SLOT.x, TXN_INVOICE_SLOT.y, TXN_INVOICE_SLOT.maxWidth, TXN_INVOICE_SLOT.maxSize, TXN_INVOICE_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.reference, TXN_REFERENCE_SLOT.x, TXN_REFERENCE_SLOT.y, TXN_REFERENCE_SLOT.maxWidth, TXN_REFERENCE_SLOT.maxSize, TXN_REFERENCE_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.date, TXN_DATE_SLOT.x, TXN_DATE_SLOT.y, TXN_DATE_SLOT.maxWidth, TXN_DATE_SLOT.maxSize, TXN_DATE_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(fields.description, TXN_DESC_SLOT.x, TXN_DESC_SLOT.y, TXN_DESC_SLOT.maxWidth, TXN_DESC_SLOT.maxSize, TXN_DESC_SLOT.minSize, TXN_FIELD_COLOR),
    fittedTextElement(formatInr(fields.amount), TXN_AMOUNT_SLOT.x, TXN_AMOUNT_SLOT.y, TXN_AMOUNT_SLOT.maxWidth, TXN_AMOUNT_SLOT.maxSize, TXN_AMOUNT_SLOT.minSize, TXN_FIELD_COLOR, "end"),
    fittedTextElement(fields.paymentMethod, TXN_PAYMENT_SLOT.x, TXN_PAYMENT_SLOT.y, TXN_PAYMENT_SLOT.maxWidth, TXN_PAYMENT_SLOT.maxSize, TXN_PAYMENT_SLOT.minSize, fields.isPaid ? TXN_FIELD_COLOR : TXN_PENDING_COLOR, "middle"),
    fittedTextElement(formatInr(fields.totalPaid), TXN_TOTAL_SLOT.x, TXN_TOTAL_SLOT.y, TXN_TOTAL_SLOT.maxWidth, TXN_TOTAL_SLOT.maxSize, TXN_TOTAL_SLOT.minSize, TXN_FIELD_COLOR, "middle")
  ].join("");
  const textLayer = await renderTextLayerPng(width, height, els);
  return base.composite([{ input: textLayer }]).jpeg({ quality: 90 }).toBuffer();
}
async function loadAndRenderTransactionJpeg(refId) {
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) {
    throw new Error("Supabase is not configured on the server.");
  }
  const { data: activity, error: activityError } = await supabaseAdmin.from("activities").select("item_name, amount, payment_method, payment_status, created_at, user_id, metadata").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (activityError) throw new Error(activityError.message);
  if (!activity) throw new Error("not_found");
  const row = activity;
  let devoteeName = (typeof row.metadata?.["devoteeName"] === "string" ? row.metadata["devoteeName"].trim() : "") || null;
  if (!devoteeName) {
    const { data: submission } = await supabaseAdmin.from("form_submissions").select("name").eq("ref_id", refId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    devoteeName = submission?.name || null;
  }
  if (!devoteeName && row.user_id) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("name").eq("id", row.user_id).maybeSingle();
    devoteeName = profile?.name || null;
  }
  const isPaid = row.payment_status === "confirmed";
  const amount = typeof row.amount === "number" ? row.amount : 0;
  const methodKey = (row.payment_method || "").trim().toLowerCase();
  const paymentMethodDisplay = isPaid ? PAYMENT_METHOD_DISPLAY_LABELS[methodKey] || row.payment_method || "UPI" : "Payment is still pending";
  return renderTransactionJpeg({
    billTo: devoteeName || "Devotee",
    invoice: `INV-${refId}`,
    reference: refId,
    date: new Date(row.created_at || Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    description: row.item_name || "Sacred Offering",
    amount,
    totalPaid: amount,
    paymentMethod: paymentMethodDisplay,
    isPaid
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
  } catch (err) {
    const notFound = err?.message === "not_found";
    appendAuditLog("transaction_receipt_render_failed", { refId, message: err?.message || "unknown error" });
    res.status(notFound ? 404 : 500).json({ error: notFound ? "No transaction found for this reference." : "Could not generate the receipt right now." });
  }
});
var STATIC_LEGAL_PAGES = [
  "privacy-policy",
  "terms-and-conditions",
  "refund-policy",
  "shipping-policy",
  "disclaimer",
  "community-guidelines",
  "cookies",
  "account-deletion"
];
for (const slug of STATIC_LEGAL_PAGES) {
  app.get(`/${slug}`, (req, res) => {
    const filePath = process.env.NODE_ENV === "production" ? import_path2.default.join(process.cwd(), "dist", `${slug}.html`) : import_path2.default.join(process.cwd(), "public", `${slug}.html`);
    res.sendFile(filePath);
  });
  app.get(`/${slug}.html`, (req, res) => {
    res.redirect(301, `/${slug}`);
  });
}
var PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.shradhalu.sridwar";
app.get("/app", (req, res) => {
  res.redirect(302, PLAY_STORE_URL);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode, mounting Vite...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode, serving static files...");
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sri Dwar server running on http://localhost:${PORT}`);
  });
}
startServer();
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
 * dispatches the "Certificate Ready" / "Booking Confirmed" email via
 * Webhook.gs. It does not touch App.tsx, the Google Forms sync, WhatsApp
 * alerts, or any of server.ts's other existing routes/flows.
 *
 * ✅ WIRING STATUS (corrected 2026-08-31 — this section previously said
 * "design/templates only, wire trigger later"; that is no longer accurate
 * and was misleading anyone reading this file in isolation):
 * ----------------------------------------------------------------------
 * This pipeline (verification re-check → idempotency claim → template
 * render → storage → audit → email dispatch) IS live-wired from server.ts,
 * three ways:
 *   1. POST /api/admin/certificates/mark-completed-and-send — marks a
 *      booking's service as performed, then calls generateCertificatePdf().
 *   2. POST /api/admin/certificates/send-booking-confirmation — calls
 *      generateBookingConfirmationPdf() directly.
 *   3. A Supabase Database Webhook route (server.ts, guarded by
 *      SUPABASE_WEBHOOK_SECRET) that calls generateBookingConfirmationPdf()
 *      automatically the moment a row's payment_status transitions to
 *      'confirmed'.
 * All three import this file dynamically (`await import("./certificateService")`)
 * so a missing pdf-lib install or unmigrated schema can only ever fail that
 * one request, never server startup. `registerCertificateAdminRoutes()`
 * below is a separate, still-unmounted, optional QA-only route pair kept for
 * ad-hoc Postman testing — it is not how production traffic reaches this file.
 *
 * For manual/QA testing, two ways in:
 *   1. `npx tsx certificateService.ts --selftest`  — runs the full test
 *      matrix below against an in-memory fake DB (no network, no Supabase).
 *   2. Import and call `generateBookingConfirmationPdf(refId)` /
 *      `generateCertificatePdf(refId)` directly from a REPL or temp script.
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
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
