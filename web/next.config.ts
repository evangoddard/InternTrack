import type { NextConfig } from "next";

// Static export config: this app has no backend/server, so it builds down to
// plain HTML/CSS/JS in `out/` that can be hosted on Vercel, GitHub Pages, or
// any static file host. `images.unoptimized` is required because static
// export can't run the Next.js image optimization server.
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
