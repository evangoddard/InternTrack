"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AUTH } from "./story";
import { track } from "@/lib/analytics";

/**
 * Sticky call to action, mobile only.
 *
 * Deliberately absent until the hero's own CTA has scrolled away, and hidden
 * again once the closing CTA is on screen — a persistent bar that duplicates a
 * button the user is already looking at is just lost screen space.
 *
 * Visibility is driven by IntersectionObserver rather than scroll offsets so
 * it stays correct regardless of page length, and it costs nothing per frame.
 *
 * `env(safe-area-inset-bottom)` in the stylesheet keeps it clear of the home
 * indicator. It never renders in the authenticated app — this component is
 * only mounted by the marketing page.
 */
export default function MobileCta() {
  const [show, setShow] = useState(false);
  const passedHero = useRef(false);
  const atFooter = useRef(false);

  useEffect(() => {
    const hero = document.querySelector(".lp-hero-actions");
    const end = document.querySelector(".lp-cta");
    if (!hero || !end) return;

    const sync = () => setShow(passedHero.current && !atFooter.current);

    const heroObs = new IntersectionObserver(
      ([e]) => {
        passedHero.current = !e.isIntersecting;
        sync();
      },
      { rootMargin: "0px" }
    );
    const endObs = new IntersectionObserver(
      ([e]) => {
        atFooter.current = e.isIntersecting;
        sync();
      },
      { rootMargin: "0px 0px -20% 0px" }
    );

    heroObs.observe(hero);
    endObs.observe(end);
    return () => {
      heroObs.disconnect();
      endObs.disconnect();
    };
  }, []);

  return (
    <div className={`lp-mobile-cta${show ? " is-on" : ""}`} aria-hidden={!show}>
      <Link
        href="/signup"
        className="lp-cta-btn is-primary"
        tabIndex={show ? undefined : -1}
        onClick={() => track("get_started_click", { location: "mobile_sticky" })}
      >
        {AUTH.primary}
      </Link>
    </div>
  );
}
