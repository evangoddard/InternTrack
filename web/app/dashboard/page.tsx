import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { postings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import WorkspaceShell, {
  type SavedRow,
  type Profile,
} from "@/components/workspace/WorkspaceShell";
import "@/components/workspace/workspace.css";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Every open internship, scored against your résumé, in one view.",
  robots: { index: false, follow: false },
};

/**
 * The authenticated application.
 *
 * A single workspace over data the app already owned: the feed, the saved
 * roles, the résumé, and the application pipeline in one view, so moving
 * between roles no longer means moving between pages.
 *
 * It introduces no new tables, no schema change, and no new write path —
 * saving, un-saving, hiding, and stage changes all go through the same server
 * actions in app/saved/actions.ts that /tracker uses, which is why the two
 * stay consistent with each other.
 *
 * The previous single-column feed is preserved at /dashboard-classic.
 *
 * Everything is fetched here on the server in one pass; the client shell holds
 * selection and filter state only.
 */
export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed out, this page has nothing to show that the marketing page doesn't
  // show better.
  if (!user) redirect("/");

  const [
    { data: saved, error: savedError },
    { data: dismissed },
    { data: resumes },
  ] = await Promise.all([
    supabase
      .from("saved_postings")
      // Only columns this view renders. resume_used / cover_letter / salary /
      // offer are deliberately NOT selected: migration 0004 has not been
      // applied to this project, and asking for them fails the whole query.
      .select(
        "id, posting_id, status, company, title, url, location, season, applied_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase.from("dismissed_postings").select("posting_id").eq("user_id", user.id),
    supabase
      .from("resumes")
      .select("file_name, parsed_text, uploaded_at")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(1),
  ]);

  // A failed select here would otherwise fall through to an empty list, which
  // looks exactly like "you have saved nothing" — the most misleading possible
  // failure for this screen.
  if (savedError) {
    console.error("dashboard: saved_postings select failed:", savedError.message);
  }

  const dismissedIds = new Set((dismissed ?? []).map((r) => r.posting_id));
  // Postings the user has ruled out are dropped before the feed sees them.
  const visible = postings.filter((p) => !dismissedIds.has(p.id));

  const resume = resumes?.[0];
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;

  const profile: Profile = {
    email: user.email ?? "",
    fullName: typeof meta.full_name === "string" ? meta.full_name : "",
    degreeLevel: typeof meta.degree_level === "string" ? meta.degree_level : "",
    gradYear: typeof meta.grad_year === "number" ? meta.grad_year : null,
    interests: Array.isArray(meta.interests) ? (meta.interests as string[]) : [],
    resumeName: resume?.file_name ?? null,
    // Only a résumé we could actually read text from can drive matching.
    resumeReadable: Boolean(resume?.parsed_text?.trim()),
    resumeUploadedAt: resume?.uploaded_at ?? null,
  };

  return (
    <WorkspaceShell
      postings={visible}
      saved={(saved ?? []) as SavedRow[]}
      hiddenCount={dismissedIds.size}
      profile={profile}
    />
  );
}
