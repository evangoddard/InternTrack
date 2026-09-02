"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CARDS, fill, type CardExample, type LiveCounts } from "./story";

/**
 * The "What it actually does" carousel.
 *
 * Rewritten as a state-driven component. The previous version wired the
 * chevrons and the "+" toggles with addEventListener calls inside a GSAP
 * effect; the listeners silently failed to attach and every control on the
 * section was inert. React owns this interaction now — there is no separate
 * DOM-mutation path that can come adrift from what is rendered.
 *
 * Expansion happens in place rather than in a modal: the detail is a
 * continuation of the card, not a context switch, and the carousel stays
 * scrollable while a card is open.
 *
 * Accessibility:
 *   - each toggle is a real <button> with aria-expanded / aria-controls
 *   - the panel is a region labelled by its button, `hidden` when closed, so
 *     its content is never focusable while invisible
 *   - Escape closes the open card and returns focus to its toggle
 *   - the grid-rows height transition is disabled under prefers-reduced-motion
 */
export default function FeatureCards({ counts }: { counts: LiveCounts }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const syncArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft > el.scrollWidth - el.clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    syncArrows();
    el.addEventListener("scroll", syncArrows, { passive: true });
    window.addEventListener("resize", syncArrows);
    return () => {
      el.removeEventListener("scroll", syncArrows);
      window.removeEventListener("resize", syncArrows);
    };
  }, [syncArrows]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const id = openId;
      setOpenId(null);
      btnRefs.current[id]?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openId]);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".lp-ccard");
    const step = (card?.offsetWidth ?? 340) + 20;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <>
      <header className="lp-carousel-head">
        <h2 className="lp-sec-head" id="features-heading">
          What it actually does.
        </h2>
        <div className="lp-carousel-nav">
          <button
            type="button"
            className={`lp-nav-prev${atStart ? " is-off" : ""}`}
            aria-label="Previous features"
            disabled={atStart}
            onClick={() => scrollByCard(-1)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            className={`lp-nav-next${atEnd ? " is-off" : ""}`}
            aria-label="More features"
            disabled={atEnd}
            onClick={() => scrollByCard(1)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <div className="lp-track" ref={trackRef}>
        {CARDS.map((c) => {
          const open = openId === c.id;
          return (
            <article className={`lp-ccard${open ? " is-open" : ""}`} key={c.id}>
              <span className="lp-ccard-eyebrow">{c.eyebrow}</span>
              <h3 className="lp-ccard-head">{c.head}</h3>
              <p className="lp-ccard-body">{fill(c.body, counts)}</p>

              {open ? null : <CardArt art={c.art} />}

              <div
                className="lp-ccard-more"
                id={`${c.id}-panel`}
                role="region"
                aria-labelledby={`${c.id}-btn`}
                hidden={!open}
              >
                <div className="lp-ccard-more-inner">
                  {c.detail.paras.map((para) => (
                    <p key={para.slice(0, 28)}>{fill(para, counts)}</p>
                  ))}
                  <Example example={c.detail.example} counts={counts} />
                </div>
              </div>

              <button
                type="button"
                id={`${c.id}-btn`}
                ref={(el) => {
                  btnRefs.current[c.id] = el;
                }}
                className="lp-ccard-more-btn"
                aria-expanded={open}
                aria-controls={`${c.id}-panel`}
                onClick={() => setOpenId(open ? null : c.id)}
              >
                <span className="lp-sr-only">
                  {open ? `Hide details about ${c.head}` : `More about ${c.head}`}
                </span>
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                  <path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
                </svg>
              </button>
            </article>
          );
        })}
      </div>
    </>
  );
}

/** The small abstract mark on a collapsed card. */
function CardArt({ art }: { art: string }) {
  return (
    <div className="lp-ccard-art" data-art={art} aria-hidden>
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/**
 * Real product surfaces, rendered small. These mirror what the app actually
 * shows — the score block and skill chips from the detail panel, the verdict
 * reasons eligibility really produces, the gap bars from the tracker.
 */
function Example({
  example,
  counts,
}: {
  example: CardExample;
  counts: LiveCounts;
}) {
  if (example.kind === "source") {
    return (
      <dl className="lp-ex-source">
        {example.rows.map((r) => (
          <div key={r.label}>
            <dt>{r.label}</dt>
            <dd>{fill(r.value, counts)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (example.kind === "score") {
    return (
      <div className="lp-ex">
        <div className="lp-ex-score">
          <span className="lp-ex-num">{example.score}</span>
          <span className="lp-ex-num-label">
            % of this posting&apos;s named skills are on your résumé
          </span>
        </div>
        <span className="lp-ex-label">On your résumé</span>
        <ul className="lp-ex-chips">
          {example.matched.map((m) => (
            <li key={m} className="is-have">
              {m}
            </li>
          ))}
        </ul>
        <span className="lp-ex-label">Not yet</span>
        <ul className="lp-ex-chips">
          {example.missing.map((m) => (
            <li key={m} className="is-missing">
              {m}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (example.kind === "requirements") {
    return (
      <div className="lp-ex">
        <span className="lp-ex-label">Requirements · from {example.source}</span>
        <ul className="lp-ex-reqs">
          {example.lines.map((l) => {
            const covered = example.covered.some((c) =>
              l.toLowerCase().includes(c.toLowerCase())
            );
            return (
              <li key={l} className={covered ? "is-covered" : undefined}>
                <span className="lp-ex-tick" aria-hidden>
                  {covered ? (
                    <svg viewBox="0 0 16 16" width="11" height="11">
                      <path d="m3.5 8.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 16 16" width="11" height="11">
                      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </span>
                {l}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (example.kind === "verdicts") {
    return (
      <div className="lp-ex">
        <ul className="lp-ex-verdicts">
          {example.rows.map((r) => (
            <li key={r.label} className={r.ok ? "is-ok" : "is-out"}>
              <span className="lp-ex-verdict-label">{r.label}</span>
              <span className="lp-ex-verdict-state">
                {r.reason ?? (r.ok ? "Shown" : "Ruled out")}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="lp-ex">
      <ul className="lp-ex-gaps">
        {example.rows.map((r) => (
          <li key={r.name}>
            <span className="lp-ex-gap-name">{r.name}</span>
            <span className="lp-ex-gap-track" aria-hidden>
              <i style={{ width: `${r.share}%` }} />
            </span>
            <span className="lp-ex-gap-share">{r.share}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
