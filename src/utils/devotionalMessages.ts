/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  Devotional post-payment confirmation messages
 * ============================================================
 * Every screen that confirms a completed payment (puja/seva booking,
 * Darshan Certificate divine contribution, temple/priest registration
 * contribution, bazaar order, membership, etc.) should use this shared
 * helper instead of writing its own confirmation copy. This keeps the
 * tone consistent site-wide while still producing a message that names
 * the actual service the devotee paid for — never a generic "Thank you
 * for your payment."
 *
 * Deliberately NOT used for anything claiming a certificate/PDF is
 * available immediately — no service on Sri Dwar generates a real
 * document at the moment of payment; certificates and acknowledgements
 * are always handcrafted and sent within 3–7 working days afterward.
 * ============================================================
 */

export type DevotionalServiceCategory =
  | "darshan_certificate"
  | "puja_seva"
  | "counselling_guidance"
  | "holistic_wellness"
  | "seva_offering"
  | "temple_contribution"
  | "bazaar_order"
  | "subscription"
  | "support_contribution";

interface DevotionalMessageInput {
  category: DevotionalServiceCategory;
  /** The specific thing they paid for, e.g. "Rudrabhishek Seva", "Jagannath Temple Darshan Certificate", "Annadanam Seva at Puri" */
  serviceName: string;
  devoteeName: string;
  refId: string;
}

const OPENING_BY_CATEGORY: Record<DevotionalServiceCategory, (serviceName: string) => string> = {
  darshan_certificate: (s) =>
    `Your request for the ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  puja_seva: (s) =>
    `Your Sankalpa for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  counselling_guidance: (s) =>
    `Your request for ${s} has been warmly and confidentially received by our guidance coordination team.`,
  holistic_wellness: (s) =>
    `Your enrollment for ${s} has been warmly received by our Yogic Sciences & Wellness team.`,
  seva_offering: (s) =>
    `Your Seva Sankalp for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  temple_contribution: (s) =>
    `Your divine contribution toward ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  bazaar_order: (s) =>
    `Your order for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
  subscription: (s) =>
    `Your ${s} contribution has been lovingly received by our team of devoted priests and seva coordinators.`,
  support_contribution: (s) =>
    `Your offering for ${s} has been lovingly received by our team of devoted priests and seva coordinators.`,
};

const BLESSING_BY_CATEGORY: Record<DevotionalServiceCategory, string> = {
  darshan_certificate:
    "Like a diya lit with pure intention, your certificate is being handcrafted with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
  puja_seva:
    "Like the flame of a diya carried with unwavering devotion, your ritual is now being prepared with full reverence at the temple, and your Sankalpa Certificate of performance will reach you within 3–7 working days — straight to your email or WhatsApp.",
  counselling_guidance:
    "Your chosen Pandit or Dharmic guidance expert is reviewing your request with care, and will personally reach out to confirm your session timing within 3–7 working days — straight to your email or WhatsApp. Everything you've shared stays confidential.",
  holistic_wellness:
    "Like a lamp of steady practice, your session is being scheduled with care by our Yogic Sciences & Wellness team, and your enrollment confirmation will reach you within 3–7 working days — straight to your email or WhatsApp.",
  seva_offering:
    "Like the flame of a diya carried with unwavering devotion, your seva is now being prepared with full reverence at the temple, and your Seva Certificate of performance will reach you within 3–7 working days — straight to your email or WhatsApp.",
  temple_contribution:
    "Like a diya lit with pure intention, your acknowledgement letter is being handcrafted with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
  bazaar_order:
    "Like a diya lit with pure intention, your sacred items are being prepared and packed with blessings, and your dispatch confirmation will reach you within 3–7 working days — straight to your email or WhatsApp.",
  subscription:
    "Like a diya lit with pure intention, your membership welcome letter is being prepared with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
  support_contribution:
    "Like a diya lit with pure intention, your acknowledgement is being handcrafted with sacred blessings and will be delivered to you within 3–7 working days — straight to your email or WhatsApp.",
};

/** Structured pieces, for screens that render the message with their own styling (e.g. Hero.tsx's card layout). */
export function getDevotionalConfirmation({ category, serviceName, devoteeName, refId }: DevotionalMessageInput) {
  return {
    greeting: `Dear ${devoteeName},`,
    opening: OPENING_BY_CATEGORY[category](serviceName),
    blessing: BLESSING_BY_CATEGORY[category],
    refLine: `Reference ID: ${refId}`,
  };
}

/** Plain-text version, for the downloadable confirmation file. */
export function getDevotionalConfirmationText(input: DevotionalMessageInput): string {
  const { greeting, opening, blessing, refLine } = getDevotionalConfirmation(input);
  return [
    "🙏 Sri Dwar — Sacred Confirmation 🙏",
    "",
    refLine,
    "",
    greeting,
    "",
    opening,
    "",
    blessing,
    "",
    "Om Namah Shivaya. May Lord Jagannath bless your home.",
    "",
    "— Sri Dwar (Shradhalu Private Limited)",
  ].join("\n");
}

/**
 * Triggers a browser download of the confirmation message as a small
 * .txt file — no backend, no PDF generation, works the same in the
 * website and inside the Capacitor Android WebView.
 */
export function downloadConfirmationMessage(input: DevotionalMessageInput) {
  const text = getDevotionalConfirmationText(input);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SriDwar-Confirmation-${input.refId}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
