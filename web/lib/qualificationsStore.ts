import { createClient } from "@/lib/supabase/server";
import { fetchQualifications, type Qualifications } from "@/lib/qualifications";

// Supabase-backed cache in front of lib/qualifications.ts.
//
// The eligibility filter needs requirements text for the whole feed, not
// just the row you opened, so fetching has to happen once globally rather
// than once per user per server restart. This is public posting data, so a
// single shared table serves everyone (see migration 0008).

export interface CachedQualifications {
  available: boolean;
  qualifications: string | null;
  full: string | null;
  source: string | null;
}

const MISS: CachedQualifications = {
  available: false,
  qualifications: null,
  full: null,
  source: null,
};

/** How many upstream sites to hit at once. Enough to get through ~140
 *  postings in well under a minute without hammering any one host. */
const CONCURRENCY = 8;

type Row = { posting_id: string; url: string };

function toCached(q: Qualifications | null): CachedQualifications {
  return q
    ? { available: true, qualifications: q.qualifications, full: q.full, source: q.source }
    : MISS;
}

/**
 * Resolve qualifications for many postings, hitting the network only for
 * ones not already cached. Returns a map keyed by posting id; every
 * requested id is present, with `available: false` for hosts we can't read.
 */
export async function getQualificationsFor(
  postings: Row[]
): Promise<Record<string, CachedQualifications>> {
  const supabase = await createClient();
  const result: Record<string, CachedQualifications> = {};

  const ids = postings.map((p) => p.posting_id);
  const { data: cached } = await supabase
    .from("posting_qualifications")
    .select("posting_id, available, qualifications, full_text, source")
    .in("posting_id", ids);

  const have = new Set<string>();
  for (const row of cached ?? []) {
    have.add(row.posting_id);
    result[row.posting_id] = {
      available: row.available,
      qualifications: row.qualifications,
      full: row.full_text,
      source: row.source,
    };
  }

  const missing = postings.filter((p) => !have.has(p.posting_id));
  if (missing.length === 0) return result;

  // Simple worker pool -- each worker pulls the next index until the queue
  // is drained, so a slow host doesn't stall a whole batch.
  let cursor = 0;
  const fresh: {
    posting_id: string;
    url: string;
    available: boolean;
    qualifications: string | null;
    full_text: string | null;
    source: string | null;
  }[] = [];

  async function worker() {
    while (cursor < missing.length) {
      const item = missing[cursor++];
      let value: CachedQualifications;
      try {
        value = toCached(await fetchQualifications(item.url));
      } catch {
        value = MISS;
      }
      result[item.posting_id] = value;
      fresh.push({
        posting_id: item.posting_id,
        url: item.url,
        available: value.available,
        qualifications: value.qualifications,
        full_text: value.full,
        source: value.source,
      });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, missing.length) }, () => worker())
  );

  if (fresh.length > 0) {
    const { error } = await supabase
      .from("posting_qualifications")
      .upsert(fresh, { onConflict: "posting_id" });
    if (error) console.error("qualifications cache write failed:", error.message);
  }

  return result;
}
