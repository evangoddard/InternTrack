"use client";

import { useState } from "react";
import type { Posting } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { savePosting, unsaveByPostingId, dismissPosting } from "@/app/saved/actions";
import CompanyLogo from "./CompanyLogo";

interface QualState {
  status: "idle" | "loading" | "ready" | "unavailable";
  qualifications?: string | null;
  full?: string;
  source?: string;
}

export function isUpcomingDeadline(deadline: string, withinDays = 7): boolean {
  if (!deadline) return false;
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.setHours(0, 0, 0, 0);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

export default function PostingRow({
  posting,
  saved,
}: {
  posting: Posting;
  saved: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [qual, setQual] = useState<QualState>({ status: "idle" });
  const [showFull, setShowFull] = useState(false);
  const urgent = isUpcomingDeadline(posting.deadline);

  // Requirements are fetched the first time a row is opened, never for the
  // feed as a whole -- most postings are never expanded, and the upstream
  // sites shouldn't be hit 137 times for a page view. Once fetched it stays
  // in component state, and the API memoises server-side too.
  const loadQualifications = async () => {
    if (qual.status !== "idle") return;
    setQual({ status: "loading" });

    try {
      const res = await fetch(`/api/qualifications?url=${encodeURIComponent(posting.url)}`);
      const data = await res.json();
      setQual(
        data?.available
          ? {
              status: "ready",
              qualifications: data.qualifications,
              full: data.full,
              source: data.source,
            }
          : { status: "unavailable" }
      );
    } catch {
      setQual({ status: "unavailable" });
    }
  };

  const toggle = () => {
    setExpanded((open) => {
      if (!open) void loadQualifications();
      return !open;
    });
  };

  return (
    <li
      className={`group border-t border-border transition-colors first:border-t-0 ${
        urgent ? "bg-accent-wash" : "hover:bg-glass"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        aria-expanded={expanded}
        className={`relative grid w-full cursor-pointer grid-cols-1 gap-x-4 gap-y-1.5 py-3 pl-4 pr-4 text-left transition-colors sm:grid-cols-[1fr_1.3fr_9.5rem_12rem_5.5rem_6rem_5rem] sm:items-start sm:gap-y-0 sm:py-2.5 ${
          urgent ? "border-l-2 border-accent" : "border-l-2 border-transparent group-hover:border-text-faint"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 sm:pr-2">
          <CompanyLogo company={posting.company} />
          <span className="truncate font-display text-[0.95rem] font-semibold text-text">
            {posting.company}
          </span>
        </div>

        <div className="text-xs text-text sm:pr-2">{posting.title}</div>

        <div className="text-xs text-text-muted">
          <span className="sm:hidden">posted </span>
          {formatDate(posting.date_posted)}
        </div>

        <div className={`text-xs ${urgent ? "font-semibold text-accent-bright" : "text-text-muted"}`}>
          <span className="sm:hidden">due </span>
          {posting.deadline ? formatDate(posting.deadline) : "—"}
          {urgent && <span className="ml-1.5 hidden sm:inline">deadline soon</span>}
        </div>

        <div className="text-xs text-text-muted">{posting.season}</div>

        <span
          onClick={(e) => {
            e.stopPropagation();
            window.open(posting.url, "_blank", "noopener,noreferrer");
          }}
          className="w-fit border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
        >
          Apply →
        </span>

        {saved ? (
          // Reads "Saved ✓" at rest and swaps to "Unsave" on hover, so the
          // row still shows its saved state but is undoable in one click.
          // Named group (/save) so it reacts to this button only -- the <li>
          // already owns the plain `group` for the whole-row hover.
          <span onClick={(e) => e.stopPropagation()} className="w-fit">
            <form action={unsaveByPostingId} className="group/save">
              <input type="hidden" name="posting_id" value={posting.id} />
              <button
                type="submit"
                title="Remove from saved"
                className="w-fit border-b border-transparent text-xs font-semibold text-accent-bright transition-colors hover:border-red-400 hover:text-red-400"
              >
                <span className="group-hover/save:hidden">Saved ✓</span>
                <span className="hidden group-hover/save:inline">Unsave</span>
              </button>
            </form>
          </span>
        ) : (
          <span
            onClick={(e) => e.stopPropagation()}
            className="w-fit"
          >
            <form action={savePosting}>
              <input type="hidden" name="posting_id" value={posting.id} />
              <input type="hidden" name="company" value={posting.company} />
              <input type="hidden" name="title" value={posting.title} />
              <input type="hidden" name="url" value={posting.url} />
              <input type="hidden" name="location" value={posting.location} />
              <input type="hidden" name="season" value={posting.season} />
              <input type="hidden" name="returnTo" value="/" />
              <button
                type="submit"
                className="w-fit border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
              >
                Save
              </button>
            </form>
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-border bg-glass px-4 py-4 sm:pl-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Location</dt>
              <dd className="mt-0.5 text-text-muted">
                {posting.locations.length > 0 ? posting.locations.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Category</dt>
              <dd className="mt-0.5 text-text-muted">{posting.category || "—"}</dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Degree level</dt>
              <dd className="mt-0.5 text-text-muted">
                {posting.degrees.length > 0 ? posting.degrees.join(", ") : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">Season</dt>
              <dd className="mt-0.5 text-text-muted">{posting.season || "—"}</dd>
            </div>
          </dl>

          {/* Requirements, pulled live from whichever applicant tracking
              system the company actually uses. Not every host exposes them
              (see lib/qualifications.ts) -- when one doesn't, say so plainly
              rather than showing an empty box. */}
          <div className="mt-4 border-t border-border pt-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[0.65rem] uppercase tracking-[0.06em] text-text-faint">
                Qualifications
              </h3>
              {qual.status === "ready" && qual.source && (
                <span className="text-[0.6rem] text-text-faint">via {qual.source}</span>
              )}
            </div>

            {qual.status === "loading" && (
              <p className="mt-2 animate-pulse text-xs text-text-faint">
                Fetching from the company&apos;s posting…
              </p>
            )}

            {qual.status === "unavailable" && (
              <p className="mt-2 text-xs text-text-faint">
                This company&apos;s site doesn&apos;t publish its requirements in a readable form —
                open the posting to read them.
              </p>
            )}

            {qual.status === "ready" && (
              <>
                <p className="mt-2 max-h-72 overflow-y-auto whitespace-pre-line text-xs leading-relaxed text-text-muted">
                  {showFull || !qual.qualifications ? qual.full : qual.qualifications}
                </p>
                {qual.qualifications && qual.full !== qual.qualifications && (
                  <button
                    type="button"
                    onClick={() => setShowFull((v) => !v)}
                    className="mt-1.5 text-[0.7rem] font-semibold text-text-faint transition-colors hover:text-accent-bright"
                  >
                    {showFull ? "Show requirements only" : "Show full description"}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <a
              href={posting.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
            >
              View full posting →
            </a>

            {/* Hide a posting you've ruled out (PhD-only, wrong location...)
                so it stops taking up space in the feed on every visit. */}
            <form action={dismissPosting}>
              <input type="hidden" name="posting_id" value={posting.id} />
              <button
                type="submit"
                className="text-xs font-semibold text-text-faint transition-colors hover:text-red-400"
              >
                Not interested — hide this
              </button>
            </form>
          </div>
        </div>
      )}
    </li>
  );
}
