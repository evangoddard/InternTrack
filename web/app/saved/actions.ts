"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, type SavedStatus } from "@/lib/savedStatus";

// Saves (or re-saves) a posting for the current user, snapshotting its
// display fields -- see supabase/schema.sql for why. Signed-out users are
// sent to log in and then back to wherever they were.
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
    },
    { onConflict: "user_id,posting_id" }
  );

  if (error) {
    console.error("savePosting failed:", error.message);
  }

  revalidatePath(returnTo);
  revalidatePath("/saved");
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
}
