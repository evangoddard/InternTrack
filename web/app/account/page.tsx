import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";
import { parseResumeProfile } from "@/lib/eligibility";
import {
  updateProfile,
  changePassword,
  signOutEverywhere,
  deleteMyData,
} from "./actions";

export const metadata: Metadata = {
  title: "Account",
  description: "Your profile, résumé, and account settings.",
  robots: { index: false, follow: false },
};

const DEGREE_OPTIONS = [
  { value: "associate", label: "Associate" },
  { value: "bachelor", label: "Bachelor's" },
  { value: "master", label: "Master's" },
  { value: "phd", label: "PhD" },
];

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 max-w-xl text-sm text-text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputClass =
  "w-full max-w-sm rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent-bright";
const labelClass = "block text-[0.65rem] uppercase tracking-[0.06em] text-text-faint";
const buttonClass =
  "rounded-full bg-accent-fill px-4 py-1.5 text-sm font-semibold text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.98]";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-start justify-center px-4">
        <h1 className="font-display text-2xl font-semibold text-text">Account</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to manage your account.</p>
        <Link
          href="/login"
          className="mt-4 rounded-full bg-accent-fill px-5 py-2 text-sm font-semibold text-accent-ink"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const meta = user.user_metadata ?? {};

  // What the résumé says, so the form can show what it would fall back to
  // when the override fields are left blank.
  const { data: resumes } = await supabase
    .from("resumes")
    .select("file_name, parsed_text")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  const resume = resumes?.[0];
  const detected = resume?.parsed_text?.trim()
    ? parseResumeProfile(resume.parsed_text)
    : null;

  const interests: string[] = Array.isArray(meta.interests) ? meta.interests : [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-raised px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-text">Appearance</p>
          <p className="text-xs text-text-muted">
            System follows your device setting.
          </p>
        </div>
        <ThemeToggle />
      </div>
      <h1 className="font-display text-2xl font-semibold text-text">Account</h1>
      <p className="mt-1 text-sm text-text-muted">{user.email}</p>

      {params.saved && (
        <p className="mt-4 rounded-lg border border-accent/50 bg-accent-wash px-3 py-2 text-sm text-accent-bright">
          {params.saved}
        </p>
      )}
      {params.error && (
        <p className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {params.error}
        </p>
      )}

      <div className="mt-8">
        <Section
          title="Profile"
          description="Your name, and the two facts the “only roles I qualify for” filter checks against. Leave the degree fields blank to keep using what's read from your résumé."
        >
          <form action={updateProfile} className="space-y-5">
            <div>
              <label className={labelClass} htmlFor="full_name">
                Name
              </label>
              <input
                id="full_name"
                name="full_name"
                defaultValue={meta.full_name ?? ""}
                placeholder="Your name"
                className={`${inputClass} mt-1`}
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div>
                <label className={labelClass} htmlFor="degree_level">
                  Degree level
                </label>
                <select
                  id="degree_level"
                  name="degree_level"
                  defaultValue={meta.degree_level ?? ""}
                  className={`${inputClass} mt-1 w-44`}
                >
                  <option value="" className="bg-bg-raised">
                    {detected ? `From résumé (${detected.level})` : "From résumé"}
                  </option>
                  {DEGREE_OPTIONS.map((d) => (
                    <option key={d.value} value={d.value} className="bg-bg-raised">
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass} htmlFor="grad_year">
                  Graduation year
                </label>
                <input
                  id="grad_year"
                  name="grad_year"
                  inputMode="numeric"
                  defaultValue={meta.grad_year ?? ""}
                  placeholder={detected?.gradYear ? String(detected.gradYear) : "e.g. 2029"}
                  className={`${inputClass} mt-1 w-44`}
                />
              </div>
            </div>

            <div>
              <span className={labelClass}>Interested in</span>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-text-muted">
                    <input
                      type="checkbox"
                      name="interests"
                      value={c}
                      defaultChecked={interests.includes(c)}
                      className="h-3.5 w-3.5 accent-accent"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className={buttonClass}>
              Save profile
            </button>
          </form>
        </Section>

        <Section
          title="Résumé"
          description="Used to rank postings against your experience and to work out which roles you qualify for."
        >
          <p className="text-sm text-text-muted">
            {resume ? (
              <>
                Current file: <span className="text-text">{resume.file_name}</span>
                {!resume.parsed_text?.trim() && (
                  <span className="text-red-400"> — no readable text found</span>
                )}
              </>
            ) : (
              "No résumé uploaded yet."
            )}
          </p>
          <Link
            href="/resume"
            className="mt-3 inline-block border-b border-text-faint text-sm font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Manage résumé →
          </Link>
        </Section>

        <Section title="Password">
          <form action={changePassword} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="current_password">
                Current password
              </label>
              <input
                id="current_password"
                name="current_password"
                type="password"
                required
                autoComplete="current-password"
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="new_password">
                New password
              </label>
              <input
                id="new_password"
                name="new_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="confirm_password">
                Confirm new password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className={`${inputClass} mt-1`}
              />
            </div>
            <button type="submit" className={buttonClass}>
              Change password
            </button>
          </form>
        </Section>

        <Section
          title="Sessions"
          description="Signs you out of InternTrack everywhere, including any browser or phone you've left logged in."
        >
          <form action={signOutEverywhere}>
            <button
              type="submit"
              className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
            >
              Sign out of all devices
            </button>
          </form>
        </Section>

        <Section
          title="Your data"
          description="Everything InternTrack stores about you: tracked applications, hidden postings, and résumé metadata."
        >
          <a
            href="/account/export"
            className="inline-block rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-text transition-colors hover:border-accent-bright hover:text-accent-bright"
          >
            Download my data
          </a>

          <form action={deleteMyData} className="mt-8 max-w-sm rounded-xl border border-red-500/30 p-4">
            <h3 className="text-sm font-semibold text-red-400">Delete my data</h3>
            <p className="mt-1 text-xs text-text-muted">
              Permanently deletes your tracked applications, hidden postings, and uploaded
              résumés. This can&apos;t be undone. Your login itself stays — sign-in will still
              work, the account will just be empty.
            </p>
            <input
              name="confirm"
              placeholder="Type DELETE"
              className={`${inputClass} mt-3`}
              aria-label="Type DELETE to confirm"
            />
            <button
              type="submit"
              className="mt-3 rounded-full border border-red-500/50 px-4 py-1.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              Delete everything
            </button>
          </form>
        </Section>
      </div>
    </div>
  );
}
