// Formats an ISO date string ("2026-08-31") as "August 31st, 2026" for
// display. The underlying data/sort/highlight logic still works off the
// raw ISO strings in data.json — this is presentation-only.
export function formatDate(iso: string): string {
  if (!iso) return "";
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;

  const month = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month} ${ordinal(day)}, ${year}`;
}

function ordinal(day: number): string {
  if (day % 10 === 1 && day !== 11) return `${day}st`;
  if (day % 10 === 2 && day !== 12) return `${day}nd`;
  if (day % 10 === 3 && day !== 13) return `${day}rd`;
  return `${day}th`;
}
