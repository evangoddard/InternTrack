import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { statusLabel } from "@/lib/savedStatus";
import { checkRateLimit, tooManyRequests } from "@/lib/rateLimit";

// GET /tracker/export -- downloads the signed-in user's application tracker
// as a real .xlsx file (open it in Excel, Numbers, Google Sheets, or
// whatever your system opens .xlsx with). RLS on saved_postings means this
// query can only ever return the signed-in user's own rows.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const limit = await checkRateLimit("export");
  if (!limit.allowed) return tooManyRequests("export", limit);

  // RLS already restricts this to the caller's rows. The explicit user_id
  // filter is defence in depth: it keeps the query correct on its own terms
  // rather than depending on a policy staying in place, and it means a
  // future migration that loosens a policy cannot silently turn this route
  // into a full-table export.
  const { data: rows, error } = await supabase
    .from("saved_postings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "InternTrack";
  const sheet = workbook.addWorksheet("Application Tracker");

  sheet.columns = [
    { header: "Company", key: "company", width: 26 },
    { header: "Role", key: "title", width: 42 },
    { header: "Location", key: "location", width: 20 },
    { header: "Date Applied", key: "applied_at", width: 14 },
    { header: "Status/Interview Stage", key: "status", width: 18 },
    { header: "Offer", key: "offer", width: 16 },
    { header: "Link", key: "url", width: 46 },
  ];
  sheet.getRow(1).font = { bold: true };

  const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  for (const row of rows ?? []) {
    sheet.addRow({
      company: row.company,
      title: row.title,
      location: row.location,
      applied_at: dateOnly(row.applied_at),
      status: statusLabel(row.status),
      offer: row.offer,
      url: row.url,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `interntrack-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store, private",
    },
  });
}
