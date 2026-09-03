/**
 * Sri Dwar — Email Automation: CONFIG
 */

const CONFIG = {

  SENDER_NAME: "Sri Dwar",
  SENDER_EMAIL_DEFAULT: "puja@sridwar.com",
  SENDER_EMAIL_CERTIFICATE: "puja@sridwar.com",
  ADMIN_ALERT_EMAIL: "puja@sridwar.com",

  MAX_EMAILS_PER_DAY: 1400,
  LOW_QUOTA_ALERT_THRESHOLD: 100,

  // ✅ ROOT-CAUSE FIX: a booking used to get an immediate "payment pending"
  // email the moment the row landed (paid or not), then this same delay
  // (previously 6 hours) queued a SECOND pending-flavoured email later. That
  // is what produced repeated "payment pending"-style mail for one booking.
  // Triggers.gs no longer sends anything immediately for a still-pending
  // row — the ONLY pending-payment email now comes from this delay, sent
  // at most once (see PAYMENT_REMINDER_MAX_SENDS) and only if payment is
  // still not confirmed by then. 0.5 = 30 minutes, as requested.
  PAYMENT_REMINDER_DELAY_HOURS: 0.5,
  PAYMENT_REMINDER_MAX_SENDS: 1,

  BRAND: {
    name: "Sri Dwar",
    tagline: "Connect. Contribute. Preserve.",
    // ✅ LOGO-HOST FIX (2026-08-28): moved off the Drive proxy (lh3.googleusercontent.com),
    // which was flattening the old logo's transparency to a white box in
    // delivered mail. Now points at the devotee's own domain — a stable,
    // unhashed path (same pattern as every other /images/ asset the public
    // SEO pages already reference directly). VERIFY THIS URL RESOLVES after
    // deploying public/images/sridwar-logo-email.jpg — untested from this
    // side since the file wasn't live yet at edit time.
    logoUrl: "https://sridwar.com/images/sridwar-logo-email.jpg",
    qrImageUrl: "https://lh3.googleusercontent.com/d/1k3s7eikrTG3DnPmd92Nv42hY1J618LRS=w400",
    // ✅ LOGO-BLEND FIX (2026-08-28): darkGreen is also the header's gradient
    // START color, which sits directly behind/around the logo image (top-left
    // of the 135deg gradient, where the logo <td> is placed). The new logo
    // artwork (Sridwar_Logo_2) has its own solid background baked in at
    // ~#001e1d, measurably darker than the old #0c2b26. Matching darkGreen to
    // that exact tone removes the visible rectangle/seam around the logo —
    // no logo transparency needed. darkGreenGradientEnd is left as the old
    // darkGreen value so the header still fades subtly toward the text side,
    // same visual feel as before, just recalibrated to start where the logo
    // now blends in.
    darkGreen: "#001e1d",
    darkGreenGradientEnd: "#0c2b26",
    saffron: "#e8a33d",
    gold: "#f4c563",
    cream: "#fbf6ec",
    creamCard: "#ffffff",
    textMuted: "#6b7a76",
    website: "https://sridwar.com",
    supportEmail: "puja@sridwar.com",
  },

  SERVICE_DISCLAIMER: "Offerings and sevas are performed with devotion as per temple process. Timings may vary depending on temple schedule, festival rush, priest availability, and temple rituals. If a payment is later found to be unsuccessful, duplicate, or not properly processed, a refund will be initiated wherever applicable.",

  SHEETS: {
    DEVOTEE_REGISTRATION: {
      spreadsheetId: "1hEXMGFDGpjhHkbKgBYWaYg2OvtZGyQAVTOMeGRg0j_g",
      sheetName: "Sacred Profile", // renamed from "Form Responses 1"
      emailType: "welcome",
    },
    PUJA_BOOKING: {
      spreadsheetId: "1Xrz9voxD8zsKDCfyHCgi6RJRtfa-nlp-BRWvfSiusNw",
      sheetName: "PUJA", // renamed from "Form Responses 1" — confirmed exact tab name
      emailType: "booking",
      serviceLabel: "Puja",
    },
    SEVA_BOOKING: {
      spreadsheetId: "1OxoolDSz2OmAGIs38DfCg2e4jnFgx7EZZbpt0LOc2qA",
      sheetName: "SEVA", // renamed from "Form Responses 1"
      emailType: "booking",
      serviceLabel: "Seva",
    },
    DARSHAN_CERTIFICATE: {
      spreadsheetId: "1SpDDxKsSIj8xtKBguqA88G7DNXi8mSL1Ft1OEbbuVXE",
      sheetName: "CERTIFICATE", // renamed from "Form Responses 1"
      emailType: "booking",
      serviceLabel: "Darshan Certificate",
    },
    ACKNOWLEDGEMENT_SHEETS: [
      { spreadsheetId: "14acE8W_Yi6u55ZNi6dyKij7OmOadMTmqf3EHCSwJcQ0", sheetName: "INQUIRY", label: "Inquiry" },
      { spreadsheetId: "1Z7rOSJmjeL8Scq4Jvo9Fi1YljlUWaEIbIliQ4Xw5d_Y", sheetName: "TESTIMONY", label: "Prasad & Prayer Testimony" },
      { spreadsheetId: "1D7KLvuVfoh-BWpoP-OBB7FLGgEKZE-g6ansmVx16v74", sheetName: "Temple Register", label: "Temple Registration" },
      { spreadsheetId: "1nQjxVa0yyLA8hqtyhgJ6EX3OKXiz69JDjjbJM05D00c", sheetName: "Pujari Registration", label: "Pujari Registration" },
    ],
  },

  TRACKING_SHEET_SPREADSHEET_ID: "1Xrz9voxD8zsKDCfyHCgi6RJRtfa-nlp-BRWvfSiusNw",
  TRACKING_SHEET_NAME: "Email_Send_Log",
  ERROR_LOG_SHEET_NAME: "Email_Errors",
};
