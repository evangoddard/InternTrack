import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import JobBoard from "@/components/JobBoard";
import HiddenPostings from "@/components/HiddenPostings";
import Footer from "@/components/Footer";
import { postings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Internship feed (classic)",
  description: "Open internship roles ranked against your résumé.",
  robots: { index: false, follow: false },
};


// The PREVIOUS dashboard, preserved verbatim as a fallback while the new
// workspace at /dashboard beds in. Reachable only by typing the URL — nothing
// links here, and it is excluded from robots.txt and the sitemap.
//
// Delete this route once the workspace has been running long enough to trust.
//
// The feed is the whole of it: résumé matching lives on /resume (still
// reachable by URL, deliberately not linked in the nav) so nothing competes
// with the list of postings here.
export default async function DashboardClassic() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed out, this page has nothing to show that the marketing page doesn't
  // show better. Sending them there keeps the two audiences cleanly separated.
  if (!user) redirect("/");

  const [{ data: saved }, { data: dismissed }, { data: resumes }] = await Promise.all([
    supabase.from("saved_postings").select("posting_id").eq("user_id", user.id),
    supabase.from("dismissed_postings").select("posting_id").eq("user_id", user.id),
    supabase
      .from("resumes")
      .select("parsed_text")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(1),
  ]);

  const savedIds = new Set((saved ?? []).map((row) => row.posting_id));
  const dismissedIds = new Set((dismissed ?? []).map((row) => row.posting_id));
  // Only a résumé we could actually read text from is usable for the
  // eligibility filter.
  const hasResume = Boolean(resumes?.[0]?.parsed_text?.trim());

  // Postings the user has ruled out are dropped before the feed sees them,
  // and collected separately so the "N hidden" toggle can offer them back.
  const visiblePostings = postings.filter((p) => !dismissedIds.has(p.id));
  const hiddenPostings = postings.filter((p) => dismissedIds.has(p.id));

  return (
    <>
      <div className="hero-gradient rounded-b-[2.5rem] pb-6">
        <Header />
      </div>
      <main className="flex-1">
        <JobBoard
          postings={visiblePostings}
          savedIds={savedIds}
          hiddenCount={hiddenPostings.length}
          hiddenContent={<HiddenPostings postings={hiddenPostings} />}
          hasResume={hasResume}
        />
      </main>
      <Footer />
    </>
  );
}
