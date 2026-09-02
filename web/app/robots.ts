import type { MetadataRoute } from "next";
import { PRIVATE_ROUTES, SITE_URL } from "@/lib/site";

/**
 * robots.txt, generated from the same route lists the sitemap uses so the two
 * can never disagree about what is public.
 *
 * Everything authenticated or user-specific is disallowed. This is a crawler
 * hint, not access control — the real protection is the session check on each
 * route plus row-level security in the database.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_ROUTES,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
