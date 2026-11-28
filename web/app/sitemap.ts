import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, SITE_URL } from "@/lib/site";

/**
 * Sitemap.
 *
 * Only genuinely public, indexable pages — five of them. No per-posting URLs:
 * postings are rendered inside the authenticated feed rather than at their own
 * routes, so there is nothing there to index, and generating a page per posting
 * would be exactly the kind of thin-content sprawl to avoid.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
