import { NextResponse } from "next/server";
import { fetchQualifications, type Qualifications } from "@/lib/qualifications";

// GET /api/qualifications?url=<posting url>
//
// Fetched on demand when a posting row is expanded, not up front for the
// whole feed -- most postings are never opened, and this way a scan doesn't
// fan out into 137 requests. Results are memoised per posting URL for the
// life of the server process, so re-opening a row is instant.
//
// Only whole-URL lookups against the hosts lib/qualifications.ts knows how
// to read; anything else returns available:false rather than fetching an
// arbitrary user-supplied address.

const cache = new Map<string, Qualifications | null>();
const MAX_CACHE = 500;

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  if (cache.has(url)) {
    const hit = cache.get(url) ?? null;
    return NextResponse.json(hit ? { available: true, ...hit } : { available: false });
  }

  const result = await fetchQualifications(url);

  // Crude bound on the cache -- this is a personal-scale app, and dropping
  // the oldest entries is fine since a miss just re-fetches.
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(url, result);

  return NextResponse.json(result ? { available: true, ...result } : { available: false });
}
