"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BRAND, NAV_LINKS } from "./story";
import { track } from "@/lib/analytics";

/**
 * Public site navigation.
 *
 * Sticky, but only becomes opaque once the hero is behind it, so it does not
 * sit as a bar across the brand moment on first paint.
 *
 * Accessibility notes:
 *   - <nav> landmark with an accessible name.
 *   - The mobile toggle is a real button with aria-expanded/aria-controls.
 *   - Escape closes the panel and returns focus to the toggle.
 *   - The panel is removed from the tree when closed, so its links are never
 *     reachable by keyboard while invisible.
 */
export default function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav
      className={`lp-nav-bar${solid ? " is-solid" : ""}`}
      aria-label="Primary"
    >
      <div className="lp-nav-inner">
        <Link href="/" className="lp-nav-brand">
          {BRAND}
        </Link>

        <ul className="lp-nav-links">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="lp-nav-actions">
          <Link
            href="/login"
            className="lp-nav-signin"
            onClick={() => track("sign_in_click", { location: "nav" })}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="lp-nav-cta"
            onClick={() => track("get_started_click", { location: "nav" })}
          >
            Get Started
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="lp-nav-toggle"
          aria-expanded={open}
          aria-controls="lp-mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="lp-sr-only">
            {open ? "Close menu" : "Open menu"}
          </span>
          <span className={`lp-burger${open ? " is-open" : ""}`} aria-hidden>
            <i />
            <i />
          </span>
        </button>
      </div>

      {open ? (
        <div className="lp-nav-panel" id="lp-mobile-menu">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="lp-nav-panel-actions">
            <Link
              href="/login"
              className="lp-cta-btn"
              onClick={() => {
                track("sign_in_click", { location: "mobile_nav" });
                setOpen(false);
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="lp-cta-btn is-primary"
              onClick={() => {
                track("get_started_click", { location: "mobile_nav" });
                setOpen(false);
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      ) : null}
    </nav>
  );
}
