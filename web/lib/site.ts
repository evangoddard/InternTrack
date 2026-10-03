/**
 * Canonical facts about the site, in one place.
 *
 * Everything here is used for metadata, structured data, sitemap, and robots.
 * Nothing in this file may be aspirational — it is the source of truth for
 * what the public site claims about itself.
 */

/**
 * Absolute origin, used for canonical URLs, Open Graph tags, and the sitemap.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ MUST BE SET BEFORE LAUNCH                                             │
 * │                                                                       │
 * │ Set NEXT_PUBLIC_SITE_URL to the real domain once it is registered —   │
 * │ e.g. https://interntrack.com — in the deployment environment.         │
 * │                                                                       │
 * │ Until then every canonical URL, og:url, og:image and sitemap entry    │
 * │ resolves to http://localhost:3000. Search engines and social          │
 * │ scrapers would index and preview URLs nobody can reach, so the site   │
 * │ is effectively un-indexable until this is changed.                    │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * On Vercel, VERCEL_PROJECT_PRODUCTION_URL is picked up automatically as a
 * fallback, so deploys are self-consistent even before a custom domain is
 * attached. The localhost default only applies to local development.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

export const SITE_NAME = "InternTrack";

/**
 * NEEDS YOUR INPUT: set NEXT_PUBLIC_SUPPORT_EMAIL to a real inbox and the
 * footer's Contact link appears. Left unset, the link is omitted entirely —
 * an invented support address is worse than no contact link at all.
 */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";

export const SITE_TAGLINE = "Your internship search, organized.";

export const SITE_DESCRIPTION =
  "Discover relevant internships, strengthen your applications, and track every opportunity in one place.";

/**
 * Routes that are public and safe to index. Everything not listed here is
 * either authenticated, user-specific, or an API surface, and is disallowed in
 * robots.txt and omitted from the sitemap.
 */
export const PUBLIC_ROUTES = [
  { path: "/", changeFrequency: "weekly" as const, priority: 1 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.5 },
];

/**
 * Anything user-specific, authenticated, or machine-facing. Kept as one list so
 * robots.txt and the sitemap can never drift apart.
 */
export const PRIVATE_ROUTES = [
  "/dashboard",
  "/dashboard-classic",
  "/workspace",
  "/tracker",
  "/resume",
  "/account",
  "/saved",
  "/api/",
  "/auth/",
  "/landing-preview",
];
