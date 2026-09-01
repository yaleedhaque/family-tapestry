"use client";

import { useState, useCallback } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

interface GedcomImportProps {
  onImport: (persons: PersonLike[], unions: UnionLike[], edges: EdgeLike[]) => void;
  onClose: () => void;
}

interface ParsedPerson {
  id: string;
  fullName: string;
  birthYear: number | null;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
}

interface ParsedUnion {
  id: string;
  partnerA: string;
  partnerB: string;
  type: string;
  startYear: number | null;
  endYear: number | null;
}

interface ParsedEdge {
  unionId: string;
  childId: string;
}

function parseGedcom(text: string): { persons: ParsedPerson[]; unions: ParsedUnion[]; edges: ParsedEdge[] } {
  const lines = text.split(/\r?\n/);
  const persons: ParsedPerson[] = [];
  const unions: ParsedUnion[] = [];
  const edges: ParsedEdge[] = [];
  const familyMap = new Map<string, { husb?: string; wife?: string; children: string[]; marriageYear?: number | null }>();
  const individualMap = new Map<string, { name: string; birthYear: number | null; deathYear: number | null; birthPlace: string; occupation: string; notes: string }>();

  let currentRecord: "INDI" | "FAM" | null = null;
  let currentId = "";
  let subTag = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\d+)\s+(@\w+@)?\s*(\w+)\s*(.*)?$/);
    if (!match) continue;

    const level = parseInt(match[1]);
    const xref = match[2];
    const tag = match[3];
    const value = (match[4] || "").trim();

    if (level === 0) {
      subTag = "";
      if (tag === "INDI" && xref) {
        currentRecord = "INDI";
        currentId = xref;
        individualMap.set(currentId, { name: "", birthYear: null, deathYear: null, birthPlace: "", occupation: "", notes: "" });
      } else if (tag === "FAM" && xref) {
        currentRecord = "FAM";
        currentId = xref;
        familyMap.set(currentId, { children: [], marriageYear: null });
      } else {
        currentRecord = null;
      }
      continue;
    }

    if (level === 1) {
      subTag = "";
      if (currentRecord === "INDI") {
        const indi = individualMap.get(currentId);
        if (!indi) continue;
        if (tag === "NAME") indi.name = value.replace(/\//g, "").trim();
        else if (tag === "BIRT") subTag = "BIRT";
        else if (tag === "DEAT") subTag = "DEAT";
        else if (tag === "OCCU") indi.occupation = value;
        else if (tag === "NOTE") indi.notes = value;
      } else if (currentRecord === "FAM") {
        const fam = familyMap.get(currentId);
        if (!fam) continue;
        if (tag === "HUSB") fam.husb = value;
        else if (tag === "WIFE") fam.wife = value;
        else if (tag === "CHIL") fam.children.push(value);
        else if (tag === "MARR") subTag = "MARR";
      }
    } else if (level === 2) {
      if (currentRecord === "INDI") {
        const indi = individualMap.get(currentId);
        if (!indi) continue;
        if (subTag === "BIRT" && tag === "DATE") {
          const yr = parseInt(value);
          if (!isNaN(yr)) indi.birthYear = yr;
        } else if (subTag === "BIRT" && tag === "PLAC") {
          indi.birthPlace = value;
        } else if (subTag === "DEAT" && tag === "DATE") {
          const yr = parseInt(value);
          if (!isNaN(yr)) indi.deathYear = yr;
        }
      } else if (currentRecord === "FAM") {
        const fam = familyMap.get(currentId);
        if (!fam) continue;
        if (subTag === "MARR" && tag === "DATE") {
          const yr = parseInt(value);
          if (!isNaN(yr)) fam.marriageYear = yr;
        }
      }
    }
  }

  let personCounter = 0;
  for (const data of Array.from(individualMap.values())) {
    personCounter++;
    const id = `ged_p${personCounter}`;
    persons.push({
      id,
      fullName: data.name || `Person ${personCounter}`,
      birthYear: data.birthYear,
      deathYear: data.deathYear,
      isAlive: data.deathYear === null,
      bio: data.notes,
      birthPlace: data.birthPlace,
      profession: data.occupation,
    });
  }

  const xrefToId = new Map<string, string>();
  let idx = 0;
  for (const xrefKey of Array.from(individualMap.keys())) {
    idx++;
    xrefToId.set(xrefKey, `ged_p${idx}`);
  }

  let unionCounter = 0;
  for (const fam of Array.from(familyMap.values())) {
    unionCounter++;
    const unionId = `ged_u${unionCounter}`;
    const husbId = fam.husb ? xrefToId.get(fam.husb) ?? "" : "";
    const wifeId = fam.wife ? xrefToId.get(fam.wife) ?? "" : "";
    if (!husbId && !wifeId) continue;

    unions.push({
      id: unionId,
      partnerA: husbId,
      partnerB: wifeId,
      type: "marriage",
      startYear: fam.marriageYear ?? null,
      endYear: null,
    });

    for (const childXref of fam.children) {
      const childId = xrefToId.get(childXref);
      if (childId) {
        edges.push({ unionId, childId });
      }
    }
  }

  return { persons, unions, edges };
}

