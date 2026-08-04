import type { NextConfig } from "next";

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
};

export default nextConfig;
