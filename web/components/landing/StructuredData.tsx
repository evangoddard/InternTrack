import { FAQ, fill, type LiveCounts } from "./story";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * JSON-LD for the marketing page.
 *
 * Three types, all of which the site genuinely supports:
 *   - WebSite       the site itself
 *   - Organization  the entity publishing it
 *   - SoftwareApplication  what the product is
 *   - FAQPage       the FAQ section, which is really on the page
 *
 * Explicitly NOT included: LocalBusiness (this is not a place), aggregateRating
 * or review (there are no reviews), award, and any offer beyond the fact that
 * it costs nothing — which is true because there is no billing in the product.
 *
 * No founder, employee count, address, or partnership is claimed, because none
 * of that is verifiable from the codebase.
 */
export default function StructuredData({ counts }: { counts: LiveCounts }) {
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/opengraph-image`,
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any modern web browser",
      // True: there is no billing anywhere in the product.
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: fill(f.a, counts) },
      })),
    },
  ];

  return (
    <script
      type="application/ld+json"
      // Server-rendered from our own constants; no user input reaches this.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
