import "server-only";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-user rate limiting, backed by Postgres.
 *
 * WHY NOT IN-MEMORY: this app deploys to Vercel, where each request may hit
 * a different serverless instance and instances are recycled constantly. A
 * module-level Map would reset on every cold start and be counted
 * separately per instance, which is not a limit — it is a speed bump that
 * an attacker clears by opening more connections. Counters therefore live
 * in `public.rate_limits`, which every instance already shares.
 *
 * WHY THE IDENTITY IS NOT PASSED IN: the SQL function reads `auth.uid()`
 * from the caller's own JWT rather than taking a user id as an argument.
 * Nothing the client sends can name whose budget is spent, so a request
 * cannot exhaust someone else's quota — and cannot spend from an empty one
 * by claiming to be a different user. The table has RLS on, no policies,
 * and no grants: `rate_limit_hit` is the only path to it.
 */

export type LimitClass = "EXPENSIVE" | "WRITE" | "READ";

interface LimitSpec {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in seconds. */
  window: number;
  cls: LimitClass;
  /** Why this number and not another one. */
  why: string;
}

/**
 * Every limit in one table, each with its justification.
 *
 * The bands are: EXPENSIVE 5–20/min, WRITE 30/min, READ 60–120/min. Two
 * scopes sit above the nominal 5–10 EXPENSIVE band and say why below —
 * both are driven by deliberate user gestures rather than page loads, and
 * a limit tight enough to be theoretically ideal would break normal use.
 */
export const LIMITS = {
  eligibility: {
    limit: 5,
    window: 60,
    cls: "EXPENSIVE",
    why:
      "Worst case fans out to one outbound ATS request per posting (~200) " +
      "and is declared maxDuration 120. The single most expensive operation " +
      "in the app; 5/min is far above the ~1 per session real usage.",
  },
  skillGaps: {
    limit: 10,
    window: 60,
    cls: "EXPENSIVE",
    why:
      "Same fan-out shape as eligibility but bounded by saved postings " +
      "rather than the whole feed, so typically an order of magnitude " +
      "smaller. Also maxDuration 120.",
  },
  qualifications: {
    limit: 20,
    window: 60,
    cls: "EXPENSIVE",
    why:
      "Above the 5–10 band deliberately: this fires once per posting the " +
      "user expands, and browsing a feed means opening several rows a " +
      "minute. Each call is at most one outbound fetch plus HTML parsing, " +
      "so 20/min still hard-caps outbound fan-out at 20 upstream requests " +
      "per user per minute.",
  },
  resumeUpload: {
    limit: 5,
    window: 60,
    cls: "EXPENSIVE",
    why:
      "Document parsing: a PDF is read into memory and text-extracted, " +
      "which is CPU-bound and attacker-controlled in size. Uploading a " +
      "résumé more than 5 times a minute is not a real workflow.",
  },
  export: {
    limit: 10,
    window: 60,
    cls: "READ",
    why:
      "Reads are cheap but each builds a file in memory (xlsx via ExcelJS, " +
      "or the full JSON account dump). Below the normal READ band because " +
      "the cost is allocation, not query time.",
  },
  write: {
    limit: 30,
    window: 60,
    cls: "WRITE",
    why:
      "Save/unsave/dismiss/status changes. 30/min accommodates the bulk " +
      "save-all button and rapid triage without allowing a write flood.",
  },
  read: {
    limit: 120,
    window: 60,
    cls: "READ",
    why: "Ordinary inexpensive reads: a single indexed query, no outbound calls.",
  },
} as const satisfies Record<string, LimitSpec>;

export type Scope = keyof typeof LIMITS;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. Suitable for Retry-After. */
  retryAfter: number;
  /** True when the limiter itself could not be consulted. */
  degraded: boolean;
}

const ALLOW: RateLimitResult = {
  allowed: true,
  remaining: -1,
  retryAfter: 0,
  degraded: true,
};

/**
 * Charge one request against the caller's budget for `scope`.
 *
 * FAIL-OPEN is deliberate. If Postgres is unreachable the limiter cannot
 * answer, and failing closed would convert a database blip into a total
 * outage of every protected route. The tradeoff is that a database outage
 * also suspends rate limiting; `degraded` is set so the caller can log it.
 * Authentication is NOT part of this tradeoff — routes check the session
 * themselves and reject before ever calling here.
 */
export async function checkRateLimit(scope: Scope): Promise<RateLimitResult> {
  const spec = LIMITS[scope];
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_scope: scope,
      p_limit: spec.limit,
      p_window_seconds: spec.window,
    });

    if (error) {
      console.error(`rate limit check failed for ${scope}:`, error.message);
      return ALLOW;
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return ALLOW;

    const resetAt = new Date(row.reset_at).getTime();
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
      degraded: false,
    };
  } catch (e) {
    console.error(`rate limit check threw for ${scope}:`, e);
    return ALLOW;
  }
}

/** The 429 a limited route returns. */
export function tooManyRequests(scope: Scope, result: RateLimitResult) {
  const spec = LIMITS[scope];
  return NextResponse.json(
    {
      error: "Too many requests.",
      detail: `This endpoint allows ${spec.limit} requests per ${spec.window} seconds.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfter),
        "X-RateLimit-Limit": String(spec.limit),
        "X-RateLimit-Remaining": "0",
        "Cache-Control": "no-store",
      },
    }
  );
}

/**
 * Guard for Server Actions, which cannot return an HTTP status.
 *
 * Returns true when the caller is over budget and the action should stop.
 * The action skips its write and skips revalidation, so the page keeps
 * showing the last good state rather than reporting a change that did not
 * happen.
 */
export async function overLimit(scope: Scope = "write"): Promise<boolean> {
  const result = await checkRateLimit(scope);
  if (!result.allowed) {
    console.warn(
      `rate limit exceeded: ${scope} (${LIMITS[scope].limit}/${LIMITS[scope].window}s)`
    );
    return true;
  }
  return false;
}

/**
 * Collapse concurrent identical requests into one.
 *
 * Per-instance and therefore best-effort — but the case it exists for is
 * per-instance anyway: a double-clicked button, a re-mounting component, or
 * React strict mode firing the same fetch twice. Without this, two clicks
 * on "Eligible only" start two ~200-request ATS fan-outs. Callers that miss
 * the window are still bounded by the rate limit above.
 */
const inFlight = new Map<string, Promise<unknown>>();

export function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const p = run().finally(() => inFlight.delete(key));
  inFlight.set(key, p);
  return p;
}
