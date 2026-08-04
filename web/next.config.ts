import type { NextConfig } from "next";

// No longer statically exported -- accounts, saved postings, and résumé
// upload all need a server (auth cookies, Supabase server client, storage
// uploads), so this deploys to Vercel as a normal Next.js app now.
const nextConfig: NextConfig = {};

export default nextConfig;
