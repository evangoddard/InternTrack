import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /account/export -- everything the app stores about you, as JSON.
//
// Deliberately the raw rows rather than a prettied report: the point is to
// be able to see exactly what's held and take it elsewhere. Résumé files
// themselves aren't inlined (they're your own uploads, already downloadable
// from the résumé page) -- only their metadata.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const [{ data: saved }, { data: dismissed }, { data: resumes }] = await Promise.all([
    supabase.from("saved_postings").select("*").eq("user_id", user.id),
    supabase.from("dismissed_postings").select("*").eq("user_id", user.id),
    supabase
      .from("resumes")
      .select("id, file_name, storage_path, uploaded_at")
      .eq("user_id", user.id),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      profile: user.user_metadata ?? {},
    },
    tracked_applications: saved ?? [],
    hidden_postings: dismissed ?? [],
    resumes: resumes ?? [],
  };

  const fileName = `interntrack-data-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
