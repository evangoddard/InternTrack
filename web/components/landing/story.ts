// Content for the public marketing site.
//
// EVERY CLAIM IN THIS FILE MUST BE TRUE OF THE SHIPPED PRODUCT.
//
// Verified against the codebase on writing:
//   - Postings come from exactly one source: the SimplifyJobs public
//     internship list (see ../../sources.py, config.example.yaml). There are
//     no other feeds. Counts come from data.json at build time, never typed in.
//   - Matching is TF-IDF + cosine similarity computed in-product
//     (lib/rankPostings.ts). No embedding model, no third-party AI call.
//   - Per-posting requirements are fetched from the company's own applicant
//     tracking system on demand (lib/qualifications.ts).
//   - Eligibility reads degree level + graduation year (lib/eligibility.ts).
//   - Skill gaps aggregate across saved postings (app/api/skill-gaps).
//   - Résumés live in Supabase Storage + the `resumes` table, both under
//     row-level security scoped to the owner (supabase/schema.sql).
//   - There is no billing code and no paid plan anywhere in the project.
//
// The workspace illustration below uses real companies and real role titles
// taken from data.json. Match scores are illustrative — an actual score
// depends on the viewer's own résumé.

/** The workspace is laid out on a fixed-size canvas so its internal geometry is
 *  viewport-independent. That is what lets the camera be measured once and
 *  makes every zoom level predictable. */
export const CANVAS = { W: 2200, H: 940 } as const;

/** Fixed row height keeps the feed's narrowing animation pure-transform: rows
 *  reflow by translating a multiple of this, never by animating layout. */
export const ROW_H = 34;

// --- résumé ----------------------------------------------------------------

export const RESUME = {
  file: "resume.pdf",
  meta: "1 page · uploaded just now",
  lines: [12, 9, 11, 7, 10, 6, 11, 8, 5, 9, 7, 10],
};

/** Skills read out of the document. PDF and plain text are what the extractor
 *  actually supports (lib/parseResume.ts). */
export const EXTRACTED = [
  "TypeScript",
  "React",
  "Go",
  "Python",
  "Postgres",
  "Distributed systems",
  "REST APIs",
  "Docker",
  "Redis",
  "CI/CD",
];

// --- the feed --------------------------------------------------------------

export interface FeedRow {
  id: string;
  company: string;
  role: string;
  loc: string;
  match: number;
  /** Survives the narrowing pass. */
  keep: boolean;
}

// [company, role, location, match] — companies and titles are real rows from
// data.json; scores are illustrative.
type RowTuple = [string, string, string, number];

