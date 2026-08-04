"use client";

import type { ReactNode } from "react";
import EditableCell from "./EditableCell";
import OfferSelect from "./OfferSelect";
import { formatDate } from "@/lib/formatDate";

export interface TrackerRow {
  id: string;
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

export default function TrackerSheet({ rows }: { rows: TrackerRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[1100px] border-collapse text-left">
        <thead>
          {/* Excel-style column-letter ruler, purely decorative. */}
          <tr className="bg-bg-raised text-[0.65rem] text-text-faint">
            <th className="w-10 border-b border-r border-border px-2 py-1 text-center font-normal"> </th>
            {COLUMN_LETTERS.map((letter) => (
              <th key={letter} className="border-b border-r border-border px-2 py-1 text-center font-normal last:border-r-0">
                {letter}
              </th>
            ))}
          </tr>
          <tr className="bg-bg-raised text-xs font-semibold text-text">
            <th className="w-10 border-b border-r border-border px-2 py-1.5"> </th>
            {[
              "Company",
              "Role",
              "Resume Used",
              "Cover Letter",
              "Location",
              "Date Applied",
              "Status / Stage",
              "Salary",
              "Offer",
            ].map((label) => (
              <th key={label} className="border-b border-r border-border px-2 py-1.5 text-left font-semibold last:border-r-0">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className="group hover:bg-glass">
              <td className="w-10 border-b border-r border-border px-2 py-1.5 text-center text-[0.65rem] text-text-faint">
                {i + 1}
              </td>
              <td className="border-b border-r border-border p-0">
                <LockedCell>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent-bright hover:underline"
                  >
                    {row.company}
                  </a>
                </LockedCell>
              </td>
              <td className="border-b border-r border-border p-0">
                <LockedCell>{row.title}</LockedCell>
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
              <td className="border-b border-r border-border p-0">
                <LockedCell>{row.status.charAt(0).toUpperCase() + row.status.slice(1)}</LockedCell>
              </td>
              <td className="border-b border-r border-border p-0">
                <EditableCell id={row.id} field="salary" value={row.salary} placeholder="—" />
              </td>
              <td className="border-b border-border px-2 py-1">
                <OfferSelect id={row.id} value={row.offer} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
