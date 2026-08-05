"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/categories";
import type { DegreeLevel } from "@/lib/eligibility";

const LEVELS: DegreeLevel[] = ["associate", "bachelor", "master", "phd"];

function back(section: string, message: string) {
  redirect(`/account?${section}=${encodeURIComponent(message)}`);
}

/**
 * Display name plus the two facts the eligibility filter gates on.
 *
 * Those are normally read off the résumé, but parsing can misread unusual
 * formatting -- and being wrongly told you don't qualify for a role is a
 * real cost. Setting them here overrides the guess.
 *
 * Stored in Supabase's built-in user metadata rather than a new table:
 * it's a handful of fields on the user themselves, already scoped to them
 * by auth, and it needs no migration.
 */
export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 80);

  const rawLevel = String(formData.get("degree_level") ?? "");
  const degreeLevel = LEVELS.includes(rawLevel as DegreeLevel) ? rawLevel : null;

  const rawYear = String(formData.get("grad_year") ?? "").trim();
  let gradYear: number | null = null;
  if (rawYear) {
    const n = Number(rawYear);
    if (!Number.isInteger(n) || n < 2020 || n > 2040) {
      back("error", "Graduation year must be between 2020 and 2040.");
    }
    gradYear = n;
  }

  const rawInterests = formData.getAll("interests").map(String);
  const interests = rawInterests.filter((i) => (CATEGORIES as readonly string[]).includes(i));

  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: fullName,
      degree_level: degreeLevel,
      grad_year: gradYear,
      interests,
    },
  });

  if (error) back("error", error.message);

  revalidatePath("/account");
  revalidatePath("/");
  back("saved", "Profile updated.");
}

/**
 * Changing the password re-checks the current one first. Supabase would
 * accept the change on session alone, but that means an unattended logged-in
 * browser is enough to lock the real owner out.
 */
export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 8) back("error", "New password must be at least 8 characters.");
  if (next !== confirm) back("error", "New passwords don't match.");

  const { error: wrongCurrent } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (wrongCurrent) back("error", "Current password is incorrect.");

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) back("error", error.message);

  back("saved", "Password changed.");
}

/** Ends every session, on this device and any other. */
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Wipes everything the app stores for this user: tracked applications,
 * hidden postings, and uploaded résumés (both the rows and the files).
 *
 * This deliberately does NOT delete the Supabase auth record -- removing a
 * user requires a service-role key, which this app doesn't hold and
 * shouldn't. The account itself stays, empty; the UI says so plainly rather
 * than implying a full erase.
 */
export async function deleteMyData(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    back("error", 'Type DELETE to confirm.');
  }

  // Storage files first -- if the rows go first their paths are lost and
  // the objects are orphaned in the bucket forever.
  const { data: resumes } = await supabase
    .from("resumes")
    .select("storage_path")
    .eq("user_id", user.id);

  const paths = (resumes ?? []).map((r) => r.storage_path).filter(Boolean);
  if (paths.length > 0) {
    const { error } = await supabase.storage.from("resumes").remove(paths);
    if (error) console.error("resume file delete failed:", error.message);
  }

  for (const table of ["saved_postings", "dismissed_postings", "resumes"]) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) console.error(`${table} delete failed:`, error.message);
  }

  revalidatePath("/", "layout");
  back("saved", "All your saved data has been deleted.");
}
