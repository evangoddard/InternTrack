"use client";

import { useState } from "react";
import type { Posting } from "@/lib/types";
import { rankPostings, type RankedPosting } from "@/lib/rankPostings";

export default function MatchPanel({ postings }: { postings: Posting[] }) {
  const [resumeText, setResumeText] = useState("");
  const [ranked, setRanked] = useState<RankedPosting[] | null>(null);

  function handleRank() {
    // Everything runs in the browser — resumeText never leaves this tab.
    setRanked(rankPostings(resumeText, postings));
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-text">Match your résumé</h2>
        <p className="mt-2 max-w-xl text-sm text-text-muted">
          Paste résumé text and rank postings against it — entirely in your browser, nothing
          uploaded or stored. The score below is a placeholder; see{" "}
          <code className="text-text">lib/rankPostings.ts</code>.
        </p>

        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          placeholder="Paste your résumé text here…"
          rows={6}
          className="mt-5 w-full max-w-2xl resize-y rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none placeholder:text-text-faint focus:border-accent-bright"
        />

        <button
          onClick={handleRank}
          className="mt-3 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-text shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Rank postings
        </button>

        {ranked && (
          <ul className="mt-8 max-w-2xl">
            {ranked.map(({ posting, score }) => (
              <li
                key={posting.id}
                className="flex items-center justify-between gap-4 border-t border-border py-2.5 first:border-t-0"
              >
                <div className="min-w-0 truncate text-sm text-text">
                  <span className="font-display font-semibold">{posting.company}</span>
                  <span className="text-text-faint"> · </span>
                  {posting.title}
                </div>
                <span className="shrink-0 rounded-full border border-accent/50 bg-accent-wash px-2.5 py-0.5 font-text text-xs font-semibold tabular-nums text-accent-bright">
                  {score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
