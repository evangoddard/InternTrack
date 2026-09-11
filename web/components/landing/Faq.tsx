"use client";

import { useRef, useState } from "react";
import { FAQ, fill, type LiveCounts } from "./story";
import { track } from "@/lib/analytics";

/**
 * FAQ disclosure list.
 *
 * Standard ARIA disclosure pattern rather than a custom widget: each question
 * is a real <button> carrying aria-expanded and aria-controls, and each answer
 * is a region labelled by its button. That gives keyboard operation (Tab,
 * Enter/Space) and screen-reader semantics for free.
 *
 * The panel is kept in the DOM and hidden with the `hidden` attribute so the
 * answers are still crawlable, but never focusable while collapsed.
 */
export default function Faq({ counts }: { counts: LiveCounts }) {
  const [open, setOpen] = useState<string | null>(FAQ[0]?.id ?? null);
  // Questions already counted, so holding one open does not re-fire on toggle.
  const counted = useRef<Set<string>>(new Set());

  const toggle = (item: (typeof FAQ)[number]) => {
    const next = open === item.id ? null : item.id;
    setOpen(next);
    if (next && !counted.current.has(item.id)) {
      counted.current.add(item.id);
      track("faq_open", { question: item.q });
    }
  };

  return (
    <ul className="lp-faq-list">
      {FAQ.map((item) => {
        const isOpen = open === item.id;
        return (
          <li className="lp-faq-item" key={item.id}>
            <h3 className="lp-faq-q">
              <button
                type="button"
                id={`${item.id}-btn`}
                aria-expanded={isOpen}
                aria-controls={`${item.id}-panel`}
                onClick={() => toggle(item)}
              >
                <span>{item.q}</span>
                <span className={`lp-faq-mark${isOpen ? " is-open" : ""}`} aria-hidden>
                  <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                      d="M12 6v12M6 12h12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </h3>
            <div
              className="lp-faq-a"
              id={`${item.id}-panel`}
              role="region"
              aria-labelledby={`${item.id}-btn`}
              hidden={!isOpen}
            >
              <p>{fill(item.a, counts)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
