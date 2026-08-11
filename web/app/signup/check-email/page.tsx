import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Confirm your email",
  description: "One step left — confirm your email address to finish creating your InternTrack account.",
  robots: { index: false, follow: true },
};

/**
 * Post-signup success state.
 *
 * This is the only real "thank you" moment the architecture has. Supabase
 * projects require email confirmation before a password sign-in works, so
 * signUp() cannot log the user straight in — previously it redirected to
 * /login carrying a message in the query string, which read as an error banner
 * on a form rather than as success.
 *
 * A dedicated page is the right call here precisely because the flow pauses:
 * the user has to leave and go to their inbox, so they need a page that
 * explains why nothing else happened. There is deliberately no "resend"
 * button — no such action exists in app/auth/actions.ts, and a button that
 * silently did nothing would be worse than none.
 */
export default function CheckEmail() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-24">
      <span
        aria-hidden
        className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-wash text-accent"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
        Check your email
      </h1>
      <p className="mt-4 text-base leading-relaxed text-text-muted">
        Your account is created. We&apos;ve sent you a confirmation link — open
        it and you&apos;ll be able to sign in and start matching internships
        against your résumé.
      </p>
      <p className="mt-3 text-sm text-text-faint">
        Not in your inbox? Check the spam folder. The link can take a minute to
        arrive.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-full bg-accent-fill px-5 py-2.5 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Go to sign in
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-text transition-colors hover:border-accent-bright"
        >
          Back to InternTrack
        </Link>
      </div>

      <p className="mt-10 border-t border-border pt-6 text-xs text-text-faint">
        Once you&apos;re in: upload a résumé on the Résumé page, and every
        posting in the feed gets scored against it.
      </p>
    </main>
  );
}
