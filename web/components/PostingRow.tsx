import type { Posting } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { savePosting } from "@/app/saved/actions";

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
  const urgent = isUpcomingDeadline(posting.deadline);

  return (
    <li
      className={`group border-t border-border transition-colors first:border-t-0 ${
        urgent ? "bg-accent-wash" : "hover:bg-glass"
      }`}
    >
      <div
        className={`relative grid grid-cols-1 gap-x-4 gap-y-1.5 py-3 pl-4 pr-4 transition-colors sm:grid-cols-[1fr_1.3fr_9.5rem_12rem_5.5rem_6rem_5rem] sm:items-start sm:gap-y-0 sm:py-2.5 ${
          urgent ? "border-l-2 border-accent" : "border-l-2 border-transparent group-hover:border-text-faint"
        }`}
      >
        <div className="min-w-0 sm:pr-2">
          <span className="font-display text-[0.95rem] font-semibold text-text">
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

        {/* Links out to the original company posting -- full description,
            qualifications, and application form live there, not on this site. */}
        <a
          href={posting.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
        >
          Apply →
        </a>

        {saved ? (
          <span className="w-fit text-xs font-semibold text-accent-bright">Saved ✓</span>
        ) : (
          <form action={savePosting}>
            <input type="hidden" name="posting_id" value={posting.id} />
            <input type="hidden" name="company" value={posting.company} />
            <input type="hidden" name="title" value={posting.title} />
            <input type="hidden" name="url" value={posting.url} />
            <input type="hidden" name="location" value={posting.location} />
            <input type="hidden" name="season" value={posting.season} />
            <input type="hidden" name="source" value={posting.source} />
            <input type="hidden" name="returnTo" value="/" />
            <button
              type="submit"
              className="w-fit border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
            >
              Save
            </button>
          </form>
        )}
      </div>
    </li>
  );
}
