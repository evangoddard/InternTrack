// -----------------------------------------------------------------------
// STUB MATCHER — replace this with a real resume/job matcher later.
//
// rankPostings() is intentionally a placeholder. It does not read
// `resumeText` at all yet — it just returns every posting with a fake
// score so the UI has something to render. Swap the body of this
// function out for a real implementation (keyword overlap, embeddings,
// an LLM call, whatever) without touching any component; every caller
// only depends on this function's signature and return shape.
//
// Everything here runs client-side — no network calls, no resume text
// leaves the browser.
// -----------------------------------------------------------------------

import type { Posting } from "./types";

export interface RankedPosting {
  posting: Posting;
  score: number; // 0-100, placeholder only — not a real match score yet
}

export function rankPostings(
  resumeText: string,
  postings: Posting[]
): RankedPosting[] {
  // PLACEHOLDER SCORING: deterministic-but-arbitrary, derived from the
  // resume length and the posting id, purely so the UI can display
  // *something* that varies per posting. This has no relationship to how
  // well a resume actually matches a job — do not read meaning into it.
  const seed = resumeText.trim().length;

  const ranked = postings.map((posting) => {
    const hash = hashString(posting.id + seed);
    const score = hash % 101; // 0-100
    return { posting, score };
  });

  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}
