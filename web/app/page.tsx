import Header from "@/components/Header";
import JobBoard from "@/components/JobBoard";
import PersonalTab from "@/components/PersonalTab";
import HomeTabs from "@/components/HomeTabs";
import Footer from "@/components/Footer";
import { postings } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { rankPostings } from "@/lib/rankPostings";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedIds = new Set<string>();
  let hasResume = false;
  let hasParsedResume = false;
  let latestResumeName: string | null = null;
  let ranked = null;

  if (user) {
    const [{ data: saved }, { data: resumes }] = await Promise.all([
      supabase.from("saved_postings").select("posting_id").eq("user_id", user.id),
      supabase
        .from("resumes")
        .select("file_name, parsed_text")
        .eq("user_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(1),
    ]);

    savedIds = new Set((saved ?? []).map((row) => row.posting_id));

    const latest = resumes?.[0];
    if (latest) {
      hasResume = true;
      latestResumeName = latest.file_name;
      if (latest.parsed_text && latest.parsed_text.trim().length > 0) {
        hasParsedResume = true;
        ranked = rankPostings(latest.parsed_text, postings);
      }
    }
  }

  return (
    <>
      <div className="hero-gradient rounded-b-[2.5rem] pb-6">
        <Header />
      </div>
      <main className="flex-1">
        <HomeTabs
          allContent={<JobBoard postings={postings} savedIds={savedIds} />}
          personalContent={
            <PersonalTab
              loggedIn={!!user}
              hasResume={hasResume}
              hasParsedResume={hasParsedResume}
              latestResumeName={latestResumeName}
              ranked={ranked}
            />
          }
        />
      </main>
      <Footer />
    </>
  );
}
