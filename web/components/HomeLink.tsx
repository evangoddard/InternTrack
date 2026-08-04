import Link from "next/link";

// Most pages (Saved, Tracker, Résumé, auth) don't render the full Header --
// only the homepage does -- so without this there's no way back except the
// browser's back button. Fixed in a corner, present on every page.
export default function HomeLink() {
  return (
    <Link
      href="/"
      aria-label="Back to home"
      className="fixed left-4 top-4 z-50 rounded-full border border-border bg-bg-raised/90 px-3 py-1.5 text-xs font-semibold text-text-muted backdrop-blur transition-colors hover:border-accent-bright hover:text-text"
    >
      ← Home
    </Link>
  );
}
