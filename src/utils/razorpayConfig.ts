/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ============================================================
 *  RAZORPAY PAYMENT GATEWAY — CLIENT-SIDE CONFIG & HELPERS
 * ============================================================
 * Client-side helpers for the Razorpay Standard Checkout integration used
 * by UPIPaymentModal.tsx. The Key SECRET never lives here or anywhere in
 * the browser — only the public Key ID does, which is safe to expose (it
 * identifies your account; it cannot authorize a charge on its own).
 * Order creation and payment-signature verification both happen
 * server-side (see server.ts), using the Key Secret from the server's own
 * environment variables.
 *
 * Setup — add these lines to your .env file (server-side, NOT committed
 * to git):
 *   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
 *   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
 *   VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
 *
 * The VITE_-prefixed copy is required separately — Vite only exposes env
 * vars prefixed VITE_ to the browser bundle, so the plain RAZORPAY_KEY_ID
 * (read by server.ts) and VITE_RAZORPAY_KEY_ID (read by this file) must
 * both be set to the same value.
 *
 * Swap all three for your rzp_live_... values (Dashboard → Settings →
 * API Keys → Live Mode) when you're ready to accept real payments —
 * nothing in this file, UPIPaymentModal.tsx, or server.ts needs to change.
 * ============================================================
 */

export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "";

/** True once a Key ID has actually been configured — lets the UI hide the
 *  "Pay Now" button gracefully instead of opening a broken checkout if
 *  the env var is ever missing (e.g. a fresh clone before setup). */
export const isRazorpayConfigured = RAZORPAY_KEY_ID.length > 0;

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // smallest currency unit (paise)
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

let checkoutScriptPromise: Promise<void> | null = null;

/**
 * Loads Razorpay's Checkout script once and caches the promise, so opening
 * the payment modal more than once in a session doesn't inject the script
 * tag repeatedly. Only runs when a devotee actually taps "Pay Now" — this
 * keeps it off the site's initial bundle/network waterfall entirely,
 * matching the "load heavy/third-party things only when actually needed"
 * pattern already used for html2canvas-pro elsewhere in this project.
 */
export function loadRazorpayCheckoutScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in a browser."));
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      checkoutScriptPromise = null; // allow retry on a later tap
      reject(new Error("Could not load the payment gateway. Check your connection and try again."));
    };
    document.body.appendChild(script);
  });
  return checkoutScriptPromise;
}

export interface CreateRazorpayOrderPayload {
  amount: number; // rupees
  refId: string;
  bookingName: string;
  devoteeName?: string;
}

export interface CreateRazorpayOrderResult {
  order_id: string;
  amount: number; // paise, as returned by Razorpay
  currency: string;
}

/**
 * Creates a Razorpay Order server-side (server.ts) before Checkout opens.
 * Always go through this — never open Checkout with a client-computed
 * amount alone. An Order ties the payment to an amount the SERVER chose,
 * so a tampered client-side amount can never be what actually gets
 * charged or accepted.
 */
export async function createRazorpayOrder(payload: CreateRazorpayOrderPayload): Promise<CreateRazorpayOrderResult> {
  const res = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to start payment. Please try again.");
  }
  return data;
}

export interface VerifyRazorpayPaymentPayload extends RazorpaySuccessResponse {
  refId: string;
  amount: number; // rupees
  bookingName?: string;
  devoteeName?: string;
}

/**
 * Verifies the payment signature server-side (server.ts). This is the step
 * that actually confirms a payment is genuine and wasn't tampered with —
 * never treat a payment as successful just because the Checkout popup
 * closed or the handler fired; always wait for `verified: true` here.
 */
export async function verifyRazorpayPayment(payload: VerifyRazorpayPaymentPayload): Promise<boolean> {
  const res = await fetch("/api/razorpay/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return res.ok && data?.verified === true;
}

/**
 * Opens Razorpay's Checkout popup. Thin wrapper so callers don't need to
 * reach into `window` directly or know the global's shape.
 */
export function openRazorpayCheckout(options: RazorpayCheckoutOptions, onFailed?: (message: string) => void): void {
  if (!window.Razorpay) throw new Error("Razorpay Checkout script has not loaded yet.");
  const instance = new window.Razorpay(options);
  if (onFailed) {
    instance.on("payment.failed", (response) => {
      onFailed(response?.error?.description || "Payment failed. Please try again.");
    });
  }
  instance.open();
}
