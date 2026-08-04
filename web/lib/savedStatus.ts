export const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"] as const;
export type SavedStatus = (typeof STATUSES)[number];
