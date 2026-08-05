import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postings } from "@/lib/data";
import { getQualificationsFor } from "@/lib/qualificationsStore";
import { checkEligibility, parseResumeProfile } from "@/lib/eligibility";

// GET /api/eligibility
//
// Reads the signed-in user's most recent résumé, infers the couple of facts
// that hard-gate an internship application (degree level, graduation year),
// and returns a verdict per posting.
//
// The first call after new postings appear has to fetch their requirements
// text and can take a while; results are cached globally in Supabase, so
// subsequent calls are a single query.
export const maxDuration = 120;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: resumes } = await supabase
    .from("resumes")
    .select("parsed_text")
    .eq("user_id", user.id)
    .order("uploaded_at", { ascending: false })
    .limit(1);

  const resumeText = resumes?.[0]?.parsed_text?.trim();
  if (!resumeText) {
    return NextResponse.json({ error: "No readable résumé uploaded." }, { status: 400 });
  }

  // The résumé is the default source for these, but parsing can misread
  // unusual formatting -- an override set on /account wins.
  const meta = user.user_metadata ?? {};
  const detected = parseResumeProfile(resumeText);
  const profile = {
    level: meta.degree_level || detected.level,
    gradYear: meta.grad_year ?? detected.gradYear,
  };

  const quals = await getQualificationsFor(
    postings.map((p) => ({ posting_id: p.id, url: p.url }))
  );

  const verdicts: Record<string, { eligible: boolean; reason?: string }> = {};
  let ineligible = 0;

  for (const posting of postings) {
    const q = quals[posting.id];
    const verdict = checkEligibility(posting.degrees, q?.qualifications ?? null, profile);
    verdicts[posting.id] = verdict;
    if (!verdict.eligible) ineligible += 1;
  }

  return NextResponse.json({
    profile,
    verdicts,
    ineligible,
    total: postings.length,
  });
}
