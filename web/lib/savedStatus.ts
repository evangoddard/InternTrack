// The application pipeline, in order. These exact strings are also the
// values allowed by saved_postings' status CHECK constraint in Postgres --
// changing this list means writing a migration to match (see
// supabase/migrations/0006_status_stages.sql), or every write will fail.
export const STATUSES = [
  "not_applied",
  "applied",
  "oa",
  "interview",
  "final_round",
  "offer",
  "rejected",
] as const;

export type SavedStatus = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<string, string> = {
  not_applied: "Not applied",
  applied: "Applied",
  oa: "OA",
  interview: "Interview",
  final_round: "Final round",
  offer: "Offer",
  rejected: "Rejected",
};

// Anything past this means the application was actually submitted -- used
// to decide when to stamp applied_at.
export const NOT_APPLIED: SavedStatus = "not_applied";

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
