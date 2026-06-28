/**
 * Sri Dwar – Google Analytics 4 utility
 * Measurement ID: G-LXYRS86RGH
 *
 * Usage:
 *   import { gaEvent, gaPageView } from "@/src/utils/analytics";
 *   gaEvent("puja_booking_start", { puja_name: "Graha Shanti" });
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = "G-LXYRS86RGH";

/** Fire a GA4 custom event. Silently no-ops if gtag is not loaded. */
export function gaEvent(
  eventName: string,
  params: Record<string, string | number | boolean | undefined> = {}
): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", eventName, { ...params, send_to: GA_ID });
    }
  } catch (e) {
    // Never let analytics crash the app
  }
}

/** Send a virtual page_view (for SPA navigation). */
export function gaPageView(pagePath: string, pageTitle?: string): void {
  gaEvent("page_view", {
    page_path: pagePath,
    page_title: pageTitle ?? pagePath,
  });
}

// ─── Typed convenience helpers ────────────────────────────────────────────────

/** User clicked "Book Now" / opened the puja wizard */
export function gaBookNowOpen(pujaName: string, price: number): void {
  gaEvent("book_now_open", { puja_name: pujaName, value: price, currency: "INR" });
}

/** Step 1 of wizard: devotee details filled & proceeding to payment */
export function gaBookingDetailsSubmit(pujaName: string, price: number): void {
  gaEvent("booking_details_submit", {
    puja_name: pujaName,
    value: price,
    currency: "INR",
  });
}

/** Step 2: user taps "Pay via UPI" (checkout initiated) */
export function gaCheckoutInitiate(pujaName: string, price: number, method = "UPI"): void {
  gaEvent("checkout_initiated", {
    puja_name: pujaName,
    value: price,
    currency: "INR",
    payment_method: method,
  });
}

/** Step 3: user confirmed payment — booking complete */
export function gaBookingComplete(
  pujaName: string,
  price: number,
  refId: string
): void {
  gaEvent("purchase", {
    transaction_id: refId,
    value: price,
    currency: "INR",
    item_name: pujaName,
  });
}

/** Seva sponsorship chosen */
export function gaSevaSelect(sevaName: string, price: number): void {
  gaEvent("seva_selected", { seva_name: sevaName, value: price, currency: "INR" });
}

/** Product added to cart */
export function gaAddToCart(productName: string, price: number, productId: string): void {
  gaEvent("add_to_cart", {
    item_id: productId,
    item_name: productName,
    value: price,
    currency: "INR",
  });
}

/** Cart checkout clicked */
export function gaCartCheckout(totalAmount: number, itemCount: number): void {
  gaEvent("cart_checkout", { value: totalAmount, item_count: itemCount, currency: "INR" });
}

/** Cart payment confirmed */
export function gaCartPurchase(totalAmount: number, refId: string): void {
  gaEvent("purchase", {
    transaction_id: refId,
    value: totalAmount,
    currency: "INR",
    item_name: "Temple Bazaar Cart Order",
  });
}

/** Contact / support form started (first field interaction) */
export function gaContactFormStart(): void {
  gaEvent("contact_form_start");
}

/** Contact form submitted */
export function gaContactFormSubmit(hasPhone: boolean): void {
  gaEvent("contact_form_submit", { has_phone: hasPhone });
}

/** Devotee registration / login form submitted */
export function gaRegistrationSubmit(authStep: string): void {
  gaEvent("sign_up", { method: authStep });
}

/** Devotee logged in */
export function gaLogin(method = "email"): void {
  gaEvent("login", { method });
}

/** Devotee registered their temple */
export function gaTempleRegisterSubmit(): void {
  gaEvent("temple_register_submit");
}

/** Darshan / live stream clicked */
export function gaDarshanClick(templeName: string): void {
  gaEvent("darshan_click", { temple_name: templeName });
}

/** Temple explore modal opened */
export function gaTempleExplore(templeName: string): void {
  gaEvent("temple_explore", { temple_name: templeName });
}

/** Share button / copy link action */
export function gaShare(platform: string, contentType: string, label = ""): void {
  gaEvent("share", { method: platform, content_type: contentType, item_id: label });
}

/** Social media icon clicked in footer/header */
export function gaSocialClick(platform: string): void {
  gaEvent("social_click", { platform });
}

/** WhatsApp helpline / support link clicked */
export function gaWhatsAppClick(context: string): void {
  gaEvent("whatsapp_click", { context });
}

/** Navigation item clicked */
export function gaNavClick(targetPage: string, source = "navbar"): void {
  gaEvent("navigation_click", { target_page: targetPage, source });
}

/** AI assistant (Margadarshak) opened */
export function gaAIAssistantOpen(): void {
  gaEvent("ai_assistant_open");
}

/** Puja / product category filter changed */
export function gaCategoryFilter(category: string, section: string): void {
  gaEvent("category_filter", { category, section });
}

/** Legal doc opened (privacy / terms / refund / legal) */
export function gaLegalDocOpen(docKey: string): void {
  gaEvent("legal_doc_open", { doc_key: docKey });
}

/** Donation via contact page */
export function gaDonationInitiate(amount: number): void {
  gaEvent("donation_initiate", { value: amount, currency: "INR" });
}

/** Certificate download / share */
export function gaCertificateAction(action: "download" | "share" | "copy", refId: string): void {
  gaEvent("certificate_action", { action, ref_id: refId });
}
