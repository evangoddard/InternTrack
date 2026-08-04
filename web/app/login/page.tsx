import Link from "next/link";
import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-2xl font-semibold text-text">Sign in</h1>
      <p className="mt-1 text-sm text-text-muted">
        Sign in to save postings and upload your résumé.
      </p>

      {params.message && (
        <p className="mt-4 rounded-lg border border-accent/50 bg-accent-wash px-3 py-2 text-sm text-accent-bright">
          {params.message}
        </p>
      )}
      {params.error && (
        <p className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {params.error}
        </p>
      )}

      <form action={signIn} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-accent-bright"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-accent-bright"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-text shadow-[0_4px_20px_rgba(59,130,246,0.4)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        No account?{" "}
        <Link href="/signup" className="text-accent-bright hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
