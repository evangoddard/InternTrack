"use client";

import { useEffect } from "react";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Clearance for the fixed marketing nav, so a target's heading is not left
 *  underneath it. Mirrors `scroll-margin-top` in landing.css for the path
 *  where the browser does the scrolling. */
const NAV_OFFSET = 76;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Makes in-page anchors work on the marketing site.
 *
 * They do not work on their own here, and the reason is ScrollSmoother: it
 * takes the page's scroll over, leaving `#lp-wrapper` as a `position: fixed`
 * box whose content it translates. A native anchor jump then scrolls *inside*
 * that fixed box while `window.scrollY` stays at 0 — so the section is
 * mispositioned, and because ScrollTrigger reads `window.scrollY` it also
 * believes nothing has scrolled and never fires the reveal that makes the
 * section visible. The result is a blank screen.
 *
 * So every same-page hash link is intercepted and routed through the smoother
 * (or through native smooth scrolling when the smoother is not running), which
 * moves the real scroll position and therefore keeps ScrollTrigger in sync.
 *
 * Also handles the cases a click handler alone would miss: a hash already in
 * the URL on first load, and back/forward between hashes.
 */
export function useHashScroll(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const scrollToId = (id: string, smooth: boolean) => {
      const target = document.getElementById(id);
      if (!target) return false;

      const smoother = ScrollSmoother.get?.();
      const useSmooth = smooth && !prefersReducedMotion();

      if (smoother) {
        // ScrollSmoother's own API — this moves the real scroll position, so
        // ScrollTrigger stays in sync and the reveals fire.
        smoother.scrollTo(target, useSmooth, `top ${NAV_OFFSET}px`);
      } else {
        const y =
          target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
        window.scrollTo({ top: y, behavior: useSmooth ? "smooth" : "auto" });
      }
      return true;
    };

    // Delegated, so it covers the header nav, the mobile sheet, and the footer
    // without any of them needing to know about this.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = (e.target as HTMLElement | null)?.closest?.("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#") || href === "#") return;

      const id = decodeURIComponent(href.slice(1));
      if (!document.getElementById(id)) return;

      e.preventDefault();
      if (scrollToId(id, true)) {
        // Push rather than assign the hash: assigning would trigger the very
        // native jump this handler exists to avoid, and pushing keeps
        // back/forward working.
        if (`#${id}` !== window.location.hash) {
          window.history.pushState(null, "", `#${id}`);
        }
      }
    };

    // Back/forward between hashes. Jumps rather than animates: browser history
    // navigation is expected to be instantaneous, and animating it fights the
    // browser's own scroll restoration for the same frame.
    const onPopState = () => {
      const id = window.location.hash.slice(1);
      if (!id) return;
      const decoded = decodeURIComponent(id);
      scrollToId(decoded, false);
      // Re-applied on the next two frames. `scrollRestoration = "manual"`
      // below is the first line of defence, but it is a single global that
      // ScrollSmoother also writes to, so it cannot be relied on alone —
      // whatever the browser restores after popstate gets overwritten here.
      requestAnimationFrame(() => {
        scrollToId(decoded, false);
        requestAnimationFrame(() => scrollToId(decoded, false));
      });
    };

    root.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);

    // The browser restores its own scroll position *after* popstate, which
    // overwrites the jump above and leaves back/forward changing the URL but
    // not the view. Taking restoration over is the standard fix when a page
    // manages its own scrolling; the previous mode is put back on cleanup so
    // this never leaks into the rest of the app.
    //
    // Deferred by a tick on purpose: ScrollSmoother.create() runs after this
    // effect and resets scrollRestoration to "auto", so setting it inline here
    // is silently undone a moment later.
    const priorRestoration = window.history.scrollRestoration;
    const restoreTimer = window.setTimeout(() => {
      if (priorRestoration) window.history.scrollRestoration = "manual";
    }, 0);

    // A hash present on first load. The browser will already have attempted
    // its own (broken) jump, so this waits for ScrollTrigger to finish
    // measuring and then redoes it properly, without animation — arriving at a
    // deep link should not replay a scroll the visitor did not ask for.
    let raf = 0;
    const initial = window.location.hash.slice(1);
    if (initial && document.getElementById(decodeURIComponent(initial))) {
      raf = requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        scrollToId(decodeURIComponent(initial), false);
      });
    }

    return () => {
      root.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
      window.clearTimeout(restoreTimer);
      if (priorRestoration) window.history.scrollRestoration = priorRestoration;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef]);
}
