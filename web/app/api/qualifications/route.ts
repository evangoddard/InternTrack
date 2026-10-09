import { NextResponse } from "next/server";
import { fetchQualifications, type Qualifications } from "@/lib/qualifications";
import { createClient } from "@/lib/supabase/server";
import { explainMatch } from "@/lib/matchExplain";
import { checkRateLimit, dedupe, tooManyRequests } from "@/lib/rateLimit";

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
//
// SECURITY: this route takes a caller-supplied URL and makes a server-side
// request to it, so it is an outbound-fetch surface and is treated as one:
//   - it requires a session (it previously required none at all, which made
//     it an open request proxy for anyone on the internet);
//   - it is rate limited, because each call costs an upstream request;
//   - the host allowlist in lib/qualifications.ts does the actual target
//     validation, and now matches on a dot boundary so a lookalike domain
//     cannot satisfy it.

const cache = new Map<string, Qualifications | null>();
const MAX_CACHE = 500;

async function resumeTextFor(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resumes")
    .select("parsed_text")
    .eq("user_id", userId)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  return data?.[0]?.parsed_text?.trim() || null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authentication before anything else: no session, no outbound request.
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  const limit = await checkRateLimit("qualifications");
  if (!limit.allowed) return tooManyRequests("qualifications", limit);

  let quals: Qualifications | null;
  if (cache.has(url)) {
    quals = cache.get(url) ?? null;
  } else {
    // Two rows opened at once for the same posting should cost one fetch.
    quals = await dedupe(`quals:${url}`, () => fetchQualifications(url));

    // Crude bound on the cache -- this is a personal-scale app, and dropping
    // the oldest entries is fine since a miss just re-fetches.
    if (cache.size >= MAX_CACHE) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(url, quals);
  }

  if (!quals) {
    return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
  }

  const resume = await resumeTextFor(user.id);
  const match = resume ? explainMatch(resume, quals.full) : null;

  // The match block is derived from the caller's résumé, so the response as
  // a whole is per-user and must not be cached by a proxy.
  return NextResponse.json(
    { available: true, ...quals, match },
    { headers: { "Cache-Control": "no-store" } }
  );
}
