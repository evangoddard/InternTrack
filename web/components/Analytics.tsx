import Script from "next/script";
import { GA_ID, analyticsEnabled } from "@/lib/analytics";

/**
 * Google Analytics, loaded only when a measurement ID is configured.
 *
 * Renders nothing at all without NEXT_PUBLIC_GA_MEASUREMENT_ID, so local
 * development and any deployment without the variable ship no third-party
 * script and set no cookies.
 *
 * `afterInteractive` rather than `beforeInteractive`: analytics must never sit
 * on the critical path for first paint.
 */
export default function Analytics() {
  if (!analyticsEnabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
