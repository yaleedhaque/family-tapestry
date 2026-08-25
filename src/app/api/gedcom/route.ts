import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabase();

  const { data: persons } = await supabase.from("persons").select("*");
  const { data: unions } = await supabase.from("unions").select("*");
  const { data: edges } = await supabase.from("parent_edges").select("*");

  if (!persons) {
    return NextResponse.json({ error: "No data" }, { status: 500 });
  }

  const lines: string[] = [
    "0 HEAD",
    "1 SOUR FamilyTapestry",
    "2 VERS 1.0",
    "1 DEST GEDCOM",
    "1 DATE " + new Date().toISOString().split("T")[0],
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
  ];

  // Export persons as INDI records
  for (const p of persons) {
    const id = p.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    lines.push(`0 @${id}@ INDI`);
    lines.push(`1 NAME ${p.full_name}`);
    if (p.birth_year) {
      lines.push(`1 BIRT`);
      lines.push(`2 DATE ${p.birth_year}`);
    }
    if (p.death_year) {
      lines.push(`1 DEAT`);
      lines.push(`2 DATE ${p.death_year}`);
    }
    if (p.profession) lines.push(`1 OCCU ${p.profession}`);
    if (p.birth_place) lines.push(`1 BIRT\n2 PLAC ${p.birth_place}`);
    if (p.bio) lines.push(`1 NOTE ${p.bio.replace(/\n/g, "\\n")}`);
  }

  // Export unions as FAM records
  if (unions) {
    for (const u of unions) {
      const id = u.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const aId = u.partner_a.replace(/-/g, "").slice(0, 8).toUpperCase();
      const bId = u.partner_b.replace(/-/g, "").slice(0, 8).toUpperCase();
      lines.push(`0 @${id}@ FAM`);
      lines.push(`1 HUSB @${aId}@`);
      lines.push(`1 WIFE @${bId}@`);
      if (u.start_year) lines.push(`1 MARR\n2 DATE ${u.start_year}`);

      // Children of this union
      if (edges) {
        const children = edges.filter((e) => e.union_id === u.id);
        for (const c of children) {
          const cId = c.child_id.replace(/-/g, "").slice(0, 8).toUpperCase();
          lines.push(`1 CHIL @${cId}@`);
        }
      }
    }
  }

  lines.push("0 TRLR");

  const gedcom = lines.join("\n");

  return new NextResponse(gedcom, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="family-tapestry.ged"',
    },
  });
}
