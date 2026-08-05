import Header from "@/components/Header";
import JobBoard from "@/components/JobBoard";
import HiddenPostings from "@/components/HiddenPostings";
import Footer from "@/components/Footer";
import { postings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

// The home page is just the feed. Résumé matching lives on /resume (still
// reachable by URL, deliberately not linked in the nav) so nothing competes
// with the list of postings here.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedIds = new Set<string>();
  let dismissedIds = new Set<string>();

  if (user) {
    const [{ data: saved }, { data: dismissed }] = await Promise.all([
      supabase.from("saved_postings").select("posting_id").eq("user_id", user.id),
      supabase.from("dismissed_postings").select("posting_id").eq("user_id", user.id),
    ]);

    savedIds = new Set((saved ?? []).map((row) => row.posting_id));
    dismissedIds = new Set((dismissed ?? []).map((row) => row.posting_id));
  }

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
        />
      </main>
      <Footer />
    </>
  );
}
