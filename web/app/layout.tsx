import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Display face: high-contrast serif, carries the wordmark and section heads.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  axes: ["opsz", "SOFT", "WONK"],
});

// Text face: also doubles as the numeral/mono voice for dates, scores, labels.
const plexMono = IBM_Plex_Mono({
  variable: "--font-text",
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
    <html lang="en" className={`${fraunces.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-text font-text antialiased">
        {children}
      </body>
    </html>
  );
}
