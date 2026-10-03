import Link from "next/link";

export interface Crumb {
  label: string;
  /** Omitted on the final crumb — the current page is not a link. */
  href?: string;
}

/**
 * Breadcrumb trail for authenticated pages that sit below the dashboard.
 *
 * Deliberately not used on the marketing page or on /dashboard itself: a
 * single-level trail ("Dashboard") tells the user nothing they cannot already
 * see, and adding one everywhere is how breadcrumbs become furniture.
 *
 * Marked up as a nav landmark with an ordered list, the current page carrying
 * aria-current, and separators hidden from assistive tech.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.label} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="transition-colors hover:text-accent-bright"
                >
                  {c.label}
                </Link>
              ) : (
                <span
                  className={last ? "text-text" : undefined}
                  aria-current={last ? "page" : undefined}
                >
                  {c.label}
                </span>
              )}
              {last ? null : (
                <span aria-hidden className="text-text-faint">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
