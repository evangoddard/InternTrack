"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

import Workspace from "./Workspace";
import ChipletGlyph from "./Chiplet";
import MarketingNav from "./MarketingNav";
import MarketingFooter from "./MarketingFooter";
import Faq from "./Faq";
import MobileCta from "./MobileCta";
import FeatureCards from "./FeatureCards";
import { useHashScroll } from "./useHashScroll";
import { track as trackEvent } from "@/lib/analytics";
import {
  AUTH,
  BRAND,
  CANVAS,
  CAPTIONS,
  CHIPLETS,
  CTA,
  STEPS,
  PRICING,
  ABOUT,
  HERO,
  HERO_COPY,
  MOTION,
  ROW_H,
  fill,
  type LiveCounts,
} from "./story";

gsap.registerPlugin(useGSAP, ScrollTrigger, ScrollSmoother, SplitText);

/** Set false to rule the smoother out while tuning — everything else works
 *  identically on native scroll, since `scrub` does the easing. */
const USE_SMOOTHER = true;

/** Scroll consumed by the pinned sequence, in viewport heights. Four acts now
 *  rather than nine, so the pinned stretch is a section of the page instead of
 *  the whole of it. */
const SCROLL_VH = 7.5;

const MAX_Z = 2.2;
const FILL = 0.92;

const CINEMATIC_MQ =
  "(min-width: 1080px) and (prefers-reduced-motion: no-preference)";

/**
 * Camera waypoints. Four acts, but each still moves internally — the shots
 * below are the beats *within* the acts, which is what keeps a longer act from
 * feeling like a static hold.
 */
const SHOTS = {
  open: { at: "workspace", w: 2700, dy: 20 },
  upload: { at: "resume", w: 1150, dx: 320 },
  read: { at: "resume", w: 1000, dx: 270, dy: 40 },
  gather: { at: "feed", w: 1780, dx: 60 },
  narrow: { at: "feed", w: 1320, dy: -60 },
  explain: { at: "detail", w: 1420, dx: -330, dy: -10 },
  gaps: { at: "gaps", w: 1000, dx: -40 },
  save: { at: "tracker", w: 1500, dx: -420 },
  advance: { at: "tracker", w: 1120, dx: -20, dy: -70 },
  wide: { at: "workspace", w: 2360, dy: 55 },
} as const;

type ShotName = keyof typeof SHOTS;
type Mark = { cx: number; cy: number; w: number; h: number };

