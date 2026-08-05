// -----------------------------------------------------------------------
// Per-posting qualifications fetcher.
//
// SimplifyJobs (our only posting source) carries no description or
// requirements text at all -- just a title, company, category and degree
// level. But the posting's own `url` points at whichever applicant tracking
// system the company actually uses, and most of those expose the real text
// publicly: either a documented JSON API or plain server-rendered HTML.
// This module maps a posting URL onto the right strategy and pulls the
// text back out. No API keys, no browser automation, no scraping of
// anything that isn't already public on the job's own page.
//
// Coverage measured against a live 137-posting feed:
//   TikTok      34%   HTML (React server payload)
//   Greenhouse  20%   public board API (incl. company sites via ?gh_jid=)
//   Workday     15%   public /wday/cxs JSON API
//   Oracle       7%   public hcmRestApi REST API
//   Ashby        6%   public posting-api board
//   ------------------
//   ~81% total; everything else returns null and the UI says so plainly
//   rather than inventing text.
// -----------------------------------------------------------------------

const TIMEOUT_MS = 12_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export interface Qualifications {
  /** The requirements section on its own, when one could be isolated. */
  qualifications: string | null;
  /** Full posting text, always present when the fetch succeeded. */
  full: string;
  /** Which integration produced this -- shown in the UI as provenance. */
  source: string;
}

async function get(url: string, accept = "text/html,application/json"): Promise<Response | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? res : null;
  } catch {
    return null;
  }
}

// --- text helpers ------------------------------------------------------

