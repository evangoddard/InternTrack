"use client";

import { unsavePosting } from "@/app/saved/actions";

// Removes a row from the tracker entirely (it's the same underlying record
// as a "saved" posting, so this unsaves it). Confirmed first -- it's a real
// delete, not a hide, and the freeform cells on the row (resume used,
// salary, notes) go with it. Re-saving from the feed starts a fresh row.
export default function RemoveRowButton({ id, company }: { id: string; company: string }) {
  return (
    <form
      action={unsavePosting}
      onSubmit={(e) => {
        if (!confirm(`Remove the ${company} row? Anything you typed into it will be lost.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Remove ${company}`}
        title="Remove from tracker"
        className="px-1 text-xs text-text-faint transition-colors hover:text-red-400"
      >
        ✕
      </button>
    </form>
  );
}
