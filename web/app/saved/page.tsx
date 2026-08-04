import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { unsavePosting } from "@/app/saved/actions";
import StatusSelect from "@/components/StatusSelect";

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-4">
        <h1 className="font-display text-2xl font-semibold text-text">Saved postings</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in to see the postings you&apos;ve saved and track their status.
        </p>
        <Link
          href="/login"
          className="mt-4 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-text"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: saved, error } = await supabase
    .from("saved_postings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("failed to load saved postings:", error.message);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-text">Saved postings</h1>
      <p className="mt-1 text-sm text-text-muted">
        {saved?.length ?? 0} saved. Update status as you move through each application.
      </p>

      {!saved || saved.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">
          Nothing saved yet — head back to the feed and hit Save on a posting.
        </p>
      ) : (
        <ul className="mt-6">
          {saved.map((row) => (
            <li key={row.id} className="border-t border-border py-3 first:border-t-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-display font-semibold text-text">{row.company}</span>
                  <span className="text-text-faint"> · </span>
                  <span className="text-sm text-text">{row.title}</span>
                  <div className="mt-0.5 text-xs text-text-muted">
                    {row.location || "—"}
                    {row.season ? ` · ${row.season}` : ""}
                    {row.source ? ` · ${row.source}` : ""}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <StatusSelect id={row.id} status={row.status} />
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-b border-text-faint text-xs font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
                  >
                    Apply →
                  </a>
                  <form action={unsavePosting}>
                    <input type="hidden" name="id" value={row.id} />
                    <button
                      type="submit"
                      className="text-xs text-text-faint transition-colors hover:text-red-400"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
