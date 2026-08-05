"use client";

import { useMemo, useRef, useState } from "react";
import type { Posting } from "@/lib/types";
import PostingRow from "./PostingRow";
import EligibilityScanning from "./EligibilityScanning";
import { CATEGORIES, categoryOf, type Category } from "@/lib/categories";

interface Verdict {
  eligible: boolean;
  reason?: string;
}

export default function JobBoard({
  postings,
  savedIds,
  hiddenCount = 0,
  hiddenContent,
  hasResume = false,
}: {
  postings: Posting[];
  savedIds: Set<string>;
  hiddenCount?: number;
  /** Rendered by the server and toggled in place -- see app/page.tsx. */
  hiddenContent?: React.ReactNode;
  /** Gates the eligibility filter -- it needs a résumé to compare against. */
  hasResume?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [showHidden, setShowHidden] = useState(false);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [verdicts, setVerdicts] = useState<Record<string, Verdict> | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cancelCheck = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setChecking(false);
    setEligibleOnly(false);
  };

  // Verdicts are computed server-side (it needs the résumé and the
  // requirements text for every posting) and fetched once, the first time
  // the filter is switched on. That first call can take a while if the
  // shared cache is cold; afterwards it's a single query.
  const toggleEligible = async () => {
    if (eligibleOnly) {
      setEligibleOnly(false);
      return;
    }
    setEligibleOnly(true);
    if (verdicts || checking) return;

    setChecking(true);
    setCheckError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/eligibility", { signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't check eligibility.");
      setVerdicts(data.verdicts);
      setChecking(false);
    } catch (err) {
      // A cancel already reset the UI in cancelCheck(); don't clobber it.
      if (controller.signal.aborted) return;
      setCheckError(err instanceof Error ? err.message : "Couldn't check eligibility.");
      setEligibleOnly(false);
      setChecking(false);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const toggleCategory = (c: Category) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  // Chip counts deliberately ignore the search box -- numbers jumping on
  // every keystroke is noise -- but they do respect the eligibility filter,
  // so once it's on the chips show how many roles you can actually apply to.
  const counts = useMemo(() => {
    const out = {} as Record<Category, number>;
    for (const c of CATEGORIES) out[c] = 0;
    for (const p of postings) {
      if (eligibleOnly && verdicts && verdicts[p.id]?.eligible === false) continue;
      const c = categoryOf(p);
      if (c) out[c] += 1;
    }
    return out;
  }, [postings, eligibleOnly, verdicts]);

  // Always newest-first: there's no second ordering worth offering when
  // deadlines aren't published by the source.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return postings
      .filter((p) => {
        if (query && !`${p.company} ${p.title}`.toLowerCase().includes(query)) return false;
        if (eligibleOnly && verdicts && verdicts[p.id]?.eligible === false) return false;
        if (selected.size > 0) {
          const c = categoryOf(p);
          // Uncategorised postings stay visible rather than being
          // unreachable through any chip.
          if (c && !selected.has(c)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date_posted || "").localeCompare(a.date_posted || ""));
  }, [postings, search, eligibleOnly, verdicts, selected]);

  // Counted off the verdicts directly rather than by diffing list lengths,
  // so an active search doesn't inflate the number.
  const ineligibleCount = useMemo(
    () => (verdicts ? postings.filter((p) => verdicts[p.id]?.eligible === false).length : 0),
    [postings, verdicts]
  );

  if (checking) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" id="postings">
        <EligibilityScanning total={postings.length} onCancel={cancelCheck} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" id="postings">
      {/* Deliberately unboxed -- the controls sit on the page background so
          the feed reads as one surface rather than a panel above a table. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or role…"
          className="w-full border-b border-border/60 bg-transparent py-1.5 text-sm text-text outline-none transition-colors placeholder:text-text-faint focus:border-text-muted sm:w-72"
        />

        {hasResume && (
          <label className="flex cursor-pointer items-center gap-2 text-xs text-text-muted">
            <input
              type="checkbox"
              checked={eligibleOnly}
              onChange={toggleEligible}
              className="h-3.5 w-3.5 accent-accent"
            />
            Only roles I qualify for
          </label>
        )}

        <span className="ml-auto font-num text-xs text-text-faint">
          {filtered.length === postings.length
            ? `${postings.length}`
            : `${filtered.length} / ${postings.length}`}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => {
          const on = selected.has(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                on
                  ? "border-accent-bright bg-accent-wash font-semibold text-accent-bright"
                  : "border-border/60 text-text-muted hover:border-text-faint hover:text-text"
              }`}
            >
              {c}
              <span className="ml-1.5 font-num text-[0.65rem] text-text-faint">{counts[c]}</span>
            </button>
          );
        })}
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="px-1 text-xs text-text-faint transition-colors hover:text-text"
          >
            Clear
          </button>
        )}
      </div>

      {checkError && <p className="mt-2 text-xs text-red-400">{checkError}</p>}

      {eligibleOnly && verdicts && (
        <p className="mt-2 text-xs text-text-faint">
          {ineligibleCount === 0
            ? "You meet the stated requirements for every posting here."
            : `Hiding ${ineligibleCount} role${ineligibleCount === 1 ? "" : "s"} that state requirements you don't meet.`}
        </p>
      )}

      <div className="mt-6 hidden border-b border-border px-4 py-2 text-[0.65rem] uppercase tracking-[0.06em] text-text-faint sm:grid sm:grid-cols-[1fr_1.4fr_9.5rem_6rem_6rem_5rem] sm:gap-x-4">
        <span>Company</span>
        <span>Role</span>
        <span>Posted</span>
        <span>Season</span>
        <span>Apply</span>
        <span>Save</span>
      </div>

      <ul>
        {filtered.map((posting) => (
          <PostingRow key={posting.id} posting={posting} saved={savedIds.has(posting.id)} />
        ))}
      </ul>

      {filtered.length === 0 && (
        <div className="border-t border-border py-10 text-center text-sm text-text-muted">
          No postings match that search.
        </div>
      )}

      {hiddenCount > 0 && (
        <div className="mt-10 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            className="text-xs text-text-faint transition-colors hover:text-text"
          >
            {hiddenCount} hidden · {showHidden ? "collapse" : "show"}
          </button>
          {showHidden && <div className="mt-3">{hiddenContent}</div>}
        </div>
      )}
    </section>
  );
}