const ROWS: RowTuple[] = [
  ["TikTok", "Software Engineer Intern — Foundation Platform", "San Jose, CA", 81],
  ["Microsoft", "Software Engineer Intern — CoreAI", "Redmond, WA", 79],
  ["Samsara", "Software Engineering Intern", "San Francisco, CA", 77],
  ["NVIDIA", "Software Engineer Intern — Dynamo", "Santa Clara, CA", 75],
  ["Roblox", "Software Engineer Intern", "San Mateo, CA", 73],
  ["Jane Street", "Software Engineer Intern", "London, UK", 72],
  ["Chicago Trading Company", "Software Engineer Intern", "Chicago, IL", 71],
  ["TikTok", "Software Engineer Intern — Media Engine", "San Jose, CA", 70],
  ["ByteDance", "Student Researcher — Compiler, Seed Infra", "San Jose, CA", 66],
  ["TikTok", "Machine Learning Engineer Intern — Search", "Seattle, WA", 63],
  ["Qualcomm", "AI Integration & Interoperability Intern", "Cheektowaga, NY", 61],
  ["GE Appliances", "Software Engineer Co-op", "Louisville, KY", 58],
  ["Northrop Grumman", "Software Engineer Intern — Aeronautics", "Melbourne, FL", 56],
  ["John Deere", "Software Engineer Part-Time Student", "Moline, IL", 54],
  ["RTX", "Software Engineer Intern — Summer 2027", "Cedar Rapids, IA", 52],
  ["ByteDance", "ASIC Design Engineer Intern — Video Silicon IP", "San Jose, CA", 49],
  ["SpaceX", "Silicon Engineer Intern/Co-op", "Palo Alto, CA", 47],
  ["ByteDance", "Research Scientist Intern — Multimedia", "San Diego, CA", 45],
  ["General Dynamics IT", "AI/Machine Learning Intern", "Falls Church, VA", 43],
  ["Point Blue Conservation", "Data Science Intern — Ecoinformatics", "Petaluma, CA", 41],
  ["JP Morgan Chase", "Quantitative Research Intern", "New York, NY", 38],
  ["JP Morgan Chase", "Quantitative Research Intern — Markets", "New York, NY", 36],
  ["JP Morgan Chase", "Quantitative Research Intern — Risk", "Plano, TX", 35],
  ["Jane Street", "Quantitative Researcher", "London, UK", 33],
  ["Jane Street", "Linux Engineer Intern", "London, UK", 32],
  ["Optiver", "Quantitative Intern — Summer 2027", "Austin, TX", 30],
  ["Two Sigma", "Quantitative Research Intern", "New York, NY", 29],
  ["Chicago Trading Company", "Quantitative Trading Intern", "Chicago, IL", 27],
  ["DV Trading", "Quantitative Risk Intern", "Chicago, IL", 25],
  ["Maven Securities", "Trader Intern — Summer", "Chicago, IL", 23],
  ["Susquehanna (SIG)", "Derivatives Sales Trader Intern", "New York, NY", 21],
  ["American Express", "Product Management Intern", "New York, NY", 19],
  ["American Express", "Product Development Intern", "New York, NY", 17],
  ["Capital One", "Data Science Intern", "McLean, VA", 15],
];

/** The narrowing pass keeps everything at or above this. Eight of thirty-four. */
export const MATCH_FLOOR = 70;

export const FEED: FeedRow[] = ROWS.map(([company, role, loc, match], i) => ({
  id: `r${String(i + 1).padStart(2, "0")}`,
  company,
  role,
  loc,
  match,
  keep: match >= MATCH_FLOOR,
}));

export const KEPT = FEED.filter((r) => r.keep);

/** Index of the posting the story zooms into. */
export const HERO_INDEX = 0;
export const HERO = FEED[HERO_INDEX];

export const HERO_KEPT_INDEX = KEPT.findIndex((r) => r.id === HERO.id);

// --- why it matches --------------------------------------------------------

export const HERO_DETAIL = {
  season: "Summer 2027",
  posted: "4 hours ago",
  gate: "Bachelor's or Master's, graduating after Dec 2027",
  have: ["Go", "Postgres", "Distributed systems", "REST APIs", "Python"],
  missing: ["Kafka", "Kubernetes"],
  because:
    "Five of the seven skills this posting's own listing names are already on your résumé, including all three it marks as required.",
};

// --- skill gaps ------------------------------------------------------------

export interface Gap {
  name: string;
  /** Share of the postings you saved that name it. */
  share: number;
  onResume: boolean;
}

export const GAPS: Gap[] = [
  { name: "Kubernetes", share: 57, onResume: false },
  { name: "Rust", share: 52, onResume: false },
  { name: "Kafka", share: 44, onResume: false },
  { name: "Terraform", share: 38, onResume: false },
  { name: "gRPC", share: 31, onResume: false },
];

// --- the tracker -----------------------------------------------------------

export type StageKey = "saved" | "applied" | "interview" | "offer";

