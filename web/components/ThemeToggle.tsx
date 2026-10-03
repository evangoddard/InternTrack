"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type Appearance = "light" | "dark" | "system";

export const THEME_KEY = "it-theme";

/**
 * Inlined in the document head, before anything paints.
 *
 * Without this the page renders in the default dark palette and then snaps to
 * light on hydration — the flash-of-wrong-theme. It writes `data-theme` rather
 * than a class on purpose: React renders `className` on <html> and would flag a
 * mismatch, but it never renders this attribute, so there is nothing to
 * disagree with.
 */
export const THEME_SCRIPT = `(function(){try{
var s=localStorage.getItem('${THEME_KEY}')||'system';
var d=s==='dark'||(s==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
document.documentElement.setAttribute('data-theme',d?'dark':'light');
}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`;

function resolve(pref: Appearance): "light" | "dark" {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(pref: Appearance) {
  document.documentElement.setAttribute("data-theme", resolve(pref));
}

const OPTIONS: { key: Appearance; label: string }[] = [
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
  { key: "system", label: "System" },
];

/**
 * Appearance control for the authenticated app.
 *
 * Three states rather than a binary toggle: "System" is the default and has to
 * stay selectable, otherwise a user who follows their OS can never get back to
 * it once they have touched the control.
 */
/**
 * localStorage as an external store.
 *
 * useSyncExternalStore rather than useState+useEffect: the preference lives
 * outside React, and reading it in an effect meant a synchronous setState
 * during mount — a cascading render, and the thing React added this hook to
 * avoid. The server snapshot is "system", which is also the default.
 */
const STORE_EVENT = "it-theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(STORE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(STORE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Appearance {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* private mode */
  }
  return "system";
}

const getServerSnapshot = (): Appearance => "system";

export default function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  // Rendered only after mount, so no segment is lit from the server guess.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // A microtask, so this is not a synchronous setState inside the effect.
    const t = window.setTimeout(() => setReady(true), 0);

    // Follow the OS while, and only while, "System" is selected.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (getSnapshot() === "system") apply("system");
    };
    mq.addEventListener("change", onChange);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  const choose = (next: Appearance) => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* choice just won't persist */
    }
    apply(next);
    window.dispatchEvent(new Event(STORE_EVENT));
  };

  return (
    <div
      className="theme-toggle"
      role="radiogroup"
      aria-label="Appearance"
      data-ready={ready}
    >
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          role="radio"
          aria-checked={pref === o.key}
          className={pref === o.key ? "is-on" : ""}
          onClick={() => choose(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
