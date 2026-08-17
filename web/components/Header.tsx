import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="px-4 pt-6 sm:px-6">
      {/* One slim row, everything to the right, so nothing competes with the
          wordmark below. Tracker is the only destination in the app besides
          the feed itself, so it gets a pill rather than sitting in a list of
          links -- /resume is still reachable by URL, just not advertised. */}
      <nav className="mx-auto flex max-w-5xl items-center justify-end gap-3 text-sm">
        {user ? (
          <>
            <Link
              href="/tracker"
              className="rounded-full border border-border px-4 py-1.5 font-semibold text-text-muted transition-colors hover:border-accent-bright hover:text-text"
            >
              Tracker
            </Link>
            <Link
              href="/account"
              className="text-text-muted transition-colors hover:text-text"
            >
              Account
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="px-1 text-text-faint transition-colors hover:text-text"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-text-muted transition-colors hover:text-text">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-accent-fill px-4 py-1.5 font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>

      {/* The Header only renders inside the app, so the wordmark goes to the
          dashboard rather than to `/`, which is the marketing page now. */}
      <Link
        href="/dashboard"
        className="font-display mx-auto mt-6 block w-fit text-5xl font-semibold text-text sm:text-6xl"
      >
        InternTrack
      </Link>
    </div>
  );
}
