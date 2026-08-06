"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { STATUSES, NOT_APPLIED, type SavedStatus } from "@/lib/savedStatus";

// Saves (or re-saves) a posting for the current user, snapshotting its
// display fields -- see supabase/schema.sql for why. Signed-out users are
// sent to log in and then back to wherever they were.
//
// Saving a posting adds it to the tracker as a lead at "not applied" --
// it shows up on /tracker immediately, but applied_at stays null until you
// actually move the status forward yourself (see updateStatus below).
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
      status: NOT_APPLIED,
    },
    { onConflict: "user_id,posting_id" }
  );

  if (error) {
    console.error("savePosting failed:", error.message);
  }

  revalidatePath(returnTo);
  revalidatePath("/tracker");
}

export interface BulkPosting {
  posting_id: string;
  company: string;
  title: string;
  url: string;
  location: string;
  season: string;
}

/**
 * Save a batch at once -- the "save all" button on a filtered view.
 *
 * Upserts on (user_id, posting_id) like savePosting does, so anything
 * already tracked keeps its existing status and dates instead of being
 * reset to "not applied". Returns how many rows were new so the UI can say
 * something truthful rather than claiming it saved everything.
 */
export async function saveManyPostings(items: BulkPosting[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?message=${encodeURIComponent("Sign in to save postings.")}`);
  }

  if (items.length === 0) return { saved: 0 };

  const { data: existing } = await supabase
    .from("saved_postings")
    .select("posting_id")
    .eq("user_id", user.id);

  const already = new Set((existing ?? []).map((r) => r.posting_id));
  const fresh = items.filter((i) => !already.has(i.posting_id));

  if (fresh.length > 0) {
    const { error } = await supabase.from("saved_postings").upsert(
      fresh.map((i) => ({
        user_id: user.id,
        posting_id: i.posting_id,
        company: i.company,
        title: i.title,
        url: i.url,
        location: i.location,
        season: i.season,
        status: NOT_APPLIED,
      })),
      { onConflict: "user_id,posting_id" }
    );
    if (error) console.error("saveManyPostings failed:", error.message);
  }

  revalidatePath("/");
  revalidatePath("/tracker");
  return { saved: fresh.length };
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

  revalidatePath("/tracker");
  revalidatePath("/");
}

// Unsave straight from the feed, which only knows the posting's own id --
// not the saved_postings row id that unsavePosting() above deletes by.
// Same delete either way: one row, scoped to this user, and it disappears
// from the tracker too since they're the same record.
export async function unsaveByPostingId(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const postingId = String(formData.get("posting_id") ?? "");
  const { error } = await supabase
    .from("saved_postings")
    .delete()
    .eq("posting_id", postingId)
    .eq("user_id", user.id);

  if (error) console.error("unsaveByPostingId failed:", error.message);

  revalidatePath("/");
  revalidatePath("/tracker");
}

// Hide a posting from the feed for good. Kept separate from unsaving --
// this is "I've ruled this out", not "I'm no longer tracking it".
export async function dismissPosting(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?message=${encodeURIComponent("Sign in to hide postings.")}`);
  }

  const postingId = String(formData.get("posting_id") ?? "");
  const { error } = await supabase
    .from("dismissed_postings")
    .upsert({ user_id: user.id, posting_id: postingId }, { onConflict: "user_id,posting_id" });

  if (error) console.error("dismissPosting failed:", error.message);

  revalidatePath("/");
}

/** Bring one hidden posting back into the feed. */
export async function undismissPosting(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const postingId = String(formData.get("posting_id") ?? "");
  const { error } = await supabase
    .from("dismissed_postings")
    .delete()
    .eq("posting_id", postingId)
    .eq("user_id", user.id);

  if (error) console.error("undismissPosting failed:", error.message);

  revalidatePath("/");
}

/** Bring every hidden posting back into the feed. */
export async function restoreDismissed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("dismissed_postings").delete().eq("user_id", user.id);
  if (error) console.error("restoreDismissed failed:", error.message);

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

  // applied_at is stamped once, the first time status moves off
  // "not applied", and never overwritten afterwards -- it has to be a real
  // apply date for the sheet to mean anything, not just "last touched".
  // Keyed off "anything but not_applied" rather than status === "applied"
  // specifically, so jumping straight to OA/Interview still records a date.
  if (status !== NOT_APPLIED) {
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
