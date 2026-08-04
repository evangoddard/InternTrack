import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TrackerSheet, { type TrackerRow } from "@/components/TrackerSheet";

// The tracker sheet only shows postings that have actually been applied to
// (applied_at set) -- not everything sitting in /saved. Once a row appears
// here it stays, even if status later moves past "applied" (interviewing,
// offer, rejected), since applied_at is a one-time flag, not the live status.
export default async function TrackerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-4">
        <h1 className="font-display text-2xl font-semibold text-text">Application tracker</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign in to track the applications you&apos;ve actually sent.
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

  const { data: rows, error } = await supabase
    .from("saved_postings")
    .select("*")
    .not("applied_at", "is", null)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("failed to load tracker rows:", error.message);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Application tracker</h1>
          <p className="mt-1 text-sm text-text-muted">
            {rows?.length ?? 0} applied. Company, role, location, and date applied are locked to what
            you actually applied for; everything else is yours to fill in.
          </p>
        </div>

        {rows && rows.length > 0 && (
          <a
            href="/tracker/export"
            className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Open as .xlsx
          </a>
        )}
      </div>

      {!rows || rows.length === 0 ? (
        <p className="mt-8 text-sm text-text-muted">
          Nothing here yet — mark a saved posting &quot;Applied&quot; on the{" "}
          <Link href="/saved" className="underline hover:text-accent-bright">
            Saved
          </Link>{" "}
          page and it&apos;ll show up here.
        </p>
      ) : (
        <div className="mt-6">
          <TrackerSheet rows={rows as TrackerRow[]} />
        </div>
      )}
    </div>
  );
}
