import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for doesn't exist on InternTrack.",
  robots: { index: false, follow: true },
};

/**
 * Custom 404.
 *
 * Offers a way onward rather than just a dead end: the marketing page for
 * anyone who arrived from outside, and the parts of the app most likely to be
 * what a signed-in visitor mistyped. Deliberately does not check the session —
 * a 404 should render instantly and identically for everyone, and the links
 * below resolve correctly either way (`/dashboard` bounces to `/` when signed
 * out, `/` bounces to `/dashboard` when signed in).
 */
export default function NotFound() {
  const links = [
    { href: "/dashboard", label: "Internship feed", note: "Every open role, ranked" },
    { href: "/tracker", label: "Application tracker", note: "What you've saved and applied to" },
    { href: "/resume", label: "Résumé", note: "Upload or replace your résumé" },
    { href: "/account", label: "Account", note: "Profile and preferences" },
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-24">
      <p className="font-num text-xs uppercase tracking-[0.18em] text-accent">
        Error 404
      </p>
      <h1 className="font-display mt-5 text-4xl font-semibold tracking-tight text-text sm:text-5xl">
        We couldn&apos;t find that page.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-text-muted">
        The link may be out of date, or the page may have moved. Nothing is
        wrong with your account.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-full bg-accent-fill px-5 py-2.5 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Back to InternTrack
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-bright"
        >
          Go to my feed
        </Link>
      </div>

      <nav aria-labelledby="nf-more" className="mt-14 border-t border-border pt-8">
        <h2
          id="nf-more"
          className="font-num text-[10px] uppercase tracking-[0.16em] text-text-faint"
        >
          Or try one of these
        </h2>
        <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="group block rounded-lg py-1 transition-colors"
              >
                <span className="text-sm font-medium text-text group-hover:text-accent-bright">
                  {l.label}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  {l.note}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
