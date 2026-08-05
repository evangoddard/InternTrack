"use client";

import type { ReactNode } from "react";
import EditableCell from "./EditableCell";
import OfferSelect from "./OfferSelect";
import RemoveRowButton from "./RemoveRowButton";
import StatusSelect from "./StatusSelect";
import { formatDate } from "@/lib/formatDate";

export interface TrackerRow {
  id: string;
  posting_id: string;
  company: string;
  title: string;
  location: string;
  url: string;
  status: string;
  applied_at: string | null;
  resume_used: string;
  cover_letter: string;
  salary: string;
  offer: string;
}

/** Statuses that mean the ball is in the company's court. */
const AWAITING = new Set(["applied", "oa", "interview", "final_round"]);
const NUDGE_AFTER_DAYS = 14;

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return ms < 0 ? null : Math.floor(ms / 86_400_000);
}

const COLUMN_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I"];

// Locked (auto-synced from the real posting) columns are rendered as plain
// text on a faint background; the rest are real inputs a user types into
// directly, like cells in an actual spreadsheet -- see EditableCell.
function LockedCell({ children }: { children: ReactNode }) {
  return (
    <div className="truncate bg-bg-raised/40 px-2 py-1.5 text-xs text-text-muted" title={typeof children === "string" ? children : undefined}>
      {children}
    </div>
  );
}

export default function TrackerSheet({
  rows,
  listedIds,
}: {
  rows: TrackerRow[];
  /** posting ids present in the current feed -- anything else is stale. */
  listedIds: Set<string>;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[1200px] border-collapse text-left">
        <thead>
          {/* Excel-style column-letter ruler, purely decorative. */}
          <tr className="bg-bg-raised text-[0.65rem] text-text-faint">
            <th className="w-10 border-b border-r border-border px-2 py-1 text-center font-normal"> </th>
            {COLUMN_LETTERS.map((letter) => (
              <th key={letter} className="border-b border-r border-border px-2 py-1 text-center font-normal">
                {letter}
              </th>
            ))}
            {/* Trailing gutter for the remove button -- unlettered, like the
                row-number gutter, since it isn't one of the data columns. */}
            <th className="w-8 border-b border-border px-1 py-1"> </th>
          </tr>
          <tr className="bg-bg-raised text-xs font-semibold text-text">
            <th className="w-10 border-b border-r border-border px-2 py-1.5"> </th>
            {[
              { label: "Company" },
              { label: "Role" },
              { label: "Resume Used" },
              { label: "Cover Letter" },
              { label: "Location" },
              { label: "Date Applied" },
              // Wide enough that the longest stage ("Final round") isn't
              // clipped inside the select.
              { label: "Status / Stage", className: "min-w-[9.5rem]" },
              { label: "Salary" },
              { label: "Offer", className: "min-w-[6.5rem]" },
            ].map(({ label, className }) => (
              <th
                key={label}
                className={`border-b border-r border-border px-2 py-1.5 text-left font-semibold ${className ?? ""}`}
              >
                {label}
              </th>
            ))}
            <th className="w-8 border-b border-border px-1 py-1.5"> </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="group hover:bg-glass">
              <td className="w-10 border-b border-r border-border px-2 py-1.5 text-center text-[0.65rem] text-text-faint">
                {i + 1}
              </td>
              <td className="border-b border-r border-border p-0">
                <LockedCell>{row.company}</LockedCell>
              </td>
              {/* The role is the link out to the actual application page --
                  one click from the sheet to where you apply. */}
              <td className="border-b border-r border-border p-0">
                <div className="bg-bg-raised/40 px-2 py-1.5">
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-text hover:text-accent-bright hover:underline"
                    title={row.title}
                  >
                    {row.title}
                  </a>
                  <div className="flex flex-wrap gap-1.5">
                    {/* The posting is gone from the current feed. Deliberately
                        worded as "not listed" rather than "closed" -- we know
                        it left the feed, not why. The row is never deleted. */}
                    {!listedIds.has(row.posting_id) && (
                      <span
                        title="This posting is no longer in the current feed. It may have closed."
                        className="mt-1 inline-block rounded-full border border-border px-1.5 py-0.5 text-[0.6rem] text-text-faint"
                      >
                        No longer listed
                      </span>
                    )}
                    {(() => {
                      const d = daysSince(row.applied_at);
                      if (d === null || d < NUDGE_AFTER_DAYS || !AWAITING.has(row.status)) {
                        return null;
                      }
                      return (
                        <span
                          title="No status change since you applied. Worth a follow-up."
                          className="mt-1 inline-block rounded-full border border-accent/40 bg-accent-wash px-1.5 py-0.5 text-[0.6rem] text-accent-bright"
                        >
                          {d}d, no movement
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </td>
              <td className="border-b border-r border-border p-0">
                <EditableCell id={row.id} field="resume_used" value={row.resume_used} placeholder="—" />
              </td>
              <td className="border-b border-r border-border p-0">
                <EditableCell id={row.id} field="cover_letter" value={row.cover_letter} placeholder="—" />
              </td>
              <td className="border-b border-r border-border p-0">
                <LockedCell>{row.location || "—"}</LockedCell>
              </td>
              <td className="border-b border-r border-border p-0">
                <LockedCell>{row.applied_at ? formatDate(row.applied_at.slice(0, 10)) : "—"}</LockedCell>
              </td>
              <td className="min-w-[9.5rem] border-b border-r border-border px-2 py-1">
                <StatusSelect id={row.id} status={row.status} />
              </td>
              <td className="border-b border-r border-border p-0">
                <EditableCell id={row.id} field="salary" value={row.salary} placeholder="—" />
              </td>
              <td className="border-b border-r border-border px-2 py-1">
                <OfferSelect id={row.id} value={row.offer} />
              </td>
              <td className="w-8 border-b border-border px-1 py-1 text-center">
                <RemoveRowButton id={row.id} company={row.company} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