export default function LandingStory({ counts }: { counts: LiveCounts }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const camera = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const fit = useRef<HTMLDivElement>(null);
  const ticks = useRef<HTMLDivElement>(null);

  const marks = useRef<Record<string, Mark>>({});

  // In-page anchors need routing through ScrollSmoother — see useHashScroll.
  useHashScroll(root);

  // Failsafe, deliberately outside every GSAP context. `.lp-root` is hidden in
  // CSS and revealed by the intro tween; if that tween never runs — a bundle
  // error, a plugin failing to register — the page would stay blank forever.
  // Nothing about the marketing site is important enough to justify that.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const el = root.current;
      if (el && getComputedStyle(el).visibility === "hidden") {
        el.style.opacity = "1";
        el.style.visibility = "visible";
      }
    }, 2500);
    return () => window.clearTimeout(t);
  }, []);

  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    const done = () => live && setFontsReady(true);
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(done);
    } else {
      done();
    }
    return () => {
      live = false;
    };
  }, []);

  // ScrollSmoother owns the page's scroll proxy, so its create/kill pair lives
  // in one effect of its own — sharing a context with the story meant React's
  // double-invoke could kill the instance while its proxy stayed registered,
  // after which ScrollTrigger read a scroll position of zero forever.
  useGSAP(
    () => {
      if (!USE_SMOOTHER) return;
      if (!window.matchMedia(CINEMATIC_MQ).matches) return;

      // Elements, not selector strings: useGSAP runs this inside a context
      // scoped to `.lp-root`, and the wrapper/content pair are its ancestors.
      const wrapper = document.getElementById("lp-wrapper");
      const content = document.getElementById("lp-content");
      if (!wrapper || !content) return;

      const smoother =
        ScrollSmoother.get() ??
        ScrollSmoother.create({
          wrapper,
          content,
          smooth: 1.05,
          effects: false,
          normalizeScroll: true,
        });
      return () => smoother.kill();
    },
    { scope: root }
  );

  useGSAP(
    () => {
      if (!fontsReady) return;
      const scope = root.current!;
      const q = <T extends Element = HTMLElement>(name: string) =>
        gsap.utils.toArray<T>(`[data-el="${name}"]`, scope);
      const one = (name: string) =>
        scope.querySelector<HTMLElement>(`[data-el="${name}"]`);

      const fitScale = () => window.innerHeight / CANVAS.H;
      const applyFit = () =>
        gsap.set(fit.current, {
          scale: fitScale(),
          transformOrigin: "50% 50%",
        });

      // Measured once: the canvas is authored in absolute pixels, so a resize
      // changes `fitScale` and nothing inside.
      const measure = () => {
        const cv = canvas.current!;
        gsap.set(camera.current, {
          scale: 1,
          x: 0,
          y: 0,
          rotationX: 0,
          transformOrigin: "50% 50%",
        });
        const cr = cv.getBoundingClientRect();
        const s = cr.width / CANVAS.W || 1;
        const ox = cr.left + cr.width / 2;
        const oy = cr.top + cr.height / 2;
        const read = (el: Element): Mark => {
          const r = el.getBoundingClientRect();
          return {
            w: r.width / s,
            h: r.height / s,
            cx: (r.left + r.width / 2 - ox) / s,
            cy: (r.top + r.height / 2 - oy) / s,
          };
        };
        const m: Record<string, Mark> = {};
        cv.querySelectorAll<HTMLElement>("[data-focus]").forEach((el) => {
          m[el.dataset.focus!] = read(el);
        });
        cv.querySelectorAll<HTMLElement>("[data-slot]").forEach((el) => {
          m[`slot:${el.dataset.slot!}`] = read(el);
        });
        const tc = one("travel");
        if (tc) m["travel"] = read(tc);
        marks.current = m;
      };

      const shot = (name: ShotName) => {
        const s = SHOTS[name] as {
          at: string;
          w: number;
          dx?: number;
          dy?: number;
        };
        const m = marks.current[s.at];
        if (!m) return { scale: 1, x: 0, y: 0 };
        const z = Math.min(
          (window.innerWidth * FILL) / (s.w * fitScale()),
          MAX_Z
        );
        return {
          scale: z,
          x: -(m.cx + (s.dx ?? 0)) * z,
          y: -(m.cy + (s.dy ?? 0)) * z,
        };
      };
      const cam = (n: ShotName, extra: gsap.TweenVars = {}) => ({
        scale: () => shot(n).scale,
        x: () => shot(n).x,
        y: () => shot(n).y,
        ...extra,
      });
      const toSlot = (key: string) => {
        const s = marks.current[`slot:${key}`];
        const t = marks.current["travel"];
        if (!s || !t) return { x: 0, y: 0 };
        return { x: s.cx - t.cx, y: s.cy - t.cy };
      };

      // --- text -----------------------------------------------------------
      const splitOf = new Map<HTMLElement, SplitText>();
      const splitHead = (el: HTMLElement | null) => {
        if (!el) return null;
        const s = SplitText.create(el, {
          type: "lines,words",
          mask: "lines",
          linesClass: "lp-line",
          wordsClass: "lp-word",
        });
        splitOf.set(el, s);
        return s;
      };

      const capEls = gsap.utils.toArray<HTMLElement>(".lp-cap", scope);
      const capSplits = capEls.map((c) =>
        splitHead(c.querySelector<HTMLElement>(".lp-cap-head"))
      );
      const heroSplit = splitHead(
        scope.querySelector<HTMLElement>(".lp-hero-head")
      );
      // The wordmark splits per character rather than per word — it is one
      // word, and the brand moment is worth the finer grain.
      const markEl = scope.querySelector<HTMLElement>(".lp-wordmark-text");
      const markSplit = markEl
        ? SplitText.create(markEl, {
            type: "chars",
            mask: "chars",
            charsClass: "lp-char",
          })
        : null;
      if (markEl && markSplit) splitOf.set(markEl, markSplit);
      const ctaSplit = splitHead(
        scope.querySelector<HTMLElement>(".lp-cta-head")
      );

      // --- responsive branches --------------------------------------------
      const mm = gsap.matchMedia();

      mm.add(
        { full: CINEMATIC_MQ, plain: `not all and ${CINEMATIC_MQ}` },
        (ctx) => {
          const { full } = ctx.conditions as { full: boolean };

          /**
           * Lays the workspace out as a plain scaled product shot rather than a
           * camera subject — the canvas becomes a picture instead of a stage.
           * Shared by the reduced-motion branch and the returning-visitor
           * showcase, which want the same thing for different reasons.
           */
          const flattenWorkspace = () => {
            const host = scope.querySelector<HTMLElement>(".lp-canvas-host")!;
            const layout = () => {
              const s = Math.min(
                (window.innerWidth * 0.92) / CANVAS.W,
                (window.innerHeight * 0.78) / CANVAS.H
              );
              // yPercent/y stated explicitly: GSAP parses the element's existing
              // CSS transform as a starting point, and the base rule's
              // translate(-50%, -50%) would otherwise survive as a Y offset.
              gsap.set(host, {
                xPercent: -50,
                yPercent: 0,
                x: 0,
                y: 0,
                scale: s,
              });
              fit.current!.style.height = `${Math.round(CANVAS.H * s)}px`;
            };
            layout();
            window.addEventListener("resize", layout);
            return () => window.removeEventListener("resize", layout);
          };

          /**
           * The counters in the markup start at zero because the pinned
           * sequence ticks them up. Any mode that skips that sequence has to
           * write the settled values in, or the product shot advertises "0 live
           * · 0 companies" and a match score of nothing.
           */
          const settleCounters = () => {
            const set = (name: string, v: number) => {
              const el = one(name);
              if (el) el.textContent = String(v);
            };
            set("count", counts.roles);
            set("countCos", counts.companies);
            set("detailNum", HERO.match);
          };

          if (!full) {
            scope.classList.add("lp-static");
            settleCounters();
            return flattenWorkspace();
          }

          // The tour is a first-visit event; every visit after it gets the
          // showcase. Read here rather than pre-paint because the page is
          // invisible until the fonts land anyway.
          let tourDone = false;
          try {
            tourDone = localStorage.getItem("it-tour") === "done";
          } catch {
            // Safari private mode throws rather than returning null. Treating
            // that as "not seen" means the tour plays every time, which is the
            // gentler failure of the two.
          }

          if (!tourDone) {
            applyFit();
            measure();
          }

          // ---- reveal helpers ------------------------------------------
          //
          // Two flavours, because "duration" means different things either side
          // of a scrub. In normal time it is seconds and the measured numbers
          // apply directly; inside the pinned timeline it is scroll distance,
          // so only the ease and the stagger:duration ratio carry over.

          /** On-enter reveal, in seconds. The measured values, used literally. */
          const revealOnEnter = (
            targets: gsap.TweenTarget,
            trigger: Element,
            vars: gsap.TweenVars = {}
          ) =>
            gsap.fromTo(
              targets,
              { autoAlpha: 0, y: 22 },
              {
                autoAlpha: 1,
                y: 0,
                duration: MOTION.reveal,
                ease: MOTION.ease,
                stagger: MOTION.stagger,
                scrollTrigger: {
                  trigger,
                  start: "top 78%",
                  toggleActions: "play none none none",
                },
                ...vars,
              }
            );

          /** The page below the workspace. Identical in both modes — it is the
           *  ordinary site, and the tour is the thing layered on top of it. */
          const revealSections = () => {
            revealOnEnter(".lp-chip-item", scope.querySelector(".lp-chip-row")!);
            revealOnEnter(
              ".lp-carousel-head > *",
              scope.querySelector(".lp-carousel")!,
              { stagger: 0.12 }
            );
            revealOnEnter(".lp-ccard", scope.querySelector(".lp-track")!);
            revealOnEnter(".lp-step", scope.querySelector(".lp-steps")!);
            revealOnEnter(
              ".lp-pricing-inner > *",
              scope.querySelector(".lp-pricing")!,
              { stagger: 0.1 }
            );
            revealOnEnter(".lp-faq-item", scope.querySelector(".lp-faq")!, {
              stagger: 0.08,
            });
            revealOnEnter(".lp-about-inner > *", scope.querySelector(".lp-about")!, {
              stagger: 0.1,
            });
            revealOnEnter(".lp-cta-inner > *", scope.querySelector(".lp-cta")!, {
              stagger: 0.12,
            });
            gsap.fromTo(
              ctaSplit!.words,
              { yPercent: 115, opacity: 0 },
              {
                yPercent: 0,
                opacity: 1,
                duration: MOTION.reveal,
                ease: MOTION.ease,
                stagger: MOTION.stagger * 0.28,
                scrollTrigger: {
                  trigger: scope.querySelector(".lp-cta")!,
                  start: "top 72%",
                  toggleActions: "play none none none",
                },
              }
            );
          };

          /** Stagger for a scrubbed group, holding the measured ratio. Large
           *  groups get a bounded total spread — thirty-four rows at the raw
           *  per-item interval would run far longer than the act itself. */
          const scrubStagger = (dur: number, count: number, cap = 1.2) =>
            count * dur * MOTION.staggerRatio > cap
              ? { amount: cap, from: "start" as const }
              : { each: dur * MOTION.staggerRatio, from: "start" as const };

          // ---- hero ----------------------------------------------------
          // The brand lands first and alone: characters rise out of their masks,
          // and only once the wordmark is whole does anything else arrive. The
          // stagger is tightened from the measured 0.16s because eleven glyphs
          // at the full interval would take longer to spell the name than a
          // visitor will wait for it.
          const heroTl = gsap.timeline({ delay: 0.2 });
          heroTl
            .fromTo(
              markSplit!.chars,
              { yPercent: 118, opacity: 0 },
              {
                yPercent: 0,
                opacity: 1,
                duration: MOTION.reveal * 1.15,
                ease: MOTION.ease,
                stagger: MOTION.stagger * 0.34,
              }
            )
            .fromTo(
              ".lp-wordmark",
              { letterSpacing: "0.06em" },
              {
                letterSpacing: "-0.035em",
                duration: MOTION.reveal * 1.6,
                ease: MOTION.ease,
              },
              0
            )
            .fromTo(
              heroSplit!.words,
              { yPercent: 115, opacity: 0 },
              {
                yPercent: 0,
                opacity: 1,
                duration: MOTION.reveal,
                ease: MOTION.ease,
                stagger: MOTION.stagger * 0.28,
              },
              0.85
            )
            .fromTo(
              ".lp-hero-body",
              { autoAlpha: 0, y: 16 },
              { autoAlpha: 1, y: 0, duration: MOTION.reveal, ease: MOTION.ease },
              1.15
            )
            .fromTo(
              ".lp-hero-actions > *",
              { autoAlpha: 0, y: 14 },
              {
                autoAlpha: 1,
                y: 0,
                duration: MOTION.reveal,
                ease: MOTION.ease,
                stagger: MOTION.stagger * 0.6,
              },
              1.35
            )
            .fromTo(
              ".lp-scrollhint",
              { autoAlpha: 0, y: 8 },
              { autoAlpha: 1, y: 0, duration: 0.6, ease: MOTION.ease },
              1.7
            );

          // Hero → story handoff. Scrubbed against the hero's own exit so the
          // brand recedes as the product arrives rather than cutting away: the
          // wordmark pushes toward the viewer, softens, and dissolves. Same
          // depth language as the camera, applied to type.
          gsap.to(".lp-hero-inner", {
            scale: 1.14,
            autoAlpha: 0,
            filter: "blur(14px)",
            ease: "none",
            scrollTrigger: {
              trigger: ".lp-hero",
              start: "top top",
              end: "bottom top",
              scrub: 0.9,
            },
          });
          gsap.to(".lp-scrollhint", {
            autoAlpha: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".lp-hero",
              start: "top top",
              end: "20% top",
              scrub: 0.5,
            },
          });

          // ---- returning visitor: showcase, no pin ----------------------
          //
          // The default state of the site. The workspace is a product shot that
          // reveals once on enter, and the page is an ordinary scrolling
          // document — nothing is pinned and nothing is scrubbed.
          if (tourDone) {
            scope.classList.add("lp-showcase");
            settleCounters();
            const unflatten = flattenWorkspace();
            revealOnEnter(".lp-canvas-host", stage.current!, {
              y: 44,
              duration: MOTION.reveal * 1.2,
            });
            revealSections();
            return () => {
              unflatten();
              heroTl.kill();
            };
          }

          // ---- first visit: the pinned sequence --------------------------
          const rows = q("row");
          const keepers = rows.filter((r) => r.dataset.keep === "1");
          const drops = rows.filter((r) => r.dataset.keep !== "1");
          const heroRow = rows.find((r) => r.dataset.hero === "1")!;
          const chips = q("chip");
          const missing = q("missing");
          const gapFills = q("gapFill");
          const travel = one("travel")!;
          const counter = { roles: 0, cos: 0, score: 0 };
          const countEl = one("count")!;
          const cosEl = one("countCos")!;
          const scoreEl = one("detailNum")!;

          const tl = gsap.timeline({
            defaults: { ease: MOTION.ease },
            scrollTrigger: {
              trigger: stage.current,
              start: "top top",
              end: () => "+=" + window.innerHeight * SCROLL_VH,
              pin: stage.current,
              pinSpacing: true,
              scrub: 0.9,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              // Marked spent only once the sequence has actually been scrolled
              // through. Setting it on load would burn the tour on a bounce.
              onLeave: () => {
                try {
                  localStorage.setItem("it-tour", "done");
                } catch {
                  /* private mode — the tour simply plays again next time */
                }
              },
              onUpdate: (self) => {
                const i = Math.min(
                  CAPTIONS.length - 1,
                  Math.floor(self.progress * CAPTIONS.length)
                );
                const el = ticks.current;
                if (el && el.dataset.act !== String(i)) {
                  el.dataset.act = String(i);
                  el.querySelectorAll(".lp-tick").forEach((t, n) =>
                    t.classList.toggle("is-on", n <= i)
                  );
                }
              },
            },
          });

          const capIn = (i: number, at: number) => {
            const el = capEls[i];
            tl.fromTo(
              el,
              { autoAlpha: 0 },
              {
                autoAlpha: 1,
                duration: 0.3,
                immediateRender: false,
              },
              at
            )
              .fromTo(
                el.querySelector(".lp-cap-eyebrow"),
                { autoAlpha: 0, y: 10 },
                { autoAlpha: 1, y: 0, duration: 0.4, immediateRender: false },
                at
              )
              .fromTo(
                capSplits[i]!.words,
                { yPercent: 115, opacity: 0 },
                {
                  yPercent: 0,
                  opacity: 1,
                  duration: 0.8,
                  stagger: 0.8 * MOTION.staggerRatio * 0.3,
                  immediateRender: false,
                },
                at + 0.08
              );
            const body = el.querySelector(".lp-cap-body");
            if (body) {
              tl.fromTo(
                body,
                { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.6, immediateRender: false },
                at + 0.3
              );
            }
          };
          const capOut = (i: number, at: number) =>
            tl.to(
              capEls[i],
              { autoAlpha: 0, y: -20, filter: "blur(7px)", duration: 0.5 },
              at
            );

          let t = 0;

          // Establishing frame: the whole workspace, tipped back.
          tl.fromTo(
            camera.current,
            cam("open", { rotationX: 9, transformOrigin: "50% 50%" }),
            cam("open", { rotationX: 9, duration: 0.4 }),
            t
          );
          t += 0.4;

          // ---- ACT 1 — upload ------------------------------------------
          // The camera pushes into the rail, a résumé lands, a scan crosses it,
          // and the skills it found settle out underneath.
          tl.to(camera.current, cam("upload", { rotationX: 0, duration: 1.3 }), t)
            .to(".lp-vignette", { opacity: 0.5, duration: 1.3 }, t)
            .to(one("tracker"), { filter: "blur(5px)", opacity: 0.5, duration: 1 }, t)
            .fromTo(
              one("dropHint"),
              { autoAlpha: 1 },
              { autoAlpha: 0, duration: 0.3, immediateRender: false },
              t + 0.45
            )
            .fromTo(
              one("sheet"),
              { autoAlpha: 0, y: -70, scale: 0.9, rotate: -3 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                rotate: 0,
                duration: 0.95,
                immediateRender: false,
              },
              t + 0.5
            )
            .fromTo(
              one("drop"),
              { borderColor: "rgba(255,255,255,0.10)" },
              {
                borderColor: "rgba(255,107,74,0.55)",
                duration: 0.3,
                immediateRender: false,
              },
              t + 0.5
            );
          capIn(0, t + 0.5);
          t += 1.6;

          tl.to(camera.current, cam("read", { duration: 1.0 }), t)
            .fromTo(
              one("scanline"),
              { autoAlpha: 0, yPercent: -10 },
              { autoAlpha: 1, duration: 0.2, ease: "none", immediateRender: false },
              t + 0.3
            )
            .to(one("scanline"), { yPercent: 1000, duration: 1.1, ease: "none" }, t + 0.3)
            .to(one("scanline"), { autoAlpha: 0, duration: 0.2 }, t + 1.3)
            .fromTo(
              chips,
              { autoAlpha: 0, y: 10, scale: 0.94 },
              {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.55,
                stagger: scrubStagger(0.55, chips.length, 0.9),
                immediateRender: false,
              },
              t + 0.5
            );
          t += 2.0;

          // ---- ACT 2 — match -------------------------------------------
          // Pull back, fill the feed, then collapse it to what clears.
          capOut(0, t);
          tl.to(camera.current, cam("gather", { duration: 1.4 }), t)
            .to(one("rail"), { filter: "blur(4px)", opacity: 0.55, duration: 1 }, t)
            .to(".lp-vignette", { opacity: 0.3, duration: 1.2 }, t)
            .fromTo(
              rows,
              { autoAlpha: 0, y: 14 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.6,
                stagger: scrubStagger(0.6, rows.length),
                immediateRender: false,
              },
              t + 0.35
            )
            .fromTo(
              one("rows"),
              { y: 0 },
              { y: -210, duration: 1.9, ease: "none", immediateRender: false },
              t + 0.4
            )
            .fromTo(
              counter,
              { roles: 0, cos: 0 },
              {
                roles: counts.roles,
                cos: counts.companies,
                duration: 1.6,
                immediateRender: false,
                onUpdate: () => {
                  countEl.textContent = String(Math.round(counter.roles));
                  cosEl.textContent = String(Math.round(counter.cos));
                },
              },
              t + 0.35
            );
          capIn(1, t + 0.4);
          t += 2.2;

          tl.to(camera.current, cam("narrow", { duration: 1.1 }), t)
            .to(one("rows"), { y: 0, duration: 1.1 }, t)
            .to(
              drops,
              {
                autoAlpha: 0,
                scale: 0.97,
                duration: 0.5,
                stagger: { amount: 0.4, from: "end" },
              },
              t + 0.2
            )
            .to(
              keepers,
              {
                // Each survivor slides up by however many dropped rows sat above
                // it. Transform only — the list never re-lays-out.
                y: (i: number, target: HTMLElement) =>
                  (i - rows.indexOf(target)) * ROW_H,
                duration: 0.9,
                stagger: scrubStagger(0.9, keepers.length, 0.35),
              },
              t + 0.45
            )
            .fromTo(
              one("filterPill"),
              {
                color: "rgba(244,241,236,0.45)",
                borderColor: "rgba(255,255,255,0.12)",
              },
              {
                color: "#0B0C0E",
                borderColor: "transparent",
                backgroundColor: "#FF6B4A",
                duration: 0.4,
                immediateRender: false,
              },
              t + 0.5
            );
          t += 1.9;

          // ---- ACT 3 — explain -----------------------------------------
          // Zoom into the single strongest match, then down into the gaps.
          capOut(1, t);
          tl.to(camera.current, cam("explain", { duration: 1.2 }), t)
            .to(
              keepers.filter((r) => r !== heroRow),
              { opacity: 0.22, duration: 0.6 },
              t + 0.3
            )
            .to(heroRow, { scale: 1.045, duration: 0.6 }, t + 0.3)
            .fromTo(
              one("detail"),
              { autoAlpha: 0, x: 46, scale: 0.97, filter: "blur(10px)" },
              {
                autoAlpha: 1,
                x: 0,
                scale: 1,
                filter: "blur(0px)",
                duration: 0.95,
                immediateRender: false,
              },
              t + 0.45
            )
            .fromTo(
              counter,
              { score: 0 },
              {
                score: HERO.match,
                duration: 0.9,
                immediateRender: false,
                onUpdate: () => {
                  scoreEl.textContent = String(Math.round(counter.score));
                },
              },
              t + 0.6
            )
            .fromTo(
              q("have"),
              { autoAlpha: 0, y: 8 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.45,
                stagger: 0.45 * MOTION.staggerRatio,
                immediateRender: false,
              },
              t + 0.85
            )
            .fromTo(
              missing,
              { autoAlpha: 0, y: 8 },
              {
                autoAlpha: 1,
                y: 0,
                duration: 0.45,
                stagger: 0.45 * MOTION.staggerRatio,
                immediateRender: false,
              },
              t + 1.05
            )
            .fromTo(
              one("gate"),
              { autoAlpha: 0, y: 10 },
              { autoAlpha: 1, y: 0, duration: 0.45, immediateRender: false },
              t + 1.2
            );
          capIn(2, t + 0.4);
          t += 2.1;

          tl.to(camera.current, cam("gaps", { duration: 1.0 }), t)
            .to(one("feed"), { filter: "blur(6px)", opacity: 0.4, duration: 0.9 }, t)
            .to(
              missing,
              {
                y: -6,
                borderColor: "rgba(255,107,74,0.6)",
                duration: 0.45,
                stagger: 0.45 * MOTION.staggerRatio,
              },
              t + 0.3
            )
            .fromTo(
              one("gaps"),
              { autoAlpha: 0, y: 34, filter: "blur(8px)" },
              {
                autoAlpha: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.85,
                immediateRender: false,
              },
              t + 0.4
            )
            .fromTo(
              gapFills,
              { scaleX: 0 },
              {
                scaleX: 1,
                duration: 0.7,
                stagger: 0.7 * MOTION.staggerRatio,
                immediateRender: false,
              },
              t + 0.65
            );
          t += 1.8;

          // ---- ACT 4 — track -------------------------------------------
          // Save, fly to the board, advance through the stages, pull back out.
          capOut(2, t);
          tl.to(one("saveBtn"), { scale: 0.96, duration: 0.12 }, t + 0.15)
            .to(one("saveBtn"), { scale: 1, duration: 0.35, ease: "back.out(2.4)" }, t + 0.27)
            .to(one("tracker"), { filter: "blur(0px)", opacity: 1, duration: 0.8 }, t + 0.2)
            .to(camera.current, cam("save", { duration: 1.3 }), t + 0.3)
            .to(one("detail"), { autoAlpha: 0, scale: 0.98, duration: 0.6 }, t + 0.75)
            .to(one("gaps"), { autoAlpha: 0, y: 12, duration: 0.5 }, t + 0.7)
            .fromTo(
              travel,
              {
                autoAlpha: 0,
                x: () =>
                  (marks.current["detail"]?.cx ?? 0) -
                  (marks.current["travel"]?.cx ?? 0),
                y: () =>
                  (marks.current["detail"]?.cy ?? 0) -
                  (marks.current["travel"]?.cy ?? 0),
                scale: 1.25,
              },
              { autoAlpha: 1, scale: 1.25, duration: 0.25, immediateRender: false },
              t + 0.55
            )
            .to(
              travel,
              {
                x: () => toSlot("saved").x,
                y: () => toSlot("saved").y,
                scale: 1,
                duration: 0.95,
              },
              t + 0.7
            )
            .to(
              '[data-el="colHead"][data-stage="saved"]',
              { color: "#FF6B4A", duration: 0.3 },
              t + 1.5
            );
          capIn(3, t + 0.4);
          t += 1.9;

          tl.to(camera.current, cam("advance", { duration: 1.1 }), t);
          const legs: [string, string][] = [
            ["applied", "Applied · 2 days ago"],
            ["interview", "Round 2 · Thursday"],
            ["offer", "Respond by Oct 14"],
          ];
          legs.forEach(([key, note], i) => {
            const at = t + 0.45 + i * 0.7;
            tl.to(
              travel,
              { x: () => toSlot(key).x, y: () => toSlot(key).y, duration: 0.6 },
              at
            )
              .to(travel, { scale: 1.06, duration: 0.3 }, at)
              .to(travel, { scale: 1, duration: 0.3 }, at + 0.3)
              .to(one("travelNote"), { autoAlpha: 0, duration: 0.15 }, at + 0.2)
              .call(
                () => {
                  const n = one("travelNote");
                  if (n) n.textContent = note;
                },
                undefined,
                at + 0.35
              )
              .to(one("travelNote"), { autoAlpha: 1, duration: 0.2 }, at + 0.4)
              .to(
                `[data-el="colHead"][data-stage="${key}"]`,
                { color: "#FF6B4A", duration: 0.3 },
                at + 0.25
              )
              .to(
                `[data-el="colHead"][data-stage="${legs[i - 1]?.[0] ?? "saved"}"]`,
                { color: "rgba(244,241,236,0.55)", duration: 0.3 },
                at + 0.25
              );
          });
          tl.to(
            travel,
            {
              borderColor: "rgba(255,107,74,0.7)",
              boxShadow:
                "0 0 0 1px rgba(255,107,74,0.35), 0 18px 40px rgba(0,0,0,0.5)",
              duration: 0.5,
            },
            t + 2.3
          );
          t += 2.7;

          // Back out to the whole workspace, in one continuous move.
          tl.to(camera.current, cam("wide", { rotationX: 5, duration: 1.6 }), t)
            .to(one("feed"), { filter: "blur(0px)", opacity: 1, duration: 1.1 }, t)
            .to(one("rail"), { filter: "blur(0px)", opacity: 1, duration: 1.1 }, t)
            .to(
              keepers.filter((r) => r !== heroRow),
              { opacity: 1, duration: 1 },
              t
            )
            .to(heroRow, { scale: 1, duration: 0.8 }, t)
            .to(one("detail"), { autoAlpha: 1, scale: 1, duration: 1 }, t + 0.3)
            .to(one("gaps"), { autoAlpha: 1, y: 0, duration: 1 }, t + 0.35)
            .to(".lp-vignette", { opacity: 0.55, duration: 1.4 }, t)
            .to({}, { duration: 0.7 }, t + 1.6);

          revealSections();

          const onRefresh = () => applyFit();
          ScrollTrigger.addEventListener("refreshInit", onRefresh);
          return () => {
            ScrollTrigger.removeEventListener("refreshInit", onRefresh);
            heroTl.kill();
          };
        }
      );

      return () => splitOf.forEach((s) => s.revert());
    },
    { scope: root, dependencies: [fontsReady], revertOnUpdate: true }
  );

  useGSAP(
    () => {
      if (!fontsReady) return;
      gsap.to(root.current!, { autoAlpha: 1, duration: 0.5, ease: "power2.out" });
    },
    { scope: root, dependencies: [fontsReady] }
  );

  // Clearing the flag and reloading is deliberate over re-running the timeline
  // in place: the tour builds a pin, a scrub, and a measured camera, and a
  // fresh document is the only way to guarantee it starts from a clean one.
  useGSAP(
    (_ctx, contextSafe) => {
      const btn = root.current?.querySelector<HTMLElement>(".lp-replay");
      if (!btn || !contextSafe) return;
      const onClick = contextSafe(() => {
        try {
          localStorage.removeItem("it-tour");
        } catch {
          /* nothing to clear */
        }
        window.scrollTo(0, 0);
        window.location.reload();
      })!;
      btn.addEventListener("click", onClick);
      return () => btn.removeEventListener("click", onClick);
    },
    { scope: root }
  );

  return (
    <div className="lp-root" ref={root}>
      <MarketingNav />

      <main id="main">
      {/* ---- hero + chiplet row ------------------------------------------
          Modelled on the reference's category-page opening: wordmark-scale
          headline, then a row of product chiplets that stagger in. */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          {/* The brand is the centrepiece and the first thing established.
              aria-label carries the real casing; the glyphs are uppercased for
              wordmark weight, and split per character for the entrance. */}
          <h1 className="lp-wordmark" aria-label={BRAND}>
            <span className="lp-wordmark-text" aria-hidden>
              {BRAND}
            </span>
          </h1>
          <p className="lp-hero-head">{HERO_COPY.head}</p>
          <p className="lp-hero-body">{HERO_COPY.body}</p>
          <div className="lp-hero-actions">
            <Link
              className="lp-cta-btn is-primary"
              href="/signup"
              onClick={() => trackEvent("get_started_click", { location: "hero" })}
            >
              {AUTH.primary}
            </Link>
            <Link
              className="lp-cta-btn"
              href="/login"
              onClick={() => trackEvent("sign_in_click", { location: "hero" })}
            >
              {AUTH.secondary}
            </Link>
          </div>
        </div>
        <span className="lp-scrollhint">Scroll</span>
      </section>

      {/* ---- the pinned sequence ---------------------------------------- */}
      <div className="lp-stage" id="how-it-works" ref={stage}>
        <div className="lp-fit" ref={fit}>
          <div className="lp-camera" ref={camera}>
            <div ref={canvas} className="lp-canvas-host">
              <Workspace counts={counts} />
            </div>
          </div>
        </div>

        <div className="lp-vignette" aria-hidden />

        <div className="lp-caps">
          {CAPTIONS.map((c) => (
            <article className={`lp-cap is-${c.place}`} key={c.id} data-cap={c.id}>
              <span className="lp-cap-eyebrow">{c.eyebrow}</span>
              <h2 className="lp-cap-head">{c.head}</h2>
              {c.body ? <p className="lp-cap-body">{fill(c.body, counts)}</p> : null}
            </article>
          ))}
        </div>

        <div className="lp-ticks" ref={ticks} data-act="0" aria-hidden>
          {CAPTIONS.map((c, i) => (
            <span className={`lp-tick${i === 0 ? " is-on" : ""}`} key={c.id} />
          ))}
        </div>
      </div>

      {/* ---- chiplet strip -----------------------------------------------
          Moved out of the hero so the wordmark stands alone. Reads better here
          anyway: after the story, as a summary of the surfaces just shown. */}
      <div className="lp-chip-row">
        {CHIPLETS.map((c) => (
          <span className="lp-chip-item" key={c.id}>
            <span className="lp-chip-glyph">
              <ChipletGlyph glyph={c.glyph} />
            </span>
            <span className="lp-chip-label">{c.label}</span>
          </span>
        ))}
      </div>

      {/* ---- carousel ---------------------------------------------------- */}
      <section className="lp-carousel" id="features" aria-labelledby="features-heading">
        <FeatureCards counts={counts} />
      </section>

      {/* ---- how it works, in words -------------------------------------
          The pinned sequence above shows the same four steps; this restates
          them as text so the page still explains itself with motion off. */}
      <section className="lp-steps" aria-labelledby="steps-heading">
        <h2 className="lp-sec-head" id="steps-heading">
          Four steps, start to offer.
        </h2>
        <ol className="lp-steps-list">
          {STEPS.map((s) => (
            <li className="lp-step" key={s.id}>
              <span className="lp-step-n" aria-hidden>
                {s.n}
              </span>
              <h3 className="lp-step-head">{s.head}</h3>
              <p className="lp-step-body">{fill(s.body, counts)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- pricing ------------------------------------------------------ */}
      <section className="lp-pricing" id="pricing" aria-labelledby="pricing-heading">
        <div className="lp-pricing-inner">
          <span className="lp-sec-eyebrow">Pricing</span>
          <h2 className="lp-sec-head" id="pricing-heading">
            {PRICING.head}
          </h2>
          <p className="lp-pricing-body">{PRICING.body}</p>
          <ul className="lp-pricing-points">
            {PRICING.points.map((pt) => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
          <Link
            className="lp-cta-btn is-primary"
            href="/signup"
            onClick={() => trackEvent("pricing_cta_click", { location: "pricing" })}
          >
            {AUTH.primary}
          </Link>
        </div>
      </section>

      {/* ---- faq ---------------------------------------------------------- */}
      <section className="lp-faq" id="faq" aria-labelledby="faq-heading">
        <div className="lp-faq-inner">
          <span className="lp-sec-eyebrow">FAQ</span>
          <h2 className="lp-sec-head" id="faq-heading">
            Questions, answered plainly.
          </h2>
          <Faq counts={counts} />
        </div>
      </section>

      {/* ---- about -------------------------------------------------------- */}
      <section className="lp-about" id="about" aria-labelledby="about-heading">
        <div className="lp-about-inner">
          <span className="lp-sec-eyebrow">About</span>
          <h2 className="lp-sec-head" id="about-heading">
            {ABOUT.head}
          </h2>
          {ABOUT.body.map((para) => (
            <p className="lp-about-body" key={para.slice(0, 24)}>
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* ---- close -------------------------------------------------------- */}
      <section className="lp-cta">
        <div className="lp-cta-inner">
          <span className="lp-cta-eyebrow">{CTA.eyebrow}</span>
          <h2 className="lp-cta-head">{CTA.head}</h2>
          <p className="lp-cta-body">{CTA.body}</p>
          <div className="lp-cta-actions">
            <Link
              className="lp-cta-btn is-primary"
              href="/signup"
              onClick={() => trackEvent("get_started_click", { location: "footer_cta" })}
            >
              {CTA.action}
            </Link>
            <Link
              className="lp-cta-btn"
              href="/login"
              onClick={() => trackEvent("sign_in_click", { location: "footer_cta" })}
            >
              {CTA.secondary}
            </Link>
          </div>
          {/* Only offered once the tour has been spent, so a first-time
              visitor is never told about something they are already in. */}
          <button className="lp-replay" type="button">
            Replay the walkthrough
          </button>
        </div>
      </section>
      </main>

      <MarketingFooter />
      <MobileCta />
    </div>
  );
}
