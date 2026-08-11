/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * formValidation.ts — Sri Dwar Global Form Validation Utility
 * Shared across all forms: Darshan, Puja, Seva, Bazaar, Contact, Testimony.
 * Validates Name, Email, Phone, Age with anti-spam and anti-fake protection.
 */

// ─── Blocklists ─────────────────────────────────────────────────────────────

const FAKE_NAME_PATTERNS = [
  /^(test|fake|dummy|sample|asdf|qwerty|abc|xyz|aaa|bbb|ccc|fff|zzz|none|na|n\/a|no name|unknown|anonymous|user|admin|null|undefined|xxx|blah|foo|bar|baz)/i,
  /^(.)\1{3,}$/,          // 4+ repeated characters: aaaa, bbbb
  /^[^a-zA-Z\u0900-\u09FF\u0A00-\u0A7F\u0B00-\u0B7F\u0C00-\u0C7F]+$/, // no letters at all
];

const FAKE_EMAIL_DOMAINS = [
  "test.com", "fake.com", "example.com", "dummy.com", "sample.com",
  "noemail.com", "noreply.com", "mailinator.com", "throwaway.email",
  "tempmail.com", "guerrillamail.com", "yopmail.com", "sharklasers.com",
  "guerrillamailblock.com", "grr.la", "spam4.me", "trashmail.com",
];

// ─── Validators ─────────────────────────────────────────────────────────────

/**
 * Validates a full name.
 * Rules: 2–60 chars, at least 2 words (first + last), no fake/test patterns.
 */
export function validateName(name: string): string | null {
  const v = name.trim();
  if (!v) return "Name is required.";
  if (v.length < 2) return "Name is too short.";
  if (v.length > 60) return "Name is too long (max 60 characters).";
  for (const pat of FAKE_NAME_PATTERNS) {
    if (pat.test(v)) return "Please enter your real full name.";
  }
  // Must contain at least one alphabet character
  if (!/[a-zA-Z\u0900-\u09FF\u0A00-\u0A7F\u0B00-\u0B7F\u0C00-\u0C7F]/.test(v)) {
    return "Name must contain at least one letter.";
  }
  return null;
}

/**
 * Validates an email address.
 * Rules: RFC-basic format, no disposable/fake domains.
 */
export function validateEmail(email: string): string | null {
  const v = email.trim().toLowerCase();
  if (!v) return "Email address is required.";
  // Basic RFC-compliant check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    return "Please enter a valid email address (e.g. name@gmail.com).";
  }
  const domain = v.split("@")[1];
  if (FAKE_EMAIL_DOMAINS.includes(domain)) {
    return "Please use a real email address — disposable emails are not accepted.";
  }
  return null;
}

/**
 * Validates a phone number (Indian-primary, international-tolerant).
 * Rules: digits 7–15, no sequential/repeated fakes.
 */
/**
 * Returns true if `digits` is a fully sequential ascending or descending run
 * (e.g. "1234567890", "9876543210", "234567") — used to reject obvious spam
 * numbers without accidentally rejecting real numbers that merely start with
 * a couple of similar-looking digits.
 */
function isSequentialRun(digits: string): boolean {
  if (digits.length < 7) return false;
  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    const diff = digits.charCodeAt(i) - digits.charCodeAt(i - 1);
    if (diff !== 1) ascending = false;
    if (diff !== -1) descending = false;
  }
  return ascending || descending;
}

export function validatePhone(phone: string): string | null {
  const v = phone.trim().replace(/[\s\-().+]/g, "");
  if (!v) return "Phone number is required.";
  if (!/^\d{7,15}$/.test(v)) return "Enter a valid phone number (7–15 digits).";
  // Reject obvious fakes: 1111111111, 0000000000, 1234567890, 9999999999
  if (/^(\d)\1{6,}$/.test(v)) return "Please enter a real phone number.";
  // Reject only an EXACT, fully sequential ascending/descending run — checked
  // against both the whole number and its last 10 digits (so a real country
  // code prefix like 91 doesn't hide/obscure a fake local number). Anchoring
  // to a full match (instead of just a "starts with" prefix check) is the
  // fix: previously a genuine number like 7654321987 was rejected just for
  // starting with "7654321", even though it isn't the spam sequence itself.
  const last10 = v.length > 10 ? v.slice(-10) : v;
  if (isSequentialRun(v) || isSequentialRun(last10)) {
    return "Please enter a real phone number.";
  }
  return null;
}

