// -----------------------------------------------------------------------
// "Am I actually eligible for this?" -- reads a résumé for the few facts
// that hard-gate an internship application (degree level, graduation year)
// and checks postings against them.
//
// Design bias: FALSE NEGATIVES ARE WORSE THAN FALSE POSITIVES. Hiding a
// posting the user could actually have gotten is a real cost; leaving a
// borderline one visible costs them a few seconds of reading. So every
// rule here only fires on an unambiguous signal, and anything unparseable
// is treated as eligible.
// -----------------------------------------------------------------------

export type DegreeLevel = "associate" | "bachelor" | "master" | "phd";

const LEVEL_RANK: Record<DegreeLevel, number> = {
  associate: 0,
  bachelor: 1,
  master: 2,
  phd: 3,
};

export interface ResumeProfile {
  level: DegreeLevel;
  gradYear: number | null;
}

// --- reading the résumé ------------------------------------------------

/**
 * Infer degree level and expected graduation year from résumé text.
 *
 * Takes the *highest* degree mentioned, since someone pursuing a master's
 * still lists their bachelor's. Defaults to bachelor when nothing matches,
 * which is the least-restrictive assumption for an internship search.
 */
export function parseResumeProfile(text: string): ResumeProfile {
  const t = text.toLowerCase();

  let level: DegreeLevel = "bachelor";
  if (/\bph\.?\s?d\b|\bdoctora(l|te)\b/.test(t)) level = "phd";
  else if (/\bmaster'?s?\b|\bm\.?s\.?c?\b|\bm\.eng\b|\bmba\b/.test(t)) level = "master";
  else if (/\bassociate'?s?\b|\ba\.?a\.?s?\b/.test(t) && !/\bbachelor|b\.?s\.?\b/.test(t))
    level = "associate";

  // "Expected May 2029", "Expected Graduation: 2029", "Graduating 2029"
  const gradMatch =
    t.match(/expected[^.\n]{0,30}(20\d\d)/) ||
    t.match(/graduat\w*[^.\n]{0,30}(20\d\d)/) ||
    t.match(/class of\s+(20\d\d)/);

  const gradYear = gradMatch ? Number(gradMatch[1]) : null;

  return { level, gradYear };
}

// --- checking a posting ------------------------------------------------

export interface Verdict {
  eligible: boolean;
  /** Short human reason, only set when ineligible. */
  reason?: string;
}

const DEGREE_FIELD_MAP: Record<string, DegreeLevel> = {
  "associate's": "associate",
  "bachelor's": "bachelor",
  "master's": "master",
  mba: "master",
  phd: "phd",
};

/**
 * Rule 1 -- the structured `degrees` field Simplify ships with every
 * posting. If it lists degree levels and none of them is one the user
 * holds or is working toward, that's a hard gate.
 */
function checkDegreeField(degrees: string[], profile: ResumeProfile): Verdict {
  if (!degrees || degrees.length === 0) return { eligible: true };

  const wanted = degrees
    .map((d) => DEGREE_FIELD_MAP[d.trim().toLowerCase()])
    .filter(Boolean) as DegreeLevel[];

  if (wanted.length === 0) return { eligible: true };

  // Eligible if the posting accepts any level at or below the user's --
  // a bachelor's student can't take a PhD-only role, but a master's
  // student can take one open to bachelor's.
  const userRank = LEVEL_RANK[profile.level];
  const reachable = wanted.some((w) => LEVEL_RANK[w] <= userRank);
  if (reachable) return { eligible: true };

  const names = wanted
    .map((w) => ({ associate: "Associate", bachelor: "Bachelor's", master: "Master's", phd: "PhD" })[w])
    .filter((v, i, a) => a.indexOf(v) === i);

  return { eligible: false, reason: `${names.join("/")} only` };
}

/**
 * Rule 2 -- graduation window stated in the requirements text, e.g.
 * "graduating between December 2026 and June 2027". Only fires when a
 * real year range is found AND the résumé gave a graduation year.
 */
function checkGradWindow(text: string, profile: ResumeProfile): Verdict {
  if (!profile.gradYear) return { eligible: true };

  const range = text.match(
    /graduat\w*[^.\n]{0,80}?(20\d\d)\s*(?:-|–|—|and|to|through)\s*(?:\w+\s+)?(20\d\d)/i
  );
  if (range) {
    const lo = Number(range[1]);
    const hi = Number(range[2]);
    if (lo <= hi && (profile.gradYear < lo || profile.gradYear > hi)) {
      return { eligible: false, reason: `Graduation ${lo}–${hi}` };
    }
    return { eligible: true };
  }

  return { eligible: true };
}

/**
 * Rule 3 -- an explicit doctorate/master's requirement in the text that
 * the structured field missed. Deliberately narrow: it must say required
 * or "must be", and must not also offer a lower degree as an alternative.
 */
function checkDegreeText(text: string, profile: ResumeProfile): Verdict {
  const t = text.toLowerCase();
  const userRank = LEVEL_RANK[profile.level];

  const mentionsLower = /\bbachelor'?s?\b|\bundergraduate\b|\bb\.?s\.?\b/.test(t);

  if (userRank < LEVEL_RANK.phd) {
    const phdRequired =
      /(ph\.?\s?d\.?|doctora(l|te))[^.\n]{0,40}\b(required|is required|candidates only)\b/.test(t) ||
      /\b(must be|currently)\s+(?:enrolled in|pursuing)\s+a?\s*(ph\.?\s?d\.?|doctora)/.test(t);
    if (phdRequired && !mentionsLower) {
      return { eligible: false, reason: "PhD required" };
    }
  }

  if (userRank < LEVEL_RANK.master) {
    const mastersRequired =
      /\bmaster'?s?\b[^.\n]{0,40}\b(required|is required)\b/.test(t) ||
      /\b(must be|currently)\s+(?:enrolled in|pursuing)\s+a?\s*master'?s?\b/.test(t);
    if (mastersRequired && !mentionsLower) {
      return { eligible: false, reason: "Master's required" };
    }
  }

  return { eligible: true };
}

/**
 * Combined verdict for one posting. `qualifications` may be null when the
 * company's site doesn't publish readable requirements -- in that case only
 * the structured degree field is consulted.
 */
export function checkEligibility(
  degrees: string[],
  qualifications: string | null,
  profile: ResumeProfile
): Verdict {
  const byField = checkDegreeField(degrees, profile);
  if (!byField.eligible) return byField;

  if (qualifications) {
    const byWindow = checkGradWindow(qualifications, profile);
    if (!byWindow.eligible) return byWindow;

    const byText = checkDegreeText(qualifications, profile);
    if (!byText.eligible) return byText;
  }

  return { eligible: true };
}
