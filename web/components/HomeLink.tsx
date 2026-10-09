"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Most pages (Tracker, Résumé, auth) don't render the full Header, so
// without this there's no way back except the browser's back button.
//
// "Home" means the dashboard, not `/` — `/` is the marketing page now, and a
// signed-in user clicking it would only be bounced back here. Hidden on the
// pages it would point at.
export default function HomeLink() {
  const pathname = usePathname();
  // Only the authenticated app pages need it. The marketing page, the legal
  // pages, and the auth forms all carry their own way back, and a floating
  // "dashboard" link on a logged-out page would point somewhere the visitor
  // cannot go.
  const APP_PAGES = ["/tracker", "/resume", "/account", "/saved"];
  if (!APP_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <Link
      href="/dashboard"
      aria-label="Back to dashboard"
      className="fixed left-4 top-4 z-50 rounded-full border border-border bg-bg-raised/90 px-3 py-1.5 text-xs font-semibold text-text-muted backdrop-blur transition-colors hover:border-accent-bright hover:text-text"
    >
      ← Home
    </Link>
  );
}
