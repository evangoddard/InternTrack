import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import HomeLink from "@/components/HomeLink";
import Analytics from "@/components/Analytics";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

// Same faces as the marketing landing, so the type does not change underneath
// someone the moment they sign in. Loaded twice under two variable names
// because display and body are the same grotesque at different sizes and
// tracking; next/font dedupes the actual payload.

// Display face: carries the wordmark and section heads.
const schibstedDisplay = Schibsted_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// Body/UI face: everything else — labels, filters, feed rows, copy.
const schibstedBody = Schibsted_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Numeral face: reserved for the résumé-match score badge only. The mono is
// what makes the product read as an instrument rather than a brochure.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  // metadataBase makes every relative canonical/OG URL below resolve to an
  // absolute one, which is what crawlers and social scrapers require.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Your internship search, organized.`,
    // Each page supplies its own title; this frames it without repetition.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Your internship search, organized.`,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Your internship search, organized.`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The pre-paint script below sets data-theme from localStorage, which
      // the server cannot know. React 19 diffs attributes on <html>, so
      // without this the correct behaviour reports as a hydration mismatch.
      // Scoped to this element's own attributes — the subtree is unaffected.
      suppressHydrationWarning
      className={`${schibstedDisplay.variable} ${schibstedBody.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        {/* Runs before first paint so the stored appearance is applied without
            a flash of the default theme. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text font-body antialiased">
        <HomeLink />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
