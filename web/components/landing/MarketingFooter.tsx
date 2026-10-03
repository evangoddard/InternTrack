import Link from "next/link";
import { BRAND, FOOTER_NOTE, NAV_LINKS } from "./story";
import { SUPPORT_EMAIL } from "@/lib/site";

/**
 * Public footer. Only carries links to things that exist.
 *
 * The support link renders only when SUPPORT_EMAIL is configured — a "Contact"
 * link pointing at an invented address is worse than no link at all.
 */
export default function MarketingFooter() {
  return (
    <footer className="lp-footer" aria-labelledby="lp-footer-heading">
      <h2 id="lp-footer-heading" className="lp-sr-only">
        Site footer
      </h2>

      <div className="lp-footer-inner">
        <div className="lp-footer-brand">
          <span className="lp-footer-mark">{BRAND}</span>
          <p className="lp-footer-note">{FOOTER_NOTE}</p>
        </div>

        <nav className="lp-footer-nav" aria-label="Footer">
          <div>
            <h3>Product</h3>
            <ul>
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Account</h3>
            <ul>
              <li>
                <Link href="/signup">Create account</Link>
              </li>
              <li>
                <Link href="/login">Sign in</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Legal</h3>
            <ul>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
              <li>
                <Link href="/terms">Terms</Link>
              </li>
              {SUPPORT_EMAIL ? (
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`}>Contact</a>
                </li>
              ) : null}
            </ul>
          </div>
        </nav>
      </div>

      {/* suppressHydrationWarning: server and client can straddle midnight on
          31 December and disagree on the year. Harmless, but it would surface
          as a hydration error. */}
      <p className="lp-footer-legal" suppressHydrationWarning>
        © {new Date().getFullYear()} {BRAND}
      </p>
    </footer>
  );
}
