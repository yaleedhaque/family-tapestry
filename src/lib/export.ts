import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

export function exportToJSON(
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
): string {
  return JSON.stringify(
    {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      app: "Digital Family Tapestry",
      persons: persons.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        birthYear: p.birthYear,
        deathYear: p.deathYear,
        isAlive: p.isAlive,
        bio: p.bio,
        birthPlace: p.birthPlace,
        profession: p.profession,
        email: p.email,
        phone: p.phone,
        address: p.address,
        website: p.website,
        photoUrl: p.photoUrl,
      })),
      unions: unions.map((u) => ({
        id: u.id,
        partnerA: u.partnerA,
        partnerB: u.partnerB,
        type: u.type,
        startYear: u.startYear,
        endYear: u.endYear,
      })),
      relationships: edges.map((e) => ({
        unionId: e.unionId,
        childId: e.childId,
      })),
    },
    null,
    2
  );
}

export function exportPersonsCSV(persons: PersonLike[]): string {
  const headers = [
    "ID",
    "Full Name",
    "Birth Year",
    "Death Year",
    "Alive",
    "Birth Place",
    "Profession",
    "Bio",
    "Email",
    "Phone",
    "Address",
    "Website",
  ];
  const rows = persons.map((p) => [
    p.id,
    csvEscape(p.fullName),
    String(p.birthYear ?? ""),
    String(p.deathYear ?? ""),
    p.isAlive ? "Yes" : "No",
    csvEscape(p.birthPlace),
    csvEscape(p.profession),
    csvEscape(p.bio),
    csvEscape(p.email),
    csvEscape(p.phone),
    csvEscape(p.address),
    csvEscape(p.website),
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportRelationshipsCSV(
  unions: UnionLike[],
  edges: EdgeLike[],
  persons: PersonLike[]
): string {
  const headers = [
    "Relationship ID",
    "Person A",
    "Person B",
    "Type",
    "Start Year",
    "End Year",
    "Child",
  ];
  const rows: string[][] = [];
  for (const u of unions) {
    const pA = persons.find((p) => p.id === u.partnerA);
    const pB = persons.find((p) => p.id === u.partnerB);
    const children = edges.filter((e) => e.unionId === u.id);
    if (children.length === 0) {
      rows.push([
        u.id,
        csvEscape(pA?.fullName ?? u.partnerA),
        csvEscape(pB?.fullName ?? u.partnerB),
        u.type,
        String(u.startYear ?? ""),
        String(u.endYear ?? ""),
        "",
      ]);
    } else {
      for (const ch of children) {
        const child = persons.find((p) => p.id === ch.childId);
        rows.push([
          u.id,
          csvEscape(pA?.fullName ?? u.partnerA),
          csvEscape(pB?.fullName ?? u.partnerB),
          u.type,
          String(u.startYear ?? ""),
          String(u.endYear ?? ""),
          csvEscape(child?.fullName ?? ch.childId),
        ]);
      }
    }
  }
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function csvEscape(val: string): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportToPNG(
  viewportEl: HTMLDivElement,
  zoom = 1
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(viewportEl, {
    backgroundColor: "#0E0B0A",
    quality: 0.98,
    pixelRatio: Math.max(2, zoom),
    filter: (node: Element) =>
      !node?.classList?.contains("react-flow__minimap") &&
      !node?.classList?.contains("react-flow__controls") &&
      !node?.classList?.contains("react-flow__attribution") &&
      !node?.classList?.contains("react-flow__panel"),
  });
  const link = document.createElement("a");
  link.download = "family-tree.png";
  link.href = dataUrl;
  link.click();
}

export async function exportToPDF(
  viewportEl: HTMLDivElement,
  zoom = 1
): Promise<void> {
  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  // Use the ORIGINAL (un-zoomed) DOM to guarantee the FULL tree is captured
  // regardless of the current canvas view. We render a fresh, full-fit snapshot
  // by temporarily fitting can only live in the canvas; here we capture at the
  // element's natural size.
  const dataUrl = await toPng(viewportEl, {
    backgroundColor: "#0E0B0A",
    quality: 0.98,
    pixelRatio: Math.max(2, zoom),
    filter: (node: Element) =>
      !node?.classList?.contains("react-flow__minimap") &&
      !node?.classList?.contains("react-flow__controls") &&
      !node?.classList?.contains("react-flow__attribution") &&
      !node?.classList?.contains("react-flow__panel"),
  });

  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => {
    img.onload = resolve;
  });

  const imgAspect = img.width / img.height;
  // A4 landscape page — wide tree imagery fits best.
  const pageW = 297;
  const pageH = 210;
  let imgW = pageW - 20;
  let imgH = imgW / imgAspect;
  if (imgH > pageH - 20) {
    imgH = pageH - 20;
    imgW = imgH * imgAspect;
  }
  const pdf = new jsPDF("l", "mm", "a4");
  pdf.addImage(dataUrl, "PNG", (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH,
    undefined, "FAST");
  pdf.save("family-tree.pdf");
}
