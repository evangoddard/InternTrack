// Best-effort company logo lookup via DuckDuckGo's public favicon service
// (icons.duckduckgo.com) -- free, no API key, no rate limit, keyed off a
// guessed company domain. It 404s cleanly when it has nothing (handled by
// the caller's onError), rather than silently substituting its own generic
// placeholder image the way some alternatives do.
//
// Two services were tried and rejected before this one:
//   - logo.clearbit.com (Clearbit's old free logo API): shut down, the
//     domain no longer resolves at all.
//   - unavatar.io: works, but its free tier caps out at 25 requests --
//     with 137 postings needing a logo per page load, most requests started
//     silently getting its generic fallback image well before the row list
//     finished rendering.
//
// The domain guess itself is unreliable for multi-word names ("American
// Express" -> not americanexpress.com by naive slugify), so a handful of
// companies that show up often get an explicit domain override. Everything
// else falls back to `slug(name).com`.
const DOMAIN_OVERRIDES: Record<string, string> = {
  "american express": "americanexpress.com",
  "jp morgan": "jpmorganchase.com",
  "jpmorgan": "jpmorganchase.com",
  "jpmorgan chase": "jpmorganchase.com",
  "ge healthcare": "gehealthcare.com",
  "texas instruments": "ti.com",
  "analog devices": "analog.com",
  "jane street": "janestreet.com",
  "capital one": "capitalone.com",
  "bytedance": "bytedance.com",
};

function slugify(company: string): string {
  return company
    .toLowerCase()
    .replace(/\b(inc|llc|corp|corporation|ltd|co|company|group)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function companyLogoUrl(company: string): string | null {
  const name = company.trim().toLowerCase();
  if (!name) return null;
  const domain = DOMAIN_OVERRIDES[name] ?? `${slugify(company)}.com`;
  if (!domain || domain === ".com") return null;
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}