export const STAGES: { key: StageKey; label: string }[] = [
  { key: "saved", label: "Saved" },
  { key: "applied", label: "Applied" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
];

export interface TrackerCard {
  id: string;
  company: string;
  role: string;
  stage: StageKey;
  note: string;
}

export const TRACKER: TrackerCard[] = [
  { id: "t01", company: "Jane Street", role: "Quant Researcher", stage: "saved", note: "Not applied" },
  { id: "t02", company: "Optiver", role: "Quantitative Intern", stage: "saved", note: "Not applied" },
  { id: "t03", company: "SpaceX", role: "Silicon Engineer", stage: "saved", note: "Not applied" },
  { id: "t04", company: "NVIDIA", role: "SWE, Dynamo", stage: "applied", note: "Applied Aug 2" },
  { id: "t05", company: "Roblox", role: "Software Engineer", stage: "applied", note: "Applied Jul 28" },
  { id: "t06", company: "ByteDance", role: "Student Researcher", stage: "applied", note: "Applied Jul 24" },
  { id: "t07", company: "Samsara", role: "Software Engineering", stage: "interview", note: "Round 2" },
  { id: "t08", company: "Microsoft", role: "SWE, CoreAI", stage: "interview", note: "Round 1" },
  { id: "t09", company: "Chicago Trading", role: "Software Engineer", stage: "offer", note: "Offer received" },
];

// --- headline figures ------------------------------------------------------
//
// Counted directly from web/data.json.

export const STATS = {
  season: "Summer 2027",
  /** The SimplifyJobs public internship list. There is exactly one. */
  sourceName: "SimplifyJobs",
};

/**
 * Counts read from data.json at build time and threaded down from the server
 * page, rather than written into the copy by hand.
 *
 * They were hardcoded as 180/61 and had already drifted to 201/63 by the time
 * anyone noticed — the scanner commits a fresh data.json every hour, so any
 * number typed into a string here is wrong within a day.
 */
export interface LiveCounts {
  roles: number;
  companies: number;
  /** ISO date of the last successful scan. */
  updated: string;
}

/** Substitutes {roles} / {companies} / {updated} in copy. */
export function fill(text: string, c: LiveCounts): string {
  return text
    .replace(/\{roles\}/g, String(c.roles))
    .replace(/\{companies\}/g, String(c.companies))
    .replace(/\{updated\}/g, c.updated);
}

// --- motion tokens ---------------------------------------------------------
//
// Measured off a reference recording rather than guessed: a staggered product
// reveal running 0.76s per item, 0.16s apart, on a symmetric ease-in-out
// (9% done at t=0.21, 48% at t=0.53, 91% at t=0.84).
export const MOTION = {
  /** Seconds. Applies literally to the un-scrubbed section reveals. */
  reveal: 0.76,
  /** Seconds between siblings in a staggered group. */
  stagger: 0.16,
  ease: "power2.inOut",
  /**
   * Inside the pinned stage a tween's "duration" is scroll distance, not time,
   * so the measured seconds are meaningless there. What does carry over is the
   * ease shape and the ratio between stagger and duration.
   */
  staggerRatio: 0.16 / 0.76,
} as const;

// --- page copy -------------------------------------------------------------

export const BRAND = "InternTrack";

export const HERO_COPY = {
  head: "Your internship search, organized.",
  body: "Discover relevant internships, strengthen your applications, and track every opportunity in one place.",
};

export const AUTH = {
  primary: "Find My Internships",
  secondary: "Sign In",
};

export const CTA = {
  eyebrow: "Get started",
  head: "Start with the résumé you already have.",
  body: "InternTrack reads it once and scores every posting in the feed against it, for as long as the season runs.",
  action: "Find My Internships",
  secondary: "Sign In",
};

// --- marketing navigation --------------------------------------------------

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "About", href: "#about" },
];

/** The chiplet row — a map of the surfaces the product actually has. */
export interface Chiplet {
  id: string;
  label: string;
  glyph: "feed" | "match" | "resume" | "gaps" | "tracker" | "saved";
}

export const CHIPLETS: Chiplet[] = [
  { id: "ch1", label: "Feed", glyph: "feed" },
  { id: "ch2", label: "Matches", glyph: "match" },
  { id: "ch3", label: "Résumé", glyph: "resume" },
  { id: "ch4", label: "Gaps", glyph: "gaps" },
  { id: "ch5", label: "Tracker", glyph: "tracker" },
  { id: "ch6", label: "Saved", glyph: "saved" },
];

// --- features --------------------------------------------------------------

