import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded social share card, generated rather than shipped as a binary.
 *
 * next/og renders this to a PNG on demand, so there is no static asset to
 * commit, keep in sync with the brand, or forget to update. Next also reuses it
 * for the Twitter card unless a twitter-image file exists.
 *
 * It uses the brand's colours but the platform's default sans rather than
 * Schibsted Grotesk: embedding the real face means shipping a .ttf and fetching
 * it per render, which is not worth it for a card that is mostly read at
 * thumbnail size. Swap in the font file if you want exact wordmark fidelity.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(160deg, #16181e 0%, #0b0c0e 62%)",
          color: "#f4f1ec",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginBottom: 44,
          }}
        >
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              background: "#ff6b4a",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#8e9198",
            }}
          >
            Internship search
          </div>
        </div>

        <div
          style={{
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: -4,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          {SITE_NAME}
        </div>

        <div
          style={{
            marginTop: 34,
            fontSize: 44,
            color: "#8e9198",
            letterSpacing: -1,
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div
          style={{
            position: "absolute",
            left: 90,
            bottom: 64,
            display: "flex",
            width: 132,
            height: 5,
            borderRadius: 3,
            background: "#ff6b4a",
          }}
        />
      </div>
    ),
    size
  );
}
