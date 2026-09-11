"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CompanyLogo from "./CompanyLogo";
import OfferSelect from "./OfferSelect";
import RemoveRowButton from "./RemoveRowButton";
import StatusSelect from "./StatusSelect";
import { formatDate } from "@/lib/formatDate";
import { STATUSES, statusLabel, type SavedStatus } from "@/lib/savedStatus";

export interface TrackerRow {
  id: string;
  posting_id: string;
  company: string;
  title: string;
  url: string;
  location: string;
  season: string;
  status: SavedStatus;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
  offer: string;
}

/** Stages where the ball is in the company's court. */
const AWAITING = new Set<SavedStatus>(["applied", "oa", "interview", "final_round"]);
const NUDGE_AFTER_DAYS = 14;

type SortKey = "recent" | "oldest" | "company" | "stage";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently updated" },
  { key: "oldest", label: "Oldest first" },
  { key: "company", label: "Company A–Z" },
  { key: "stage", label: "Stage" },
];

const STAGE_ORDER: Record<SavedStatus, number> = {
  not_applied: 0,
  applied: 1,
  oa: 2,
  interview: 3,
  final_round: 4,
  offer: 5,
  rejected: 6,
};

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}

/**
 * The application tracker.
 *
 * Replaces the spreadsheet-styled sheet. Three fields are deliberately gone
 * from the UI — résumé used, cover letter, salary. Their columns were added by
 * migration 0004, which has never been applied to this project, so every edit
 * to them failed silently against the database. The columns still exist in the
 * schema file and any stored data is untouched; they are simply not shown.
 *
 * What is left is what actually drives an application: who, what, where, when,
 * and what happens next. Stage is the organising idea, so it gets the tabs, the
 * colour, and the left border — everything else is typography and space rather
 * than another box.
 */
export default function TrackerBoard({
  rows,
  listedIds,
}: {
  rows: TrackerRow[];
  listedIds: Set<string>;
}) {
  const [stage, setStage] = useState<SavedStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUSES.forEach((s) => (c[s] = 0));
    rows.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (stage !== "all" && r.status !== stage) return false;
      if (!q) return true;
      return (
        r.company.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
      );
    });

    const by: Record<SortKey, (a: TrackerRow, b: TrackerRow) => number> = {
      recent: (a, b) => (a.updated_at < b.updated_at ? 1 : -1),
      oldest: (a, b) => (a.created_at > b.created_at ? 1 : -1),
      company: (a, b) => a.company.localeCompare(b.company),
      stage: (a, b) => STAGE_ORDER[a.status] - STAGE_ORDER[b.status],
    };
    return [...out].sort(by[sort]);
  }, [rows, stage, search, sort]);

  const filtersActive = stage !== "all" || Boolean(search) || sort !== "recent";

  const clear = () => {
    setStage("all");
    setSearch("");
    setSort("recent");
  };

  if (rows.length === 0) {
    return (
      <div className="tb-empty">
        <p className="tb-empty-head">Nothing tracked yet.</p>
        <p className="tb-empty-body">
          Save a role from the{" "}
          <Link href="/dashboard" className="tb-link">
            feed
          </Link>{" "}
          and it becomes a row here — with its stage, dates, and the posting it
          came from.
        </p>
      </div>
    );
  }

  return (
    <div className="tb">
      <div className="tb-tabs" role="tablist" aria-label="Application stage">
        {(["all", ...STATUSES] as const).map((key) => {
          const on = stage === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={on}
              className={`tb-tab${on ? " is-on" : ""}`}
              data-stage={key}
              onClick={() => setStage(key as SavedStatus | "all")}
            >
              {key === "all" ? "All" : statusLabel(key)}
              <span className="tb-tab-n">{counts[key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="tb-toolbar">
        <div className="tb-search">
          <label className="tb-sr" htmlFor="tb-q">
            Search applications
          </label>
          <input
            id="tb-q"
            type="search"
            value={search}
            placeholder="Search company, role, location…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="tb-sort">
          <span className="tb-sr">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {filtersActive ? (
          <button type="button" className="tb-clear" onClick={clear}>
            Clear
          </button>
        ) : null}

        <span className="tb-showing">
          {visible.length}
          <span> of {rows.length}</span>
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="tb-empty">
          <p className="tb-empty-head">
            {stage === "all"
              ? "No applications match these filters."
              : `No applications in ${statusLabel(stage)}.`}
          </p>
          <button type="button" className="tb-btn" onClick={clear}>
            Show all applications
          </button>
        </div>
      ) : (
        <ul className="tb-rows">
          {visible.map((row) => {
            const quiet = daysSince(row.applied_at);
            const needsNudge =
              quiet !== null && quiet >= NUDGE_AFTER_DAYS && AWAITING.has(row.status);
            const closed = !listedIds.has(row.posting_id);
            return (
              <li
                key={row.id}
                className={`tb-row${selected === row.id ? " is-selected" : ""}`}
                data-stage={row.status}
                onFocusCapture={() => setSelected(row.id)}
                onClick={() => setSelected(row.id)}
              >
                <div className="tb-main">
                  <CompanyLogo company={row.company} />
                  <div className="tb-idm">
                    <span className="tb-company">{row.company}</span>
                    <a
                      className="tb-role"
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={row.title}
                    >
                      {row.title}
                    </a>
                  </div>
                </div>

                <div className="tb-meta">
                  <span className="tb-loc">{row.location || "—"}</span>
                  <span className="tb-date">
                    {row.applied_at
                      ? `Applied ${formatDate(row.applied_at.slice(0, 10))}`
                      : `Saved ${formatDate(row.created_at.slice(0, 10))}`}
                  </span>
                </div>

                <div className="tb-flags">
                  {needsNudge ? (
                    <span className="tb-flag is-quiet">{quiet}d quiet</span>
                  ) : null}
                  {closed ? (
                    <span className="tb-flag is-closed" title="No longer in the current feed">
                      Delisted
                    </span>
                  ) : null}
                </div>

                <div className="tb-actions">
                  {row.status === "offer" ? <OfferSelect id={row.id} value={row.offer} /> : null}
                  <StatusSelect id={row.id} status={row.status} />
                  <RemoveRowButton id={row.id} company={row.company} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