/**
 * A small, real fragment of the product rendered inside an expanded card —
 * the same score block, chips, verdict rows and gap bars the app itself
 * shows, rather than a stock illustration.
 */
export type CardExample =
  | { kind: "score"; score: number; matched: string[]; missing: string[] }
  | { kind: "requirements"; source: string; lines: string[]; covered: string[] }
  | { kind: "verdicts"; rows: { label: string; ok: boolean; reason?: string }[] }
  | { kind: "gaps"; rows: { name: string; share: number }[] }
  | { kind: "source"; rows: { label: string; value: string }[] };

export interface CarouselCard {
  id: string;
  eyebrow: string;
  head: string;
  body: string;
  art: "sources" | "score" | "gate" | "gaps" | "quiet";
  /** Shown when the card is expanded. */
  detail: {
    paras: string[];
    example: CardExample;
  };
}

export const CARDS: CarouselCard[] = [
  {
    id: "cc1",
    eyebrow: "Coverage",
    head: "One feed, kept current.",
    body: `Every posting comes from the ${STATS.sourceName} public internship list — {roles} open roles across {companies} companies, refreshed on a schedule.`,
    art: "sources",
    detail: {
      paras: [
        `Postings come from exactly one place: the ${STATS.sourceName} public internship list, a community-maintained repository of open roles. InternTrack does not crawl company career pages looking for jobs.`,
        "A scheduled job re-reads that list every hour, writes any changes into the feed, and commits the result. Nothing is entered by hand, and the counts below are read from the current dataset rather than written into this page.",
        "One source rather than a dozen is a deliberate trade: narrower coverage, but no duplicate listings of the same role and no guessing about which copy is current.",
      ],
      example: {
        kind: "source",
        rows: [
          { label: "Source", value: `${STATS.sourceName} (public list)` },
          { label: "Open roles", value: "{roles}" },
          { label: "Companies", value: "{companies}" },
          { label: "Refresh", value: "Hourly, automated" },
          { label: "Last updated", value: "{updated}" },
        ],
      },
    },
  },
  {
    id: "cc2",
    eyebrow: "Ranking",
    head: "Scored against your résumé.",
    body: "Each posting is ranked by how closely its text matches yours, using TF-IDF and cosine similarity computed inside the product.",
    art: "score",
    detail: {
      paras: [
        "Your résumé and each posting are turned into weighted term vectors — single words and adjacent pairs, so \u201cmachine learning\u201d counts as one signal rather than two common words — and compared by cosine similarity.",
        "Terms common to every posting (\u201cintern\u201d, \u201cengineer\u201d) are down-weighted automatically; rare, distinctive ones (\u201ckubernetes\u201d, \u201cfpga\u201d) count for more. No skills list is maintained by hand.",
        "There is no embedding model and no third-party AI service in the scoring path, so nothing about your résumé leaves InternTrack to produce a number. The score is the share of a posting\u2019s named skills your résumé covers.",
      ],
      example: {
        kind: "score",
        score: 81,
        matched: ["Go", "Postgres", "Distributed systems", "REST APIs", "Python"],
        missing: ["Kafka", "Kubernetes"],
      },
    },
  },
  {
    id: "cc3",
    eyebrow: "Requirements",
    head: "The actual requirements.",
    body: "Open a role and InternTrack pulls that job's own requirements from the company's applicant tracking system, then shows which ones you already cover.",
    art: "gate",
    detail: {
      paras: [
        "The source list carries only a title, company, category and degree level. The real requirements live on the employer\u2019s own posting, so opening a role fetches that page and extracts its requirements section.",
        "Greenhouse, Workday, Ashby and Oracle all publish their boards openly, and several large employers render their postings as readable pages. Nothing private or login-gated is accessed.",
        "Not every employer publishes requirements in a readable form. When one doesn\u2019t, the role says so plainly and links out rather than showing an invented score.",
      ],
      example: {
        kind: "requirements",
        source: "Greenhouse",
        lines: [
          "Currently pursuing a BS/MS in Computer Science or related",
          "Experience with a general-purpose language: Go, Python, Java",
          "Familiarity with distributed systems and REST APIs",
          "Exposure to Kafka or comparable streaming systems",
        ],
        covered: ["Go", "Python", "Distributed systems", "REST APIs"],
      },
    },
  },
  {
    id: "cc4",
    eyebrow: "Eligibility",
    head: "Whether you clear the bar.",
    body: "Degree level and graduation year are read from your résumé and checked against each posting, so you can see what you're actually eligible for.",
    art: "quiet",
    detail: {
      paras: [
        "Two facts hard-gate an internship application: the degree level a posting will accept, and when you graduate. Both are read from your résumé, and either can be overridden on the Account page.",
        "There are two outcomes, not three. A posting is either shown, or ruled out with the specific reason — \u201cGraduation 2027 or later\u201d, \u201cMaster\u2019s required\u201d, \u201cPhD required\u201d.",
        "Anything ambiguous or unparseable counts as eligible and stays visible. Hiding a role you could actually have got is the expensive mistake; leaving a borderline one in costs you a few seconds of reading.",
      ],
      example: {
        kind: "verdicts",
        rows: [
          { label: "Bachelor's, graduating 2028", ok: true },
          { label: "Requirements not readable", ok: true, reason: "Kept — not enough information to rule out" },
          { label: "Research Intern", ok: false, reason: "PhD required" },
          { label: "Summer Analyst", ok: false, reason: "Graduation 2027 or later" },
        ],
      },
    },
  },
  {
    id: "cc5",
    eyebrow: "Gaps",
    head: "What keeps coming up.",
    body: "Across the roles you save, the skills those postings ask for that your résumé doesn't show yet — ranked by how often they appear.",
    art: "gaps",
    detail: {
      paras: [
        "Once you have saved a handful of roles, their requirements are pooled and compared against your résumé. One posting wanting Rust is noise; two thirds of them wanting it is a study plan.",
        "Only the roles in your own tracker are counted, so the ranking reflects the jobs you are actually pursuing rather than the whole feed.",
        "Skills already on your résumé drop out of the list entirely — what is left is the actionable half.",
      ],
      example: {
        kind: "gaps",
        rows: [
          { name: "Kubernetes", share: 57 },
          { name: "Rust", share: 52 },
          { name: "Kafka", share: 44 },
          { name: "Terraform", share: 38 },
        ],
      },
    },
  },
];