/** Decode the HTML entities that show up in posting text. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&[a-z]+;/gi, " ");
}

function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&[a-z]+;/gi, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

// Headings that introduce the requirements section, in rough order of how
// specific they are -- "Minimum Qualifications" beats a bare "Qualifications"
// when a posting has both.
const QUAL_HEADINGS = [
  "minimum qualifications",
  "basic qualifications",
  "required qualifications",
  "minimum requirements",
  "basic requirements",
  "qualifications",
  "requirements",
  "what you'll need",
  "what we're looking for",
  "who you are",
  "we're looking for",
];

// Headings that mean the requirements section has ended.
const END_HEADINGS = [
  "about the team",
  "about us",
  "about the company",
  "benefits",
  "compensation",
  "pay transparency",
  "equal opportunity",
  "eeo",
  "our commitment",
  "why join",
  "perks",
];

/** Pull just the requirements out of a full posting body, if findable. */
export function extractQualifications(text: string): string | null {
  const lower = text.toLowerCase();

  let start = -1;
  for (const heading of QUAL_HEADINGS) {
    const i = lower.indexOf(heading);
    if (i !== -1) {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  let end = text.length;
  for (const heading of END_HEADINGS) {
    const i = lower.indexOf(heading, start + 40);
    if (i !== -1 && i < end) end = i;
  }

  const section = text.slice(start, end).trim();
  // Too short to be a real section -- probably matched a passing mention.
  return section.length < 60 ? null : section;
}

function finish(full: string, source: string): Qualifications | null {
  const cleaned = full.trim();
  if (cleaned.length < 40) return null;
  return { qualifications: extractQualifications(cleaned), full: cleaned, source };
}

// --- per-host fetchers -------------------------------------------------

// Greenhouse: both the greenhouse.io-hosted boards and company-run pages
// that pass the job id through as ?gh_jid= (Jane Street et al.). For the
// latter the board token isn't in the URL, so it's guessed from the
// domain -- right often enough to be worth trying, and a miss just falls
// through to "unavailable".
async function greenhouse(u: URL): Promise<Qualifications | null> {
  let token: string | null = null;
  let jobId: string | null = null;

  const hosted = u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
  if (/greenhouse\.io$/.test(u.hostname) && hosted) {
    [, token, jobId] = hosted;
  } else if (u.searchParams.get("gh_jid")) {
    jobId = u.searchParams.get("gh_jid");
    const parts = u.hostname.replace(/^www\./, "").split(".");
    token = parts[0] === "boards" || parts[0] === "job-boards" ? parts[1] : parts[0];
  }
  if (!token || !jobId) return null;

  const res = await get(
    `https://boards-api.greenhouse.io/v1/boards/${token}/jobs/${jobId}?content=true`,
    "application/json"
  );
  if (!res) return null;

  const data = await res.json().catch(() => null);
  if (!data?.content) return null;
  // Greenhouse double-encodes its HTML entities.
  return finish(htmlToText(htmlToText(data.content)), "Greenhouse");
}

// Workday: every *.myworkdayjobs.com posting has a matching JSON endpoint
// under /wday/cxs/{tenant}/{site}/job/... -- same path, different prefix.
async function workday(u: URL): Promise<Qualifications | null> {
  const tenant = u.hostname.split(".")[0];
  const res = await get(`https://${u.hostname}/wday/cxs/${tenant}${u.pathname}`, "application/json");
  if (!res) return null;

  const data = await res.json().catch(() => null);
  const desc = data?.jobPostingInfo?.jobDescription;
  return desc ? finish(htmlToText(desc), "Workday") : null;
}

// Oracle Recruiting Cloud. Note the finder's quoting -- Id and siteNumber
// must both be quoted strings or the API 400s. This one is the nicest of
// the bunch: it returns requirements in their own field.
async function oracle(u: URL): Promise<Qualifications | null> {
  const m = u.pathname.match(/\/sites\/([^/]+)\/job\/(\d+)/);
  if (!m) return null;
  const [, site, jobId] = m;

  const finder = encodeURIComponent(`ById;Id="${jobId}",siteNumber="${site}"`);
  const res = await get(
    `https://${u.hostname}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails` +
      `?expand=all&onlyData=true&finder=${finder}`,
    "application/json"
  );
  if (!res) return null;

  const data = await res.json().catch(() => null);
  const item = data?.items?.[0];
  if (!item) return null;

  const quals = htmlToText(item.ExternalQualificationsStr || "");
  const desc = htmlToText(item.ExternalDescriptionStr || "");
  const full = [desc, quals].filter(Boolean).join("\n\n");
  if (full.trim().length < 40) return null;

  return {
    qualifications: quals.trim() || extractQualifications(full),
    full: full.trim(),
    source: "Oracle",
  };
}

// TikTok renders its postings server-side, embedding the text in a React
// server-component payload that is itself escaped as a JS string inside the
// HTML (quotes arrive as \", newlines as \\n), so it needs unescaping one
// layer first.
//
// Two payload shapes occur in the wild: the qualifications text is either
// inline in the node tree, or streamed as a separate chunk the node just
// references ("$33"). Rather than handle both tree shapes, this anchors on
// the "Minimum Qualifications:" heading text itself -- present either way --
// and reads forward to the next chunk marker or node boundary.
async function tiktok(u: URL): Promise<Qualifications | null> {
  const res = await get(u.toString());
  if (!res) return null;
  const html = await res.text();

  // Unescape the JS-string layer: protect literal backslash pairs, turn \"
  // into ", then restore. NUL is the sentinel because it cannot occur in
  // the source HTML.
  const NUL = "\u0000";
  const norm = html
    .replace(/\\\\/g, NUL)
    .replace(/\\"/g, '"')
    .replace(new RegExp(NUL, "g"), "\\");

  const start = norm.search(/Minimum Qualifications\s*:/i);
  if (start === -1) return null;

  // TikTok serves more than one payload shape (and more than one escaping
  // depth) for the same page, so rather than trust a structural boundary,
  // take a generous slice and then keep only the lines that still look like
  // prose. The first line carrying JSON/JS punctuation is where the posting
  // text ended and the page's own scaffolding resumed.
  const raw = norm
    .slice(start, start + 8000)
    .replace(/\\n/g, "\n")
    .replace(/\\u003c/gi, "<")
    .replace(/\\\//g, "/");

  // TikTok's payload shape varies between requests for the same page, so
  // this deliberately over-matches: anything carrying markup, escapes, or
  // JSON punctuation ends the prose. Cutting a posting slightly short is a
  // much better failure than leaking page scaffolding into the UI.
  const CODE_LIKE =
    /static\/chunks|\.js"|","|":"|\}\]|\[\{|\{"|self\.__next_f|<script|<\/?[a-z]+[\s>]|\\u00/;
  const lines: string[] = [];
  for (const line of raw.split("\n")) {
    const m = line.match(CODE_LIKE);
    if (m) {
      // The scaffolding usually starts partway through the final prose
      // line, so keep the prose in front of it rather than dropping the
      // whole line (which would silently lose the last bullet).
      const head = line.slice(0, m.index).trim();
      if (head) lines.push(head);
      break;
    }
    lines.push(line);
  }

  const text = decodeEntities(lines.join("\n"))
    .replace(/["'\\\s)\]}>,;]+$/, "") // stray punctuation from the cut point
    .trim()
    .slice(0, 5000); // backstop in case every terminator is missed

  if (text.length < 60) return null;
  return { qualifications: text, full: text, source: "TikTok" };
}

async function ashby(u: URL): Promise<Qualifications | null> {
  const m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i);
  if (!m) return null;
  const [, token, jobId] = m;

  const res = await get(
    `https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`,
    "application/json"
  );
  if (!res) return null;

  const data = await res.json().catch(() => null);
  const job = (data?.jobs || []).find((j: { id?: string }) => j.id === jobId);
  if (!job) return null;

  const text = job.descriptionPlain || htmlToText(job.descriptionHtml || "");
  return finish(text, "Ashby");
}

async function lever(u: URL): Promise<Qualifications | null> {
  const m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i);
  if (!m) return null;
  const [, token, postingId] = m;

  const res = await get(
    `https://api.lever.co/v0/postings/${token}/${postingId}?mode=json`,
    "application/json"
  );
  if (!res) return null;

  const data = await res.json().catch(() => null);
  if (!data) return null;

  const parts = [data.descriptionPlain || htmlToText(data.description || "")];
  for (const s of data.lists || []) {
    if (s.text) parts.push(s.text);
    if (s.content) parts.push(htmlToText(s.content));
  }
  return finish(parts.filter(Boolean).join("\n\n"), "Lever");
}

// --- dispatch ----------------------------------------------------------

export async function fetchQualifications(rawUrl: string): Promise<Qualifications | null> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const host = u.hostname;

  try {
    if (host.endsWith("myworkdayjobs.com")) return await workday(u);
    if (host.endsWith("oraclecloud.com")) return await oracle(u);
    if (host.endsWith("lifeattiktok.com")) return await tiktok(u);
    if (host.endsWith("ashbyhq.com")) return await ashby(u);
    if (host.endsWith("lever.co")) return await lever(u);
    // Greenhouse last: it also matches company-hosted pages via ?gh_jid=,
    // so anything with that param gets a shot regardless of domain.
    if (host.endsWith("greenhouse.io") || u.searchParams.get("gh_jid")) {
      return await greenhouse(u);
    }
  } catch {
    return null;
  }

  return null;
}
