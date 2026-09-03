import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

/**
 * Generate a GEDCOM 5.5.1 string from the current tree data.
 * Pure function — no React dependency.
 */
export function generateGedcom(
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
): string {
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

  for (const p of persons) {
    const id = p.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    lines.push(`0 @${id}@ INDI`);
    lines.push(`1 NAME ${p.fullName}`);
    if (p.birthYear) lines.push(`1 BIRT`, `2 DATE ${p.birthYear}`);
    if (p.deathYear) lines.push(`1 DEAT`, `2 DATE ${p.deathYear}`);
    if (p.profession) lines.push(`1 OCCU ${p.profession}`);
    if (p.birthPlace) lines.push(`1 BIRT`, `2 PLAC ${p.birthPlace}`);
    if (p.bio) lines.push(`1 NOTE ${p.bio.replace(/\n/g, "\\n")}`);
  }

  for (const u of unions) {
    const id = u.id.replace(/-/g, "").slice(0, 8).toUpperCase();
    const aId = u.partnerA
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();
    const bId = u.partnerB
      ? u.partnerB.replace(/-/g, "").slice(0, 8).toUpperCase()
      : "";
    lines.push(`0 @${id}@ FAM`);
    if (aId) lines.push(`1 HUSB @${aId}@`);
    if (bId) lines.push(`1 WIFE @${bId}@`);
    if (u.startYear) lines.push(`1 MARR`, `2 DATE ${u.startYear}`);
    for (const e of edges.filter((e) => e.unionId === u.id)) {
      const cId = e.childId
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();
      lines.push(`1 CHIL @${cId}@`);
    }
  }

  lines.push("0 TRLR");
  return lines.join("\n");
}

/**
 * Trigger a browser download of a GEDCOM file.
 */
export function downloadGedcom(
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
) {
  const gedcom = generateGedcom(persons, unions, edges);
  const blob = new Blob([gedcom], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "family-tapestry.ged";
  a.click();
  URL.revokeObjectURL(url);
}