// --- how it works ----------------------------------------------------------

export const STEPS = [
  {
    id: "s1",
    n: "01",
    head: "Upload your résumé",
    body: "A PDF or plain-text file. Skills and experience are read straight out of it — there is no profile to fill in.",
  },
  {
    id: "s2",
    n: "02",
    head: "Every posting gets scored",
    body: "All {roles} roles in the feed are ranked against what your résumé actually shows, strongest first.",
  },
  {
    id: "s3",
    n: "03",
    head: "Open one and see why",
    body: "The role's own requirements, which of them you cover, and whether you clear its degree and graduation-year bar.",
  },
  {
    id: "s4",
    n: "04",
    head: "Save it and track it",
    body: "A saved role becomes a tracker row you move through Applied, Interview and Offer. Export the whole board to Excel at any time.",
  },
];

// --- pricing ---------------------------------------------------------------
//
// There is no billing code, no payment provider, and no plans table anywhere
// in the project. This section states only that.

export const PRICING = {
  head: "Free to use.",
  body: "InternTrack has no paid plans and no billing. Every feature described on this page is available to any account.",
  points: [
    "Unlimited saved roles and tracker rows",
    "Résumé matching and eligibility checks",
    "Excel export of your tracker",
  ],
};

// --- about -----------------------------------------------------------------

export const ABOUT = {
  head: "Built for one season at a time.",
  body: [
    "InternTrack started as a command-line tool that polled a public internship list on a schedule and printed whatever currently matched a set of filters. No notifications, no dashboard — just an honest answer to \"what is open right now\".",
    "The web app is that same idea with a résumé attached: one feed, scored against your own background, and a tracker so nothing gets lost between saving a role and hearing back about it.",
  ],
};

