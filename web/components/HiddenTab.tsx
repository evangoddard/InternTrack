import Link from "next/link";
import type { Posting } from "@/lib/types";
import { formatDate } from "@/lib/formatDate";
import { undismissPosting, restoreDismissed } from "@/app/saved/actions";
import CompanyLogo from "./CompanyLogo";

// Everything the user has ruled out, so hiding a posting isn't a one-way
// door -- each row can be put back individually, or all of them at once.
export default function HiddenTab({
  postings,
  loggedIn,
}: {
  postings: Posting[];
  loggedIn: boolean;
}) {
  if (!loggedIn) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm text-text-muted">
          <Link href="/login" className="underline hover:text-accent-bright">
            Sign in
          </Link>{" "}
          to hide postings you&apos;re not interested in.
        </p>
      </section>
    );
  }

  if (postings.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-sm text-text-muted">
          Nothing hidden yet. Open a posting in the feed and choose “Not interested — hide this” to
          drop it from the list.
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className="text-sm text-text-muted">
          {postings.length} posting{postings.length === 1 ? "" : "s"} hidden from the feed and your
          résumé matches.
        </p>
        <form action={restoreDismissed}>
          <button
            type="submit"
            className="text-xs font-semibold text-text-faint transition-colors hover:text-accent-bright"
          >
            Restore all
          </button>
        </form>
      </div>

      <ul className="mt-6">
        {postings.map((posting) => (
          <li key={posting.id} className="border-t border-border first:border-t-0">
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 pl-4 pr-4">
              <div className="flex min-w-0 items-center gap-2">
                <CompanyLogo company={posting.company} />
                <div className="min-w-0">
                  <span className="font-display text-[0.95rem] font-semibold text-text">
                    {posting.company}
                  </span>
                  <span className="text-text-faint"> · </span>
                  <span className="text-xs text-text">{posting.title}</span>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {posting.location || "—"}
                    {posting.date_posted ? ` · posted ${formatDate(posting.date_posted)}` : ""}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <a
                  href={posting.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
                >
                  Apply →
                </a>
                <form action={undismissPosting}>
                  <input type="hidden" name="posting_id" value={posting.id} />
                  <button
                    type="submit"
                    className="border-b border-transparent text-xs font-semibold text-text-faint transition-colors hover:border-accent-bright hover:text-accent-bright"
                  >
                    Unhide
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
