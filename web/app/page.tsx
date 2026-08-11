import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import LandingStory from "@/components/landing/LandingStory";
import StructuredData from "@/components/landing/StructuredData";
import { createClient } from "@/lib/supabase/server";
import { stats } from "@/lib/data";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "@/components/landing/landing.css";

// The landing carries its own type system. Loading the faces here rather than
// in the root layout keeps the application pages' font payload untouched — this
// page is the only thing that pays for them.
const schibsted = Schibsted_Grotesk({
  variable: "--lp-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  variable: "--lp-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  // `absolute` so the site-wide "%s — InternTrack" template doesn't repeat the
  // brand on the one page that is already entirely about it.
  title: { absolute: `${SITE_NAME} — ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

/**
 * The public front door.
 *
 * Signed out, this is the marketing page. Signed in, it is a redirect — an
 * existing user should never have to scroll past the pitch to reach their own
 * feed. The check runs on the server, before any marketing HTML is generated,
 * so there is no flash of the landing page and nothing to hydrate away.
 *
 * The session is already fresh here: proxy.ts runs `updateSession` on every
 * matched request, so `getUser()` reflects the current cookie.
 */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  // ScrollSmoother takes over the page's scroll and needs a wrapper/content
  // pair it owns outright, which is why the shell is here rather than in the
  // root layout — the application pages must keep native scrolling.
  return (
    <div
      id="lp-wrapper"
      className={`${schibsted.variable} ${jetbrains.variable}`}
    >
      {/* Every reveal on this page starts at opacity 0 and is undone by a
          tween. Without scripting those tweens never run, so the content —
          including the primary CTA — would stay invisible. This is the
          standard no-flash fix: it costs nothing when JS is available. */}
      <noscript>
        <style>{`
          .lp-root, .lp-hero-body, .lp-hero-actions > *, .lp-chip-item,
          .lp-carousel-head > *, .lp-ccard, .lp-step, .lp-pricing-inner > *,
          .lp-faq-item, .lp-about-inner > *, .lp-cta-inner > *,
          .lp-row, .lp-detail, .lp-gaps, .lp-gate, .lp-sheet, .lp-chip {
            opacity: 1 !important;
            visibility: visible !important;
            transform: none !important;
            filter: none !important;
          }
          .lp-stage { height: auto !important; }
        `}</style>
      </noscript>

      <div id="lp-content">
        <StructuredData
          counts={{
            roles: stats.postings_tracked,
            companies: stats.companies,
            updated: stats.last_updated,
          }}
        />
        {/* Counts come from data.json, which the hourly scan rewrites — never
            from numbers typed into the copy. */}
        <LandingStory
          counts={{
            roles: stats.postings_tracked,
            companies: stats.companies,
            updated: stats.last_updated,
          }}
        />
      </div>
    </div>
  );
}
