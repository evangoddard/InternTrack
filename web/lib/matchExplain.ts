import { findSkills, type Skill, type SkillHit } from "./skills";

// -----------------------------------------------------------------------
// Explainable match: which of a posting's stated skills your résumé shows,
// and which it doesn't.
//
// This is deliberately not the TF-IDF ranking in rankPostings.ts. That one
// orders the whole feed by overall textual similarity and produces a number
// with no justification. This one answers a different, more useful
// question about a single posting: what specifically am I missing?
//
// The score is plain coverage -- of the skills this posting actually names,
// how many appear on your résumé, weighted by how often the posting repeats
// them. A skill mentioned six times is more central than one mentioned
// once, but the weight is capped so a single obsessive keyword can't swamp
// everything else.
// -----------------------------------------------------------------------

const MAX_WEIGHT = 3;

export interface MatchExplanation {
  /** 0-100 coverage of the posting's named skills. */
  score: number;
  /** Skills the posting names that your résumé also shows. */
  matched: string[];
  /** Skills the posting names that your résumé doesn't mention, most
   *  emphasised first -- this is the actionable half. */
  missing: string[];
  /** Total distinct skills the posting named. */
  total: number;
}

function weight(hit: SkillHit): number {
  return Math.min(hit.count, MAX_WEIGHT);
}

function label(skill: Skill): string {
  return skill.name;
}

/**
 * Returns null when there's nothing honest to say -- either the résumé
 * couldn't be read, or the posting text names no recognisable skills (a
 * vague description, or a host whose requirements we can't fetch). Callers
 * show the posting without a score rather than inventing one.
 */
export function explainMatch(
  resumeText: string,
  postingText: string
): MatchExplanation | null {
  if (!resumeText?.trim() || !postingText?.trim()) return null;

  const postingSkills = findSkills(postingText);
  if (postingSkills.length < 2) return null;

  const resumeSkills = new Set(findSkills(resumeText).map((h) => h.skill.name));

  const matched: SkillHit[] = [];
  const missing: SkillHit[] = [];
  for (const hit of postingSkills) {
    (resumeSkills.has(hit.skill.name) ? matched : missing).push(hit);
  }

  const totalWeight = postingSkills.reduce((sum, h) => sum + weight(h), 0);
  const matchedWeight = matched.reduce((sum, h) => sum + weight(h), 0);
  const score = totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100);

  // Most-emphasised first, so the top of the "missing" list is what the
  // posting cares about most.
  const byWeight = (a: SkillHit, b: SkillHit) => b.count - a.count;

  return {
    score,
    matched: matched.sort(byWeight).map((h) => label(h.skill)),
    missing: missing.sort(byWeight).map((h) => label(h.skill)),
    total: postingSkills.length,
  };
}

/**
 * Which skills come up most across a set of postings -- the "you should
 * probably learn this" view. Counts postings that mention a skill, not raw
 * mentions, so one verbose posting can't dominate.
 */
export function skillFrequency(
  postingTexts: string[],
  resumeText: string
): { name: string; postings: number; share: number; onResume: boolean }[] {
  const withText = postingTexts.filter((t) => t?.trim());
  if (withText.length === 0) return [];

  const counts = new Map<string, number>();
  for (const text of withText) {
    for (const hit of findSkills(text)) {
      counts.set(hit.skill.name, (counts.get(hit.skill.name) ?? 0) + 1);
    }
  }

  const onResume = new Set(findSkills(resumeText ?? "").map((h) => h.skill.name));

  return [...counts.entries()]
    .map(([name, postings]) => ({
      name,
      postings,
      share: Math.round((postings / withText.length) * 100),
      onResume: onResume.has(name),
    }))
    .sort((a, b) => b.postings - a.postings);
}