export default function GedcomImport({ onImport, onClose }: GedcomImportProps) {
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ persons: number; unions: number; edges: number } | null>(null);
  const [parsed, setParsed] = useState<{ persons: ParsedPerson[]; unions: ParsedUnion[]; edges: ParsedEdge[] } | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (!text.includes("INDI") && !text.includes("0 HEAD")) {
        setError("This doesn't look like a valid GEDCOM file.");
        return;
      }
      try {
        const result = parseGedcom(text);
        if (result.persons.length === 0) {
          setError("No individuals found in the file.");
          return;
        }
        setParsed(result);
        setStats({ persons: result.persons.length, unions: result.unions.length, edges: result.edges.length });
      } catch {
        setError("Failed to parse GEDCOM file. Check the format and try again.");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!parsed) return;
    onImport(
      parsed.persons.map((p) => ({ ...p, bio: p.bio || "", email: "", phone: "", address: "", website: "", lat: null, lng: null, photoUrl: "" })),
      parsed.unions,
      parsed.edges
    );
    onClose();
  }, [parsed, onImport, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="font-display text-lg text-[var(--parchment)] mb-1">Import GEDCOM</h3>
        <p className="text-xs text-[var(--parchment-dim)] mb-4">Upload a .ged file to import your family tree data.</p>

        {!parsed ? (
          <div className="border-2 border-dashed border-[var(--thread-gold-dim)]/30 rounded-lg p-8 text-center">
            <input type="file" accept=".ged,.gedcom" onChange={handleFile} className="hidden" id="gedcom-input" />
            <label htmlFor="gedcom-input" className="cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--thread-gold-dim)" strokeWidth="1.5" className="w-10 h-10 mx-auto mb-3">
                <path d="M12 16V4M8 8l4-4 4 4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-[var(--parchment-dim)]">Click to select a GEDCOM file</span>
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
              <p className="text-sm text-[var(--parchment)] mb-2 font-body">Ready to import:</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="block text-lg font-display text-[var(--thread-gold)]">{stats?.persons}</span>
                  <span className="text-[10px] text-[var(--parchment-dim)]">People</span>
                </div>
                <div>
                  <span className="block text-lg font-display text-[var(--thread-gold)]">{stats?.unions}</span>
                  <span className="text-[10px] text-[var(--parchment-dim)]">Unions</span>
                </div>
                <div>
                  <span className="block text-lg font-display text-[var(--thread-gold)]">{stats?.edges}</span>
                  <span className="text-[10px] text-[var(--parchment-dim)]">Parent links</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[var(--parchment-dim)] italic">This will create a brand-new tree in the tree switcher — it does not modify your current tree.</p>
          </div>
        )}

        {error && <p className="text-xs text-[var(--ember-red)] mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">
            Cancel
          </button>
          {parsed && (
            <button onClick={handleConfirm} className="px-4 py-2 text-sm rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] hover:opacity-90 transition-opacity font-body">
              Import Tree
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