// --- FAQ -------------------------------------------------------------------
//
// Answers describe only what is implemented today. Where something is not
// supported, the answer says so plainly rather than implying a roadmap.

export interface FaqItem {
  id: string;
  q: string;
  a: string;
}

export const FAQ: FaqItem[] = [
  {
    id: "faq1",
    q: "What is InternTrack?",
    a: "InternTrack collects internship postings into one feed, ranks them against your résumé, and tracks each application from saved through to offer. It currently covers software, AI/ML and data, quant, hardware, and product roles — {roles} open positions across {companies} companies.",
  },
  {
    id: "faq2",
    q: "Where do the internship listings come from?",
    a: `Every posting comes from one place: the ${STATS.sourceName} public internship list, a community-maintained repository of open roles. InternTrack does not crawl company career pages to discover postings. When you open a specific role, it does fetch that job's published requirements from the company's applicant tracking system so it can show you what the posting actually asks for.`,
  },
  {
    id: "faq3",
    q: "How does the matching work?",
    a: "Your résumé and each posting are turned into weighted term vectors and compared by cosine similarity — the standard information-retrieval approach, computed inside the product in a fraction of a second. There is no embedding model and no third-party AI service in the scoring path. The honest limitation: the source listing carries only a title, company, category and degree level, so scores lean heavily on the requirements text fetched from the company's own posting.",
  },
  {
    id: "faq4",
    q: "Can I track an application I found somewhere else?",
    a: "Not today. The tracker is built from postings in the feed — saving a role is what creates its row — so there is currently no way to add an application from outside InternTrack by hand.",
  },
  {
    id: "faq5",
    q: "Is my résumé private?",
    a: "Yes. Your file is stored in your own account and every database row and stored file is protected by row-level security policies scoped to your user ID, so no other account can read them. Text extraction and matching happen inside InternTrack rather than at a third-party AI service. You can delete your résumé, and the stored file with it, from the Résumé page at any time.",
  },
  {
    id: "faq6",
    q: "What file types can I upload?",
    a: "PDF and plain text are read reliably. A .docx file will still upload and be stored, but its text cannot be extracted, so matching is skipped until you replace it with a PDF.",
  },
  {
    id: "faq7",
    q: "Is InternTrack free?",
    a: "Yes. There are no paid plans and no billing in the product. Everything described on this page is available to any account.",
  },
  {
    id: "faq8",
    q: "Can I use it for non-technical internships?",
    a: "Not currently. The underlying list covers technical internships — software, AI/ML and data, quant, hardware, and product — so roles outside those categories will not appear in the feed.",
  },
];

// --- footer ----------------------------------------------------------------

export const FOOTER_NOTE =
  "InternTrack is an independent project. Postings are aggregated from a public list and are not endorsements by, or affiliations with, the companies named.";

// --- captions --------------------------------------------------------------

export interface Caption {
  id: string;
  eyebrow: string;
  head: string;
  body?: string;
  place: "center" | "left" | "right" | "bottom";
}

export const CAPTIONS: Caption[] = [
  {
    id: "c1",
    eyebrow: "01 — Upload",
    head: "Start with the résumé you already have.",
    body: "One PDF. Skills, tools and experience are read straight from the document — no forms, no profile, nothing to self-report.",
    place: "right",
  },
  {
    id: "c2",
    eyebrow: "02 — Match",
    head: "Every posting, scored against it.",
    body: "{roles} open roles across {companies} companies, ranked by how well your background actually fits — then narrowed to the ones worth your time.",
    place: "left",
  },
  {
    id: "c3",
    eyebrow: "03 — Explain",
    head: "And it shows its work.",
    body: "Open a role to see the requirements from the company's own listing, which of them your résumé covers, and whether you clear the degree and graduation-year bar.",
    place: "left",
  },
  {
    id: "c4",
    eyebrow: "04 — Track",
    head: "Saved, applied, interviewing, offered.",
    body: "The role becomes a tracker row the moment you save it, and the board moves as you do.",
    place: "left",
  },
];
