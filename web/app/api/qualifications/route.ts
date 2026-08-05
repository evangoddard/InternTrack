import { NextResponse } from "next/server";
import { fetchQualifications, type Qualifications } from "@/lib/qualifications";
import { createClient } from "@/lib/supabase/server";
import { explainMatch } from "@/lib/matchExplain";

// GET /api/qualifications?url=<posting url>
//
// Fetched on demand when a posting row is expanded, not up front for the
// whole feed -- most postings are never opened, and this way a scan doesn't
// fan out into 137 requests. Results are memoised per posting URL for the
// life of the server process, so re-opening a row is instant.
//
// When the caller is signed in with a readable résumé, the response also
// carries the match explanation: which of the skills this posting names are
// on their résumé and which aren't. That part is per-user and so is
// computed fresh each time rather than cached.

const cache = new Map<string, Qualifications | null>();
const MAX_CACHE = 500;

async function resumeTextFor(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("resumes")
    .select("parsed_text")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  return data?.[0]?.parsed_text?.trim() || null;
}

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let quals: Qualifications | null;
  if (cache.has(url)) {
    quals = cache.get(url) ?? null;
  } else {
    quals = await fetchQualifications(url);

    // Crude bound on the cache -- this is a personal-scale app, and dropping
    // the oldest entries is fine since a miss just re-fetches.
    if (cache.size >= MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(url, quals);
  }

  if (!quals) return NextResponse.json({ available: false });

  const resume = await resumeTextFor();
  const match = resume ? explainMatch(resume, quals.full) : null;

  return NextResponse.json({ available: true, ...quals, match });
}
