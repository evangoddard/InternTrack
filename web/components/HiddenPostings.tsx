import type { Posting } from "@/lib/types";
import { undismissPosting, restoreDismissed } from "@/app/saved/actions";

// The compact list behind the "N hidden · show" toggle under the feed.
// Kept quiet on purpose -- it exists so hiding isn't a one-way door, not as
// a place to spend time.
export default function HiddenPostings({ postings }: { postings: Posting[] }) {
  if (postings.length === 0) return null;

  return (
    <div>
      <ul>
        {postings.map((posting) => (
          <li
            key={posting.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-2 text-xs"
          >
            <span className="min-w-0 truncate text-text-muted">
              <span className="font-display font-semibold text-text">{posting.company}</span>
              <span className="text-text-faint"> · </span>
              {posting.title}
            </span>
            <form action={undismissPosting}>
              <input type="hidden" name="posting_id" value={posting.id} />
              <button
                type="submit"
                className="shrink-0 font-semibold text-text-faint transition-colors hover:text-accent-bright"
              >
                Unhide
              </button>
            </form>
          </li>
        ))}
      </ul>

      <form action={restoreDismissed} className="mt-3">
        <button
          type="submit"
          className="text-xs text-text-faint transition-colors hover:text-accent-bright"
        >
          Restore all
        </button>
      </form>
    </div>
  );
}
