import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * Built from what the app actually loads, verified against the codebase
 * rather than guessed:
 *
 *   connect-src   Supabase REST/Auth/Storage (the project origin, plus its
 *                 wss:// channel), and GA when an ID is configured.
 *   img-src       icons.duckduckgo.com for company favicons (lib/companyLogo.ts);
 *                 data: and blob: for inline SVG and object URLs.
 *   script-src    'self' plus googletagmanager when analytics is enabled.
 *   font-src      self only -- next/font self-hosts Google Fonts at build
 *                 time, so nothing is fetched from fonts.gstatic.com.
 *   frame-ancestors 'none'  clickjacking protection; this app is never framed.
 *
 * KNOWN WEAK POINT: script-src carries 'unsafe-inline'. Next.js streams
 * hydration data through inline <script> tags whose content changes per
 * request, and the pre-paint theme script in app/layout.tsx is inline by
 * necessity (it must run before first paint to avoid a flash of the wrong
 * theme). Removing 'unsafe-inline' requires a per-request nonce generated
 * in proxy.ts and threaded through every inline script, which forces
 * dynamic rendering on the marketing page. That is a deliberate, reversible
 * tradeoff -- not a wildcard: no external script origin is allowed beyond
 * googletagmanager, and object-src/base-uri/form-action are all locked down.
 * The nonce upgrade is the documented next step if this app ever handles
 * anything more sensitive than internship bookmarks.
 *
 * style-src also needs 'unsafe-inline': next/font injects inline @font-face
 * blocks, and the app sets inline style attributes for progress-bar widths.
 */
function contentSecurityPolicy(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
  const supabaseSocket = supabaseOrigin.replace(/^https:/, "wss:");
  const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

  const connect = ["'self'", supabaseOrigin, supabaseSocket]
    .concat(gaEnabled ? ["https://www.google-analytics.com", "https://region1.google-analytics.com"] : [])
    .filter(Boolean);

  const script = ["'self'", "'unsafe-inline'"].concat(
    gaEnabled ? ["https://www.googletagmanager.com"] : []
  );

  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://icons.duckduckgo.com",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    // Nothing in this app embeds or is embedded.
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Stops an injected <base> from rewriting every relative URL, and stops
    // a form from being retargeted at an attacker's collector.
    "base-uri 'self'",
    "form-action 'self'",
    ...(isProd ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

// No longer statically exported -- accounts, saved postings, and résumé
// upload all need a server (auth cookies, Supabase server client, storage
// uploads), so this deploys to Vercel as a normal Next.js app now.
const nextConfig: NextConfig = {
  // pdf-parse (via pdfjs-dist) tries to spin up a web-worker-style module at
  // runtime; Next's bundler rewrites the path to that worker file and it
  // stops resolving, throwing "Setting up fake worker failed". Excluding it
  // from bundling lets it load as a plain Node module instead, where its
  // own worker resolution works correctly.
  serverExternalPackages: ["pdf-parse"],

  // Hides the dev-only route/build-activity badge Next.js overlays in the
  // corner during `npm run dev` -- it never shows in production, but it was
  // getting in the way while working locally.
  devIndicators: false,

  // Applied to every response, including pages, API routes, and static
  // assets. Nothing here depends on a Vercel-specific feature, so the same
  // headers hold on any Node host.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          // Stops a browser from re-interpreting a response as a type we
          // did not send -- e.g. treating an uploaded file as HTML.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Belt-and-braces with frame-ancestors above, for older browsers
          // that never implemented CSP framing.
          { key: "X-Frame-Options", value: "DENY" },
          // Send the origin cross-site, the full path same-site. Keeps
          // authenticated paths out of third-party referer logs.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app asks for none of these; deny them outright so injected
          // content cannot either.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
          },
          // Isolates this origin from cross-origin popups it opens.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  // Two years, subdomains included. Not set in development,
                  // where localhost is plain http.
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
      {
        // Authenticated surfaces: never cached by a proxy or the browser's
        // back/forward store, so a shared machine cannot show the previous
        // user's data.
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
    ];
  },
};

export default nextConfig;
