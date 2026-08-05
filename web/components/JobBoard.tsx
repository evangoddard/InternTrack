"use client";

import { useMemo, useState } from "react";
import type { Posting } from "@/lib/types";
import PostingRow from "./PostingRow";

export default function JobBoard({
  postings,
  savedIds,
  hiddenCount = 0,
  hiddenContent,
}: {
  postings: Posting[];
  savedIds: Set<string>;
  hiddenCount?: number;
  /** Rendered by the server and toggled in place -- see app/page.tsx. */
  hiddenContent?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("all");
  const [showHidden, setShowHidden] = useState(false);

  const seasons = useMemo(
    () => ["all", ...Array.from(new Set(postings.map((p) => p.season))).sort()],
    [postings]
  );

  // Always newest-first: there's no second ordering worth offering when
  // deadlines aren't published by the source.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return postings
      .filter((p) => {
        if (query && !`${p.company} ${p.title}`.toLowerCase().includes(query)) return false;
        if (season !== "all" && p.season !== season) return false;
        return true;
      })
      .sort((a, b) => (b.date_posted || "").localeCompare(a.date_posted || ""));
  }, [postings, search, season]);

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

        {/* Width is pinned because a few upstream season strings are absurdly
            long ("Winter 2026 / Spring 2026 / Summer 2026 / ...") and a bare
            select sizes itself to its widest option. */}
        <select
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="w-40 truncate border-b border-border/60 bg-transparent py-1.5 text-sm text-text-muted outline-none transition-colors hover:text-text focus:border-text-muted"
        >
          {seasons.map((s) => (
            <option key={s} value={s} className="bg-bg-raised">
              {s === "all" ? "All seasons" : s}
            </option>
          ))}
        </select>

        <span className="ml-auto font-num text-xs text-text-faint">
          {filtered.length === postings.length
            ? `${postings.length}`
            : `${filtered.length} / ${postings.length}`}
        </span>
      </div>

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
