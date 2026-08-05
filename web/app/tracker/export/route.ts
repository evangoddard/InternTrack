import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { statusLabel } from "@/lib/savedStatus";

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

  const { data: rows, error } = await supabase
    .from("saved_postings")
    .select("*")
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
    { header: "Resume Used", key: "resume_used", width: 20 },
    { header: "Cover Letter", key: "cover_letter", width: 20 },
    { header: "Location", key: "location", width: 20 },
    { header: "Date Applied", key: "applied_at", width: 14 },
    { header: "Status/Interview Stage", key: "status", width: 18 },
    { header: "Salary", key: "salary", width: 16 },
    { header: "Offer", key: "offer", width: 16 },
    { header: "Link", key: "url", width: 46 },
  ];
  sheet.getRow(1).font = { bold: true };

  const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  for (const row of rows ?? []) {
    sheet.addRow({
      company: row.company,
      title: row.title,
      resume_used: row.resume_used,
      cover_letter: row.cover_letter,
      location: row.location,
      applied_at: dateOnly(row.applied_at),
      status: statusLabel(row.status),
      salary: row.salary,
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
    },
  });
}
