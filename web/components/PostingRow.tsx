"use client";

import { useState } from "react";
import type { Posting } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { savePosting } from "@/app/saved/actions";
import CompanyLogo from "./CompanyLogo";

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
  const urgent = isUpcomingDeadline(posting.deadline);

  return (
    <li
      className={`group border-t border-border transition-colors first:border-t-0 ${
        urgent ? "bg-accent-wash" : "hover:bg-glass"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
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
          <span className="w-fit text-xs font-semibold text-accent-bright">Saved ✓</span>
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

          {/* InternTrack doesn't have real description/requirements text --
              SimplifyJobs (the only source) doesn't provide it. This links
              out to the original posting instead of inventing one. */}
          <p className="mt-3 text-xs text-text-faint">
            Full description and requirements aren&apos;t available here — see the original posting.
          </p>

          <a
            href={posting.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block w-fit border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            View full posting →
          </a>
        </div>
      )}
    </li>
  );
}
