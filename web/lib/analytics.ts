/**
 * Thin wrapper over gtag.
 *
 * Two rules this module exists to enforce:
 *
 *  1. Analytics is entirely optional. If NEXT_PUBLIC_GA_MEASUREMENT_ID is not
 *     set, nothing loads and every call here is a no-op, so the site behaves
 *     identically with and without it. No ID is ever hardcoded.
 *
 *  2. Only non-identifying interaction events are sent. Résumé text, posting
 *     details, saved roles, application status, and anything derived from a
 *     user's account never reach analytics — the payload type below is
 *     deliberately narrow so it is awkward to pass anything else.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const analyticsEnabled = GA_ID.length > 0;

/** Marketing interactions worth counting. Deliberately a closed set. */
export type MarketingEvent =
  | "get_started_click"
  | "sign_in_click"
  | "pricing_cta_click"
  | "faq_open";

/** Non-identifying context only: where on the page, and which FAQ question. */
type EventParams = {
  location?: string;
  /** FAQ question text — site copy we authored, not user data. */
  question?: string;
};

declare global {
  interface Window {
    gtag?: (
      command: "event" | "config" | "js",
      target: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

export function track(event: MarketingEvent, params: EventParams = {}) {
  if (!analyticsEnabled) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