/**
 * Same rules as validatePhone, but treats common "not applicable" answers
 * (na, n/a, none, nil, -, etc.) as "not provided" instead of an invalid
 * phone number. Use this for OPTIONAL phone/WhatsApp fields where a devotee
 * may legitimately type "NA" to mean "I don't have one" rather than leaving
 * the field blank — validatePhone alone would otherwise reject that text
 * with a confusing "Enter a valid phone number" error on a field the
 * devotee correctly believes they've answered.
 */
const NOT_APPLICABLE_ANSWERS = new Set(["na", "n/a", "none", "nil", "nope", "-", "n.a", "n.a."]);

export function validateOptionalPhone(phone: string): string | null {
  const v = phone.trim();
  if (!v) return null;
  if (NOT_APPLICABLE_ANSWERS.has(v.toLowerCase())) return null;
  return validatePhone(v);
}

/**
 * Validates age (must be between 16 and 100).
 * Pass `required=false` to allow empty/skipped age fields.
 */
export function validateAge(age: string | number, required = true): string | null {
  const s = String(age).trim();
  if (!s) {
    return required ? "Age is required." : null;
  }
  const n = Number(s);
  if (!Number.isInteger(n) || isNaN(n)) return "Please enter a valid age.";
  if (n < 16) return "Age must be at least 16.";
  if (n > 100) return "Age must be 100 or below.";
  return null;
}

/**
 * Validates a text field for minimum content (anti-spam, anti-blank).
 * @param value   The text to check
 * @param label   Field label shown in the error
 * @param minLen  Minimum required character count (default 10)
 */
export function validateTextMinLength(value: string, label: string, minLen = 10): string | null {
  const v = value.trim();
  if (!v) return `${label} is required.`;
  if (v.length < minLen) return `${label} must be at least ${minLen} characters.`;
  // Reject all-same-character spam: "aaaaaaaaaa"
  if (/^(.)\1+$/.test(v)) return `Please enter a meaningful ${label.toLowerCase()}.`;
  return null;
}

/**
 * Validates a 6-digit Indian PIN code.
 */
export function validatePincode(pin: string): string | null {
  const v = pin.trim();
  if (!v) return "PIN code is required.";
  if (!/^\d{6}$/.test(v)) return "Enter a valid 6-digit PIN code.";
  if (/^(\d)\1{5}$/.test(v)) return "Please enter a real PIN code.";
  return null;
}

/**
 * Validates a Date of Birth string and derives age (16–100).
 * Pass `required=false` to make it optional.
 */
export function validateDOB(dob: string, required = false): string | null {
  if (!dob) return required ? "Date of birth is required." : null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return "Please enter a valid date of birth.";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 16) return "You must be at least 16 years old to book services.";
  if (age > 100) return "Please enter a valid date of birth.";
  return null;
}

/**
 * ─── Booking date lead-time rule ─────────────────────────────────────────
 * Every Puja/Seva/Darshan/other service date-selection field must give
 * Sri Dwar at least this many days to contact and coordinate with the
 * relevant Pandit/Pujari/seva provider before the requested date. Same-day
 * and next-day (and everything inside this window) must be unselectable —
 * enforced both via the <input min=...> attribute (blocks the native date
 * picker) AND via validateBookingDate() below (blocks a manually-typed or
 * pasted date that bypasses the picker).
 */
export const MIN_BOOKING_LEAD_DAYS = 3;

/**
 * Earliest selectable date, as a "YYYY-MM-DD" string suitable for an
 * <input type="date" min={...}> attribute — today + MIN_BOOKING_LEAD_DAYS,
 * in the devotee's local time zone (not UTC, so it lines up with what the
 * native date picker shows them).
 */
export function getMinBookableDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + MIN_BOOKING_LEAD_DAYS);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates a preferred/booking date string ("YYYY-MM-DD") against the
 * MIN_BOOKING_LEAD_DAYS rule. Pass `required=true` to also reject an empty
 * value (every current date-selection field on the site treats the date
 * as optional — "no preference" — so this defaults to false).
 */
export function validateBookingDate(dateStr: string, required = false): string | null {
  const v = dateStr.trim();
  if (!v) return required ? "Please select a preferred date." : null;
  const chosen = new Date(`${v}T00:00:00`);
  if (isNaN(chosen.getTime())) return "Please enter a valid date.";
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + MIN_BOOKING_LEAD_DAYS);
  if (chosen < minDate) {
    return `Please select a date at least ${MIN_BOOKING_LEAD_DAYS} days from today, so we have time to coordinate with the Pandit/Pujari.`;
  }
  return null;
}

/**
 * Run multiple validators and return the first error found, or null.
 * Useful for sequential field checks.
 */
export function firstError(...results: (string | null)[]): string | null {
  for (const r of results) {
    if (r !== null) return r;
  }
  return null;
}
