import type { Metadata } from "next";
import Link from "next/link";
import { signUp } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free InternTrack account, upload a résumé, and see which internships you actually match.",
  alternates: { canonical: "/signup" },
};


export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-2xl font-semibold text-text">Create account</h1>
      <p className="mt-1 text-sm text-text-muted">
        Save postings and upload a résumé to track alongside them.
      </p>

      {params.error && (
        <p className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {params.error}
        </p>
      )}

      <form action={signUp} className="mt-6 flex flex-col gap-4">
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
            minLength={6}
            autoComplete="new-password"
            className="rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-accent-bright"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-accent-ink shadow-[0_4px_20px_rgba(255,107,74,0.35)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Sign up
        </button>
      </form>

      <p className="mt-6 text-sm text-text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-bright hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
