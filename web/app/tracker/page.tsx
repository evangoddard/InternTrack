import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TrackerBoard, { type TrackerRow } from "@/components/TrackerBoard";
import SkillGaps from "@/components/SkillGaps";
import { postings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Application tracker",
  description: "Every internship you have saved and applied to.",
  robots: { index: false, follow: false },
};


// Every saved posting is a row here, newest first -- saving is what puts it
// in the sheet, and status starts at "Not applied" until you move it along.
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
          Sign in to track the internships you&apos;ve saved and applied to.
        </p>
        <Link
          href="/login"
          className="mt-4 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-accent-ink"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const { data: rows, error } = await supabase
    .from("saved_postings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("failed to load tracker rows:", error.message);
  }

  // Tracker rows are snapshots taken when you saved them, so a posting that
  // has since closed would otherwise sit here looking live. Anything whose
  // id is no longer in the current feed gets flagged -- never deleted, since
  // an application you already sent still matters.
  const listedIds = new Set(postings.map((p) => p.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Applications" }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Application tracker</h1>
          <p className="mt-1 text-sm text-text-muted">
            {`${rows?.length ?? 0} tracked.`}{" "}
            Every posting you save lands here. Company, role, and
            location stay locked to the real posting; Date Applied fills itself in the first time
            you move a row off &quot;Not applied.&quot;
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
          Nothing here yet — hit Save on a posting in the{" "}
          <Link href="/dashboard" className="underline hover:text-accent-bright">
            feed
          </Link>{" "}
          and it&apos;ll show up as a row.
        </p>
      ) : (
        <div className="mt-6">
          <TrackerBoard rows={rows as TrackerRow[]} listedIds={listedIds} />
          <SkillGaps />
        </div>
      )}
    </div>
  );
}
