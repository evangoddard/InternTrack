"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Posting } from "@/lib/types";
import { CATEGORIES, categoryOf, type Category } from "@/lib/categories";
import { STATUSES, statusLabel, type SavedStatus } from "@/lib/savedStatus";
import {
  savePosting,
  unsaveByPostingId,
  dismissPosting,
  updateStatus,
} from "@/app/saved/actions";
import CompanyLogo from "@/components/CompanyLogo";
import { formatDate } from "@/lib/formatDate";

/** formatDate expects a date-only ISO string; applied_at/uploaded_at are
 *  timestamptz, so they get trimmed to the date part first. */
const day = (iso: string | null | undefined) =>
  iso ? formatDate(iso.slice(0, 10)) : "";

export interface SavedRow {
  id: string;
  posting_id: string;
  status: SavedStatus;
  company: string;
  title: string;
  url: string;
  location: string;
  season: string;
  applied_at: string | null;
  updated_at: string;
}

export interface Profile {
  email: string;
  fullName: string;
  degreeLevel: string;
  gradYear: number | null;
  interests: string[];
  resumeName: string | null;
  resumeReadable: boolean;
  resumeUploadedAt: string | null;
}

/** Shape returned by /api/qualifications. */
interface MatchInfo {
  score: number;
  matched: string[];
  missing: string[];
  total: number;
}
/** Exactly what lib/eligibility.ts returns — two states, not three. */
interface Verdict {
  eligible: boolean;
  reason?: string;
}

interface QualState {
  status: "idle" | "loading" | "ready" | "error";
  available?: boolean;
  qualifications?: string | null;
  full?: string;
  source?: string;
  match?: MatchInfo | null;
  error?: string;
}

/** Stages shown in the pipeline rail, in pipeline order. `rejected` is
 *  deliberately last and visually muted rather than hidden — it is real. */
const PIPELINE: SavedStatus[] = [
  "not_applied",
  "applied",
  "oa",
  "interview",
  "final_round",
  "offer",
  "rejected",
];

