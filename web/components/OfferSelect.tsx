"use client";

import { useTransition } from "react";
import { updateTrackerField } from "@/app/saved/actions";

const OFFER_OPTIONS = ["waiting", "yes", "no"] as const;
const LABELS: Record<string, string> = { waiting: "Waiting", yes: "Yes", no: "No" };

export default function OfferSelect({ id, value }: { id: string; value: string }) {
  const [, startTransition] = useTransition();
  // Rows saved before this field existed (or before a pending migration
  // runs) have '' rather than 'waiting' -- treat that the same as "waiting"
  // so the select always has a valid option selected.
  const current = value in LABELS ? value : "waiting";

  return (
    <select
      defaultValue={current}
      onChange={(e) => {
        startTransition(() => {
          updateTrackerField(id, "offer", e.target.value);
        });
      }}
      className="rounded-lg border border-border bg-bg/60 px-2 py-1 text-xs text-text outline-none focus:border-accent-bright"
    >
      {OFFER_OPTIONS.map((o) => (
        <option key={o} value={o} className="bg-bg-raised">
          {LABELS[o]}
        </option>
      ))}
    </select>
  );
}
