import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getQualificationsFor } from "@/lib/qualificationsStore";
import { skillFrequency } from "@/lib/matchExplain";

// GET /api/skill-gaps
//
// What the roles you've actually saved keep asking for, and which of those
// your résumé shows. Aggregated across your tracker rather than a single
// posting, which is what makes it strategic: one posting wanting Verilog is
// noise, two thirds of them wanting it is a study plan.
//
// Counts postings that mention a skill, not raw mentions, so one verbose
// job description can't dominate the list.
export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const [{ data: saved }, { data: resumes }] = await Promise.all([
    supabase.from("saved_postings").select("posting_id, url").eq("user_id", user.id),
    supabase
      .from("resumes")
      .select("parsed_text")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(1),
  ]);

  if (!saved || saved.length === 0) {
    return NextResponse.json({ skills: [], analysed: 0, saved: 0 });
  }

  const quals = await getQualificationsFor(
    saved.map((r) => ({ posting_id: r.posting_id, url: r.url }))
  );

  const texts = saved
    .map((r) => quals[r.posting_id]?.full)
    .filter((t): t is string => Boolean(t));

  const resumeText = resumes?.[0]?.parsed_text ?? "";

  return NextResponse.json({
    skills: skillFrequency(texts, resumeText),
    // Postings whose requirements couldn't be read are excluded from the
    // percentages -- saying "62% of your saved roles" has to mean 62% of the
    // ones actually analysed, not of the ones you saved.
    analysed: texts.length,
    saved: saved.length,
    hasResume: Boolean(resumeText.trim()),
  });
}
