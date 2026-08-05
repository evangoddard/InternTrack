"use client";

import { useState } from "react";

interface SkillRow {
  name: string;
  postings: number;
  share: number;
  onResume: boolean;
}

// Collapsed by default and loaded on demand: working this out needs the
// requirements text for every saved posting, which is a network round trip
// the first time. Nobody should pay that cost just to open the tracker.
export default function SkillGaps() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    skills: SkillRow[];
    analysed: number;
    saved: number;
    hasResume: boolean;
  } | null>(null);

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/skill-gaps");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Couldn't work that out.");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't work that out.");
    } finally {
      setLoading(false);
    }
  };

  // Sorted here rather than trusting the endpoint's ordering -- the display
  // is only readable if the bars descend, and that shouldn't depend on an
  // upstream guarantee.
  const byShare = (a: SkillRow, b: SkillRow) => b.share - a.share;
  const missing = (data?.skills ?? []).filter((s) => !s.onResume).sort(byShare);
  const have = (data?.skills ?? []).filter((s) => s.onResume).sort(byShare);

  return (
    <div className="mt-8 border-t border-border pt-4">
      <button
        type="button"
        onClick={toggle}
        className="text-xs font-semibold text-text-muted transition-colors hover:text-text"
      >
        What your saved roles keep asking for · {open ? "collapse" : "show"}
      </button>

      {open && (
        <div className="mt-4">
          {loading && (
            <p className="animate-pulse text-xs text-text-faint">
              Reading the requirements on your saved roles…
            </p>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {data && !loading && data.analysed === 0 && (
            <p className="text-xs text-text-faint">
              None of your saved postings publish readable requirements yet.
            </p>
          )}

          {data && !loading && data.analysed > 0 && (
            <>
              <p className="text-xs text-text-faint">
                Across {data.analysed} of your {data.saved} saved role
                {data.saved === 1 ? "" : "s"} that publish requirements.
                {!data.hasResume && " Upload a résumé to see which you already have."}
              </p>

              <div className="mt-4 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <div>
                  <h3 className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">
                    Most asked for, not on your résumé
                  </h3>
                  {missing.length === 0 ? (
                    <p className="mt-2 text-xs text-text-muted">
                      Nothing — your résumé covers everything these postings name.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {missing.slice(0, 10).map((s) => (
                        <li key={s.name} className="flex items-center gap-2 text-xs">
                          <span className="w-9 shrink-0 text-right font-num tabular-nums text-text-faint">
                            {s.share}%
                          </span>
                          {/* Bar makes the ranking readable at a glance
                              without a chart library. */}
                          <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-border">
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${s.share}%` }}
                            />
                          </span>
                          <span className="truncate text-text">{s.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">
                    Already on your résumé
                  </h3>
                  {have.length === 0 ? (
                    <p className="mt-2 text-xs text-text-muted">
                      None of these skills were found on your résumé.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {have.slice(0, 10).map((s) => (
                        <li key={s.name} className="flex items-center gap-2 text-xs">
                          <span className="w-9 shrink-0 text-right font-num tabular-nums text-text-faint">
                            {s.share}%
                          </span>
                          <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-border">
                            <span
                              className="block h-full rounded-full bg-accent-bright/60"
                              style={{ width: `${s.share}%` }}
                            />
                          </span>
                          <span className="truncate text-text-muted">{s.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
