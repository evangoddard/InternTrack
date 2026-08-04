import type { Metadata } from "next";
import { Fraunces, Geist, IBM_Plex_Mono } from "next/font/google";
import HomeLink from "@/components/HomeLink";
import "./globals.css";

// Display face: high-contrast serif, carries the wordmark and section heads.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "SOFT", "WONK"],
});

// Body/UI face: everything else — labels, filters, feed rows, copy. A
// monospace font reads oddly for full sentences, so prose lives here.
const geist = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

// Numeral face: reserved for the résumé-match score badge only.
const plexMono = IBM_Plex_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "InternTrack — Internship Postings, Tracked",
  description:
    "A demo internship job feed: search, filter, and sort scraped postings, and rank them against a pasted resume — entirely client-side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${geist.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text font-body antialiased">
        <HomeLink />
        {children}
      </body>
    </html>
  );
}
