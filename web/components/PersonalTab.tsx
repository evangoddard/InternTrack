import Link from "next/link";
import { uploadResume } from "@/app/resume/actions";
import type { RankedPosting } from "@/lib/rankPostings";

export default function PersonalTab({
  loggedIn,
  hasResume,
  hasParsedResume,
  latestResumeName,
  ranked,
}: {
  loggedIn: boolean;
  hasResume: boolean;
  hasParsedResume: boolean;
  latestResumeName: string | null;
  ranked: RankedPosting[] | null;
}) {
  if (!loggedIn) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
        <h2 className="font-display text-xl font-semibold text-text">
          Sign in to see personal matches
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted">
          Upload your résumé once, signed in, and this tab ranks every current posting
          against it.
        </p>
        <Link
          href="/login"
          className="mt-5 inline-block rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-text"
        >
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h2 className="font-display text-lg font-semibold text-text">Your résumé</h2>
        <p className="mt-2 max-w-xl text-sm text-text-muted">
          {hasResume
            ? `Matching against "${latestResumeName}". Upload a new file to replace it.`
            : "Upload a PDF or .txt résumé to see postings ranked against it."}
        </p>

        <form
          action={uploadResume}
          className="mt-5 flex flex-wrap items-center gap-3"
        >
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.txt"
            className="text-sm text-text-muted file:mr-3 file:rounded-full file:border-0 file:bg-accent-fill file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-text"
          />
          <button
            type="submit"
            className="rounded-full bg-accent-fill px-4 py-1.5 text-sm font-semibold text-text transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {hasResume ? "Replace" : "Upload"}
          </button>
          <Link href="/resume" className="text-xs text-text-faint hover:text-text-muted">
            Manage uploaded résumés →
          </Link>
        </form>

        {hasResume && !hasParsedResume && (
          <p className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            Couldn&apos;t read text from your résumé (likely a scanned/image PDF). Try a
            text-based PDF or a .txt file.
          </p>
        )}
      </div>

      {ranked && (
        <div className="mt-6">
          <h2 className="font-display text-lg font-semibold text-text">Best matches</h2>
          <p className="mt-1 text-sm text-text-muted">
            Ranked by keyword/phrase overlap (TF-IDF + cosine similarity) against each
            posting&apos;s title, company, category, and degree level — see{" "}
            <code className="text-text">lib/rankPostings.ts</code>.
          </p>

          <ul className="mt-4">
            {ranked.slice(0, 30).map(({ posting, score }) => (
              <li
                key={posting.id}
                className="flex items-center justify-between gap-4 border-t border-border py-2.5 first:border-t-0"
              >
                <div className="min-w-0 truncate text-sm text-text">
                  <span className="font-display font-semibold">{posting.company}</span>
                  <span className="text-text-faint"> · </span>
                  {posting.title}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-accent/50 bg-accent-wash px-2.5 py-0.5 font-num text-xs font-semibold tabular-nums text-accent-bright">
                    {score}
                  </span>
                  <a
                    href={posting.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
                  >
                    Apply →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
