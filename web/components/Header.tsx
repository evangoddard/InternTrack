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
      {/* Slim nav row -- links only, no wordmark here (that's the big
          heading below). Kept small and out of the way so it doesn't
          compete with the brand statement. */}
      <nav className="mx-auto flex max-w-3xl items-center justify-end gap-4 text-sm text-text-muted">
        {user ? (
          <>
            <Link href="/saved" className="transition-colors hover:text-text">
              Saved
            </Link>
            <Link href="/tracker" className="transition-colors hover:text-text">
              Tracker
            </Link>
            <Link href="/resume" className="transition-colors hover:text-text">
              Résumé
            </Link>
            <span className="hidden text-text-faint sm:inline">{user.email}</span>
            <form action={signOut}>
              <button type="submit" className="transition-colors hover:text-text">
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="transition-colors hover:text-text">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-accent-fill px-4 py-1.5 font-semibold text-text transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>

      <Link
        href="/"
        className="font-display mx-auto mt-6 block w-fit text-5xl font-semibold text-text sm:text-6xl"
      >
        InternTrack
      </Link>
    </div>
  );
}
