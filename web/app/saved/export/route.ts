import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /saved/export -- downloads the signed-in user's saved postings as an
// .xlsx file. RLS on saved_postings means this query can only ever return
// that user's own rows, even though there's no explicit .eq("user_id", ...)
// here -- Supabase enforces it server-side from the session, same as every
// other query against this table in the app.
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
  const sheet = workbook.addWorksheet("Saved Postings");

  sheet.columns = [
    { header: "Company", key: "company", width: 26 },
    { header: "Role", key: "title", width: 42 },
    { header: "Location", key: "location", width: 20 },
    { header: "Season", key: "season", width: 22 },
    { header: "Status", key: "status", width: 14 },
    { header: "Date Saved", key: "created_at", width: 14 },
    { header: "Date Applied", key: "applied_at", width: 14 },
    { header: "Link", key: "url", width: 46 },
  ];
  sheet.getRow(1).font = { bold: true };

  const dateOnly = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  for (const row of rows ?? []) {
    sheet.addRow({
      company: row.company,
      title: row.title,
      location: row.location,
      season: row.season,
      status: row.status,
      created_at: dateOnly(row.created_at),
      applied_at: dateOnly(row.applied_at),
      url: row.url,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `interntrack-saved-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
