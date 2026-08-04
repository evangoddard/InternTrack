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
};

export default nextConfig;
