"use client";

import { useMemo, useState } from "react";
import type { Posting } from "@/lib/types";
import PostingRow, { isUpcomingDeadline } from "./PostingRow";

type SortKey = "date_posted" | "deadline";

export default function JobBoard({ postings }: { postings: Posting[] }) {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("all");
  const [season, setSeason] = useState("all");
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("date_posted");

  const sources = useMemo(
    () => ["all", ...Array.from(new Set(postings.map((p) => p.source))).sort()],
    [postings]
  );
  const seasons = useMemo(
    () => ["all", ...Array.from(new Set(postings.map((p) => p.season))).sort()],
    [postings]
  );

  // No animation runs on this derived list — filtering/sorting must feel
  // instant. The only motion in this design lives in the framing sections.
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    let list = postings.filter((p) => {
      if (query) {
        const haystack = `${p.company} ${p.title}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (source !== "all" && p.source !== source) return false;
      if (season !== "all" && p.season !== season) return false;
      if (upcomingOnly && !isUpcomingDeadline(p.deadline)) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      const aVal = sortKey === "date_posted" ? a.date_posted : a.deadline;
      const bVal = sortKey === "date_posted" ? b.date_posted : b.deadline;
      if (!aVal) return 1;
      if (!bVal) return -1;
      return sortKey === "date_posted" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    });

    return list;
  }, [postings, search, source, season, upcomingOnly, sortKey]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12" id="postings">
      <div className="glass flex flex-wrap items-end gap-x-6 gap-y-3 rounded-2xl px-4 py-4">
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="company or title…"
            className="w-48 border-b border-border bg-transparent py-1 text-sm text-text outline-none placeholder:text-text-faint focus:border-accent-bright sm:w-56"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Source</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border-b border-border bg-transparent py-1 text-sm text-text outline-none focus:border-accent-bright"
          >
            {sources.map((s) => (
              <option key={s} value={s} className="bg-bg-raised">
                {s === "all" ? "All" : s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Season</span>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="border-b border-border bg-transparent py-1 text-sm text-text outline-none focus:border-accent-bright"
          >
            {seasons.map((s) => (
              <option key={s} value={s} className="bg-bg-raised">
                {s === "all" ? "All" : s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="border-b border-border bg-transparent py-1 text-sm text-text outline-none focus:border-accent-bright"
          >
            <option value="date_posted" className="bg-bg-raised">
              Newest posted
            </option>
            <option value="deadline" className="bg-bg-raised">
              Deadline soonest
            </option>
          </select>
        </label>

        <label className="flex items-center gap-2 pb-1 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Deadline within 7 days
        </label>

        <span className="ml-auto pb-1 font-text text-xs text-text-faint">
          {filtered.length} / {postings.length}
        </span>
      </div>

      <div className="mt-4 hidden border-b border-border px-4 py-2 text-[0.65rem] uppercase tracking-[0.06em] text-text-faint sm:grid sm:grid-cols-[1.6fr_1fr_auto_auto_5.5rem_auto] sm:gap-x-4">
        <span>Role</span>
        <span className="text-right">Location</span>
        <span>Posted</span>
        <span>Deadline</span>
        <span>Season</span>
        <span className="text-right">Source</span>
      </div>

      <ul>
        {filtered.map((posting) => (
          <PostingRow key={posting.id} posting={posting} />
        ))}
      </ul>

      {filtered.length === 0 && (
        <div className="border-t border-border py-10 text-center text-sm text-text-muted">
          No postings match those filters.
        </div>
      )}
    </section>
  );
}
