"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extractResumeText } from "@/lib/parseResume";
import { overLimit } from "@/lib/rateLimit";

export async function uploadResume(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Document parsing is CPU-bound on an attacker-controlled payload, so
  // uploads sit in the EXPENSIVE band rather than the WRITE one.
  if (await overLimit("resumeUpload")) {
    redirect(`/resume?error=${encodeURIComponent("Too many uploads just now. Wait a minute and try again.")}`);
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/resume?error=${encodeURIComponent("Choose a file first.")}`);
  }

  // Path convention the storage RLS policies in supabase/schema.sql check:
  // the first path segment must equal the uploader's own user id.
  const path = `${user.id}/${randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });

  if (uploadError) {
    redirect(`/resume?error=${encodeURIComponent(uploadError.message)}`);
  }

  // Best-effort: a résumé that can't be parsed (a scanned/image PDF, an
  // unsupported format) still gets saved -- it just won't produce ranked
  // matches on the Personal tab until a parseable one is uploaded. Silently
  // dropping the upload over an extraction failure would be worse.
  const buffer = Buffer.from(await file.arrayBuffer());
  const parsedText = await extractResumeText(buffer, file.type);

  const { error: dbError } = await supabase.from("resumes").insert({
    user_id: user.id,
    file_name: file.name,
    storage_path: path,
    parsed_text: parsedText,
  });

  if (dbError) {
    // Uploaded the file but couldn't record it -- clean up rather than
    // leaving an orphaned, invisible-to-the-UI file in storage.
    await supabase.storage.from("resumes").remove([path]);
    redirect(`/resume?error=${encodeURIComponent(dbError.message)}`);
  }

  revalidatePath("/resume");
  revalidatePath("/");
}

export async function deleteResume(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (await overLimit("write")) return;

  const id = String(formData.get("id") ?? "");
  const storagePath = String(formData.get("storage_path") ?? "");

  const { error: storageError } = await supabase.storage.from("resumes").remove([storagePath]);
  if (storageError) console.error("resume storage delete failed:", storageError.message);

  const { error: dbError } = await supabase
    .from("resumes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (dbError) console.error("resume row delete failed:", dbError.message);

  revalidatePath("/resume");
}
