import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import LandingStory from "@/components/landing/LandingStory";
import { stats } from "@/lib/data";
import "@/components/landing/landing.css";

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
  title: { absolute: "InternTrack — landing preview" },
  description: "The logged-out marketing page, without the session check.",
  robots: { index: false, follow: false },
};

/**
 * The same landing page as `/`, minus the auth redirect.
 *
 * `/` sends anyone with a session straight to /dashboard, which means a
 * signed-in person — including whoever is working on it — cannot see the
 * marketing page at all without logging out. This route exists so the
 * logged-out view can be reviewed and iterated on without ending a session.
 *
 * It renders the identical component, so there is no second copy to keep in
 * sync: whatever you see here is what a logged-out visitor gets at `/`.
 */
export default function LandingPreviewPage() {
  return (
    <div
      id="lp-wrapper"
      className={`${schibsted.variable} ${jetbrains.variable}`}
    >
      <div id="lp-content">
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
