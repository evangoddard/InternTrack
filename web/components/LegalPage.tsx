import Link from "next/link";

/**
 * Shell for the plain-text legal pages, so Privacy and Terms stay visually
 * consistent with each other and with the rest of the product without either
 * of them owning layout.
 */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** ISO date; rendered fixed rather than "x days ago" so it stays stable. */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-20 sm:py-28">
      <Link
        href="/"
        className="font-num text-[10px] uppercase tracking-[0.16em] text-text-muted transition-colors hover:text-accent-bright"
      >
        ← InternTrack
      </Link>

      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        {title}
      </h1>
      <p className="font-num mt-3 text-xs text-text-faint">
        Last updated {updated}
      </p>

      <div className="legal-prose mt-10">{children}</div>

      <nav className="mt-16 flex gap-5 border-t border-border pt-6" aria-label="Legal">
        <Link href="/privacy" className="text-sm text-text-muted hover:text-text">
          Privacy
        </Link>
        <Link href="/terms" className="text-sm text-text-muted hover:text-text">
          Terms
        </Link>
        <Link href="/" className="text-sm text-text-muted hover:text-text">
          Home
        </Link>
      </nav>
    </main>
  );
}
