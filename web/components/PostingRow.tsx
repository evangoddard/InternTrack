import type { Posting } from "@/lib/types";

export function isUpcomingDeadline(deadline: string, withinDays = 7): boolean {
  if (!deadline) return false;
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due.getTime() - now.setHours(0, 0, 0, 0);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= withinDays;
}

export default function PostingRow({ posting }: { posting: Posting }) {
  const urgent = isUpcomingDeadline(posting.deadline);

  return (
    <li
      className={`group border-t border-border transition-colors first:border-t-0 ${
        urgent ? "bg-accent-wash" : "hover:bg-glass"
      }`}
    >
      <div
        className={`relative grid grid-cols-1 gap-x-4 gap-y-1.5 py-3 pl-4 pr-3 transition-colors sm:grid-cols-[1.6fr_1fr_auto_auto_5.5rem_auto] sm:items-baseline sm:gap-y-0 sm:py-2.5 ${
          urgent ? "border-l-2 border-accent" : "border-l-2 border-transparent group-hover:border-text-faint"
        }`}
      >
        <div className="min-w-0 sm:pr-2">
          <span className="font-display text-[0.95rem] font-semibold text-text">
            {posting.company}
          </span>
          <span className="text-text-faint"> · </span>
          <span className="text-[0.9rem] text-text">{posting.title}</span>
        </div>

        <div className="text-xs text-text-muted sm:text-right">{posting.location}</div>

        <div className="text-xs text-text-muted">
          <span className="sm:hidden">posted </span>
          {posting.date_posted}
        </div>

        <div className={`text-xs ${urgent ? "font-semibold text-accent-bright" : "text-text-muted"}`}>
          <span className="sm:hidden">due </span>
          {posting.deadline || "—"}
          {urgent && <span className="ml-1.5 hidden sm:inline">deadline soon</span>}
        </div>

        <div className="text-xs text-text-muted">{posting.season}</div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-text-faint">{posting.source}</span>
          <a
            href={posting.url}
            target="_blank"
            rel="noopener noreferrer"
            className="border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Apply →
          </a>
        </div>
      </div>
    </li>
  );
}