export default function WorkspaceShell({
  postings,
  saved,
  hiddenCount,
  profile,
}: {
  postings: Posting[];
  saved: SavedRow[];
  hiddenCount: number;
  profile: Profile;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string | null>(
    postings[0]?.id ?? null
  );
  const [search, setSearch] = useState("");
  const [cats, setCats] = useState<Set<Category>>(new Set());
  const [stageFilter, setStageFilter] = useState<SavedStatus | "all" | "saved">("all");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false); // tablet/mobile drawer
  const [railOpen, setRailOpen] = useState(false); // mobile nav

  // Qualifications are fetched per posting and cached for the session, so
  // moving back to a role you already opened is instant.
  const [quals, setQuals] = useState<Record<string, QualState>>({});

  // Eligibility verdicts for the whole feed, fetched once and kept for the
  // session. /api/eligibility computes every posting in a single pass (it has
  // to read the résumé and the cached requirements anyway), so there is
  // nothing to gain from asking per posting — and re-asking on each toggle
  // would make the filter feel slow for no reason.
  const [verdicts, setVerdicts] = useState<Record<string, Verdict> | null>(null);
  const [eligLoading, setEligLoading] = useState(false);
  const [eligError, setEligError] = useState<string | null>(null);
  const eligRequested = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const inflight = useRef<Set<string>>(new Set());

  const savedByPosting = useMemo(() => {
    const m = new Map<string, SavedRow>();
    saved.forEach((r) => m.set(r.posting_id, r));
    return m;
  }, [saved]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return postings.filter((p) => {
      if (cats.size) {
        const c = categoryOf(p);
        // An uncategorised posting is excluded whenever a category filter is
        // on, which matches how the existing feed behaves.
        if (!c || !cats.has(c)) return false;
      }
      // Only filters once the verdicts are in. Until then the list is
      // unchanged rather than briefly empty.
      if (eligibleOnly && verdicts && verdicts[p.id]?.eligible === false) {
        return false;
      }
      if (stageFilter === "saved" && !savedByPosting.has(p.id)) return false;
      if (stageFilter !== "all" && stageFilter !== "saved") {
        const row = savedByPosting.get(p.id);
        if (!row || row.status !== stageFilter) return false;
      }
      if (!q) return true;
      return (
        p.company.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    });
  }, [postings, search, cats, stageFilter, savedByPosting, eligibleOnly, verdicts]);

  // Selection is derived, not corrected after the fact: if the current pick
  // has been filtered out, the first visible row *is* the selection. Doing
  // this in a effect instead would render one frame of a stale selection and
  // then cascade a second render to fix it.
  const selected = useMemo(() => {
    const picked = filtered.find((p) => p.id === selectedId);
    return picked ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  // Load requirements + match for whatever is selected.
  //
  // In-flight ids live in a ref rather than in state: marking one as loading
  // is bookkeeping, not something the UI renders differently per id, and
  // writing it to state here would be a synchronous setState inside an effect.
  // "Loading" is derived below as simply "selected, but no entry yet".
  useEffect(() => {
    if (!selected) return;
    if (quals[selected.id] || inflight.current.has(selected.id)) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = selected.id;
    inflight.current.add(id);

    fetch(`/api/qualifications?url=${encodeURIComponent(selected.url)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        inflight.current.delete(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Couldn't load this posting.");
        setQuals((s) => ({
          ...s,
          [selected.id]: {
            status: "ready",
            available: data.available,
            qualifications: data.qualifications ?? null,
            full: data.full,
            source: data.source,
            match: data.match ?? null,
          },
        }));
      })
      .catch((err: unknown) => {
        inflight.current.delete(id);
        if (err instanceof DOMException && err.name === "AbortError") return;
        setQuals((s) => ({
          ...s,
          [selected.id]: {
            status: "error",
            error: err instanceof Error ? err.message : "Couldn't load this posting.",
          },
        }));
      });
  }, [selected, quals]);

  const loadEligibility = () => {
    if (eligRequested.current) return;
    eligRequested.current = true;
    setEligLoading(true);
    setEligError(null);
    fetch("/api/eligibility")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Couldn't check eligibility.");
        setVerdicts(data.verdicts as Record<string, Verdict>);
      })
      .catch((err: unknown) => {
        // Let it be retried rather than latching the failure forever.
        eligRequested.current = false;
        setEligError(err instanceof Error ? err.message : "Couldn't check eligibility.");
      })
      .finally(() => setEligLoading(false));
  };

  const toggleEligible = () => {
    const next = !eligibleOnly;
    setEligibleOnly(next);
    if (next) loadEligibility();
  };

  // --- writes: all through the existing server actions -------------------
  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const doSave = (p: Posting) => {
    const fd = new FormData();
    fd.set("posting_id", p.id);
    fd.set("company", p.company);
    fd.set("title", p.title);
    fd.set("url", p.url);
    fd.set("location", p.location);
    fd.set("season", p.season);
    fd.set("returnTo", "/workspace");
    run(() => savePosting(fd));
  };

  const doUnsave = (p: Posting) => {
    const fd = new FormData();
    fd.set("posting_id", p.id);
    run(() => unsaveByPostingId(fd));
  };

  const doDismiss = (p: Posting) => {
    const fd = new FormData();
    fd.set("posting_id", p.id);
    run(() => dismissPosting(fd));
  };

  const doStatus = (row: SavedRow, status: SavedStatus) => {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("status", status);
    run(() => updateStatus(fd));
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    PIPELINE.forEach((s) => (c[s] = 0));
    saved.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [saved]);

  const eligibleCount = useMemo(
    () =>
      verdicts
        ? postings.filter((p) => verdicts[p.id]?.eligible !== false).length
        : null,
    [postings, verdicts]
  );

  const filtersActive =
    Boolean(search) || cats.size > 0 || stageFilter !== "all" || eligibleOnly;

  const clearFilters = () => {
    setCats(new Set());
    setStageFilter("all");
    setSearch("");
    setEligibleOnly(false);
  };

  const deadlines = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return saved
      .map((r) => ({ row: r, posting: postings.find((p) => p.id === r.posting_id) }))
      .filter((x) => x.posting?.deadline && x.posting.deadline >= today)
      .sort((a, b) => (a.posting!.deadline < b.posting!.deadline ? -1 : 1))
      .slice(0, 4);
  }, [saved, postings]);

  const selectedRow = selected ? savedByPosting.get(selected.id) : undefined;
  const qual = selected ? quals[selected.id] : undefined;
  const qualLoading = Boolean(selected) && !qual;

  const pick = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true); // no-op on desktop; opens the drawer on small screens
  };

  return (
    <div className={`ws${pending ? " is-busy" : ""}`}>
      {/* ---- top bar --------------------------------------------------- */}
      <header className="ws-top">
        <button
          type="button"
          className="ws-icon-btn ws-only-mobile"
          aria-expanded={railOpen}
          aria-controls="ws-rail"
          onClick={() => setRailOpen((v) => !v)}
        >
          <span className="ws-sr">Menu</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </svg>
        </button>

        <Link href="/dashboard" className="ws-brand">
          <span className="ws-brand-mark" aria-hidden />
          InternTrack
        </Link>

        <div className="ws-search">
          <label className="ws-sr" htmlFor="ws-q">
            Search company or role
          </label>
          <input
            id="ws-q"
            type="search"
            value={search}
            placeholder="Search company or role…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <span className="ws-count">
          {filtered.length}
          <span className="ws-count-label"> of {postings.length}</span>
        </span>

        <Link href="/account" className="ws-top-link">
          Account
        </Link>
      </header>

      {/* ---- left rail -------------------------------------------------- */}
      <aside
        className={`ws-rail${railOpen ? " is-open" : ""}`}
        id="ws-rail"
        aria-label="Workspace navigation"
      >
        <nav className="ws-nav" aria-label="Sections">
          <button
            type="button"
            className={stageFilter === "all" ? "is-active" : ""}
            onClick={() => setStageFilter("all")}
          >
            All roles <span>{postings.length}</span>
          </button>
          <button
            type="button"
            className={stageFilter === "saved" ? "is-active" : ""}
            onClick={() => setStageFilter("saved")}
          >
            Saved <span>{saved.length}</span>
          </button>
          <Link href="/tracker">Tracker sheet</Link>
          <Link href="/resume">Résumé</Link>
          <Link href="/account">Preferences</Link>
        </nav>

        <section className="ws-card">
          <h2 className="ws-card-title">Résumé</h2>
          {profile.resumeName ? (
            <>
              <p className="ws-file">{profile.resumeName}</p>
              <p className={`ws-badge${profile.resumeReadable ? " is-ok" : " is-warn"}`}>
                {profile.resumeReadable
                  ? "Readable — matching is on"
                  : "Text couldn't be read — matching is off"}
              </p>
              {profile.resumeUploadedAt ? (
                <p className="ws-meta">
                  Uploaded {day(profile.resumeUploadedAt)}
                </p>
              ) : null}
            </>
          ) : (
            <p className="ws-meta">
              No résumé yet. Match scores need one.
            </p>
          )}
          <Link href="/resume" className="ws-btn ws-btn-quiet">
            {profile.resumeName ? "Replace" : "Upload résumé"}
          </Link>
        </section>

        <section className="ws-card">
          <h2 className="ws-card-title">Preferences</h2>
          <dl className="ws-defs">
            <div>
              <dt>Degree</dt>
              <dd>{profile.degreeLevel || "From résumé"}</dd>
            </div>
            <div>
              <dt>Graduating</dt>
              <dd>{profile.gradYear ?? "From résumé"}</dd>
            </div>
          </dl>
          {profile.interests.length ? (
            <ul className="ws-chips">
              {profile.interests.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          ) : (
            <p className="ws-meta">No categories chosen yet.</p>
          )}
        </section>

        {hiddenCount > 0 ? (
          <p className="ws-meta ws-hidden-note">{hiddenCount} posting(s) hidden</p>
        ) : null}
      </aside>

      {/* ---- centre feed ------------------------------------------------ */}
      <main className="ws-feed" aria-label="Internship feed">
        <div className="ws-filters">
          {CATEGORIES.map((c) => {
            const on = cats.has(c);
            return (
              <button
                key={c}
                type="button"
                className={`ws-chip-btn${on ? " is-on" : ""}`}
                aria-pressed={on}
                onClick={() =>
                  setCats((prev) => {
                    const next = new Set(prev);
                    if (next.has(c)) next.delete(c);
                    else next.add(c);
                    return next;
                  })
                }
              >
                {c}
              </button>
            );
          })}

          {/* Deliberately not styled as another category chip: it is a
              different kind of filter and reads as a switch. */}
          <button
            type="button"
            role="switch"
            aria-checked={eligibleOnly}
            className={`ws-elig-btn${eligibleOnly ? " is-on" : ""}`}
            onClick={toggleEligible}
            title="Only roles you meet the degree and graduation-year requirements for"
          >
            <span className="ws-elig-track" aria-hidden>
              <span className="ws-elig-knob" />
            </span>
            Eligible only
            {eligLoading ? <span className="ws-elig-note">checking…</span> : null}
            {!eligLoading && eligibleOnly && eligibleCount !== null ? (
              <span className="ws-elig-note">{eligibleCount}</span>
            ) : null}
          </button>

          {filtersActive ? (
            <button type="button" className="ws-chip-btn is-clear" onClick={clearFilters}>
              Clear
            </button>
          ) : null}
        </div>

        {eligError ? (
          <p className="ws-filter-error" role="status">
            {eligError}{" "}
            <button type="button" onClick={loadEligibility}>
              Try again
            </button>
          </p>
        ) : null}

        <ul className="ws-rows">
          {filtered.map((p) => {
            const row = savedByPosting.get(p.id);
            const isSel = p.id === selectedId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className={`ws-row${isSel ? " is-selected" : ""}`}
                  aria-current={isSel ? "true" : undefined}
                  onClick={() => pick(p.id)}
                >
                  <CompanyLogo company={p.company} />
                  <span className="ws-row-co">{p.company}</span>
                  <span className="ws-row-title">{p.title}</span>
                  <span className="ws-row-loc">{p.location}</span>
                  <span className="ws-row-date">{formatDate(p.date_posted)}</span>
                  {row ? (
                    <span className={`ws-stage ws-stage-${row.status}`}>
                      {statusLabel(row.status)}
                    </span>
                  ) : (
                    <span className="ws-stage is-none">—</span>
                  )}
                </button>
              </li>
            );
          })}
          {filtered.length === 0 ? (
            <li className="ws-empty">
              <p className="ws-empty-head">
                {eligibleOnly
                  ? "No eligible roles match these filters."
                  : "No roles match these filters."}
              </p>
              <p className="ws-empty-body">
                {eligibleOnly
                  ? "Eligibility is checked against the degree level and graduation year on your résumé. Widening the category or search usually helps."
                  : "Try a different category, or clear the search."}
              </p>
              <button type="button" className="ws-btn ws-btn-primary" onClick={clearFilters}>
                Clear all filters
              </button>
            </li>
          ) : null}
        </ul>
      </main>

      {/* ---- right detail ------------------------------------------------ */}
      <aside
        className={`ws-detail${detailOpen ? " is-open" : ""}`}
        aria-label="Role details"
      >
        <button
          type="button"
          className="ws-icon-btn ws-detail-close"
          onClick={() => setDetailOpen(false)}
        >
          <span className="ws-sr">Close details</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </svg>
        </button>

        {selected ? (
          <>
            <header className="ws-detail-head">
              <span className="ws-detail-co">{selected.company}</span>
              <h2 className="ws-detail-title">{selected.title}</h2>
              <p className="ws-detail-meta">
                {selected.locations?.join(" · ") || selected.location}
                {selected.season ? ` · ${selected.season}` : ""}
                {selected.date_posted ? ` · Posted ${formatDate(selected.date_posted)}` : ""}
              </p>
              {selected.deadline ? (
                <p className="ws-deadline">Deadline {formatDate(selected.deadline)}</p>
              ) : null}
            </header>

            {/* match — only ever shown when the API actually returned one */}
            {qualLoading ? (
              <p className="ws-meta">Reading the posting…</p>
            ) : null}

            {qual?.status === "ready" && qual.match ? (
              <section className="ws-match">
                <div className="ws-score">
                  <span className="ws-score-num">{qual.match.score}</span>
                  <span className="ws-score-label">
                    % of this posting&apos;s named skills are on your résumé
                  </span>
                </div>
                <p className="ws-meta">
                  {qual.match.matched.length} of {qual.match.total} skills matched
                </p>
                {qual.match.matched.length ? (
                  <div className="ws-skills">
                    <h3>On your résumé</h3>
                    <ul>
                      {qual.match.matched.map((s) => (
                        <li key={s} className="is-have">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {qual.match.missing.length ? (
                  <div className="ws-skills">
                    <h3>Not yet</h3>
                    <ul>
                      {qual.match.missing.slice(0, 12).map((s) => (
                        <li key={s} className="is-missing">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Three genuinely different reasons a score can be missing, and
                saying which one it is beats a single vague line. */}
            {qual?.status === "ready" && !qual.match ? (
              <p className="ws-meta">
                {!qual.available
                  ? "This company's site doesn't publish its requirements in a readable form — open the posting to read them."
                  : !profile.resumeReadable
                    ? "Upload a résumé we can read to see how you match this role."
                    : "This posting's requirements don't name skills we can match against."}
              </p>
            ) : null}

            {qual?.status === "error" ? (
              <p className="ws-meta ws-error">{qual.error}</p>
            ) : null}

            <div className="ws-actions">
              {selectedRow ? (
                <button
                  type="button"
                  className="ws-btn ws-btn-quiet"
                  onClick={() => doUnsave(selected)}
                >
                  Unsave
                </button>
              ) : (
                <button
                  type="button"
                  className="ws-btn ws-btn-primary"
                  onClick={() => doSave(selected)}
                >
                  Save
                </button>
              )}
              <a
                className="ws-btn"
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Apply ↗
              </a>
              {!selectedRow ? (
                <button
                  type="button"
                  className="ws-btn ws-btn-quiet"
                  onClick={() => doDismiss(selected)}
                >
                  Hide
                </button>
              ) : null}
            </div>

            {selectedRow ? (
              <div className="ws-status">
                <label htmlFor="ws-status-sel">Stage</label>
                <select
                  id="ws-status-sel"
                  value={selectedRow.status}
                  onChange={(e) => doStatus(selectedRow, e.target.value as SavedStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
                {selectedRow.applied_at ? (
                  <span className="ws-meta">
                    Applied {day(selectedRow.applied_at)}
                  </span>
                ) : null}
              </div>
            ) : null}

            {qual?.status === "ready" && qual.qualifications ? (
              <section className="ws-quals">
                <h3>Requirements</h3>
                <p className="ws-quals-src">from {qual.source}</p>
                <pre>{qual.qualifications}</pre>
              </section>
            ) : null}
          </>
        ) : (
          <p className="ws-meta">Select a role to see the details.</p>
        )}
      </aside>

      {/* ---- pipeline ---------------------------------------------------- */}
      <footer className="ws-pipe" aria-label="Application pipeline">
        <div className="ws-pipe-stages">
          {PIPELINE.map((s) => (
            <button
              key={s}
              type="button"
              className={`ws-pipe-stage${stageFilter === s ? " is-active" : ""}`}
              aria-pressed={stageFilter === s}
              onClick={() => setStageFilter(stageFilter === s ? "all" : s)}
            >
              <span className="ws-pipe-n">{counts[s] ?? 0}</span>
              <span className="ws-pipe-label">{statusLabel(s)}</span>
            </button>
          ))}
        </div>

        {deadlines.length ? (
          <div className="ws-pipe-deadlines">
            <h2>Upcoming deadlines</h2>
            <ul>
              {deadlines.map(({ row, posting }) => (
                <li key={row.id}>
                  <button type="button" onClick={() => pick(row.posting_id)}>
                    <b>{row.company}</b> {formatDate(posting!.deadline)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </footer>
    </div>
  );
}
