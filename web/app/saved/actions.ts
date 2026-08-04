"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, type SavedStatus } from "@/lib/savedStatus";

// Saves (or re-saves) a posting for the current user, snapshotting its
// display fields -- see supabase/schema.sql for why. Signed-out users are
// sent to log in and then back to wherever they were.
//
// Status defaults straight to "applied" (with applied_at set immediately)
// rather than the old "saved" intermediate stage -- the Save button on the
// feed is the only way postings enter this table, so by the time something
// is here it's because you're applying to it, and it should show up on
// /tracker right away without a separate "mark applied" step.
export async function savePosting(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const returnTo = String(formData.get("returnTo") ?? "/");

  if (!user) {
    redirect(`/login?message=${encodeURIComponent("Sign in to save postings.")}`);
  }

  const { error } = await supabase.from("saved_postings").upsert(
    {
      user_id: user.id,
      posting_id: String(formData.get("posting_id") ?? ""),
      company: String(formData.get("company") ?? ""),
      title: String(formData.get("title") ?? ""),
      url: String(formData.get("url") ?? ""),
      location: String(formData.get("location") ?? ""),
      season: String(formData.get("season") ?? ""),
      status: "applied",
      applied_at: new Date().toISOString(),
    },
    { onConflict: "user_id,posting_id" }
  );

  if (error) {
    console.error("savePosting failed:", error.message);
  }

  revalidatePath(returnTo);
  revalidatePath("/saved");
  revalidatePath("/tracker");
}

export async function unsavePosting(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const { error } = await supabase
    .from("saved_postings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) console.error("unsavePosting failed:", error.message);

  revalidatePath("/saved");
  revalidatePath("/tracker");
  revalidatePath("/");
}

export async function updateStatus(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!STATUSES.includes(status as SavedStatus)) return;

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

  // applied_at is set once, the first time status becomes "applied", and
  // never overwritten by later status changes -- it has to be a real apply
  // date for the Excel export to mean anything, not just "last touched."
  if (status === "applied") {
    const { data: existing } = await supabase
      .from("saved_postings")
      .select("applied_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing?.applied_at) {
      update.applied_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from("saved_postings")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) console.error("updateStatus failed:", error.message);

  revalidatePath("/saved");
  revalidatePath("/tracker");
}

// The freeform per-application fields on the /tracker sheet -- edited
// inline cell-by-cell, so this takes plain arguments instead of a FormData
// (it's called directly from a client component, never from a <form>).
// Whitelisted against TRACKER_FIELDS since `field` ultimately becomes a
// column name in the update -- never build that from unvalidated input.
const TRACKER_FIELDS = new Set(["resume_used", "cover_letter", "salary", "offer"]);

export async function updateTrackerField(id: string, field: string, value: string) {
  if (!TRACKER_FIELDS.has(field)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("saved_postings")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) console.error("updateTrackerField failed:", error.message);

  revalidatePath("/tracker");
}
