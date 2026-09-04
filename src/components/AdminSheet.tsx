"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

/* ── Column definitions ──────────────────────────────────────────── */

interface Col {
  key: string;
  label: string;
  width: number;
  type: "text" | "number" | "boolean" | "photo" | "computed";
  editable: boolean;
}

const PERSON_COLS: Col[] = [
  { key: "photo", label: "Photo", width: 56, type: "photo", editable: false },
  { key: "fullName", label: "Full Name", width: 180, type: "text", editable: true },
  { key: "nameNative", label: "Name (Native)", width: 140, type: "text", editable: true },
  { key: "gender", label: "Gender", width: 90, type: "text", editable: true },
  { key: "birthYear", label: "Birth Year", width: 90, type: "number", editable: true },
  { key: "deathYear", label: "Death Year", width: 90, type: "number", editable: true },
  { key: "isAlive", label: "Alive", width: 60, type: "boolean", editable: true },
  { key: "birthPlace", label: "Birth Place", width: 160, type: "text", editable: true },
  { key: "profession", label: "Profession", width: 140, type: "text", editable: true },
  { key: "bio", label: "Bio", width: 200, type: "text", editable: true },
  { key: "email", label: "Email", width: 160, type: "text", editable: true },
  { key: "phone", label: "Phone", width: 120, type: "text", editable: true },
  { key: "address", label: "Address", width: 160, type: "text", editable: true },
  { key: "website", label: "Website", width: 140, type: "text", editable: true },
];

const REL_COLS: Col[] = [
  { key: "parents", label: "Parents", width: 200, type: "computed", editable: false },
  { key: "partners", label: "Partners", width: 200, type: "computed", editable: false },
  { key: "children", label: "Children", width: 200, type: "computed", editable: false },
];

const ALL_COLS = [...PERSON_COLS, ...REL_COLS];

/* ── Helpers ─────────────────────────────────────────────────────── */

function computeSerial(
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
): Map<string, number> {
  // Sort: by generation (ancestors first), then birth year (oldest first), then name
  const genMap = new Map<string, number>();
  // BFS from roots to assign generation
  const childOf = new Map<string, string>();
  for (const e of edges) childOf.set(e.childId, e.unionId);
  const unionPartner = new Map<string, string[]>();
  for (const u of unions) {
    if (!unionPartner.has(u.id)) unionPartner.set(u.id, []);
    unionPartner.get(u.id)!.push(u.partnerA, u.partnerB);
  }
  // Find roots (persons with no parent edge)
  const childIds = new Set(edges.map((e) => e.childId));
  const roots = persons.filter((p) => !childIds.has(p.id));
  const queue: { id: string; gen: number }[] = roots.map((r) => ({ id: r.id, gen: 0 }));
  const visited = new Set<string>();
  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    genMap.set(id, gen);
    // Find unions where this person is a partner
    for (const u of unions) {
      if (u.partnerA === id || u.partnerB === id) {
        for (const pid of unionPartner.get(u.id) ?? []) {
          if (!visited.has(pid)) queue.push({ id: pid, gen });
        }
        // Children of this union
        for (const e of edges) {
          if (e.unionId === u.id && !visited.has(e.childId)) {
            queue.push({ id: e.childId, gen: gen + 1 });
          }
        }
      }
    }
  }
  // Assign gen to unvisited
  for (const p of persons) {
    if (!genMap.has(p.id)) genMap.set(p.id, 99);
  }

  const sorted = [...persons].sort((a, b) => {
    const ga = genMap.get(a.id) ?? 99;
    const gb = genMap.get(b.id) ?? 99;
    if (ga !== gb) return ga - gb;
    const ya = a.birthYear ?? 9999;
    const yb = b.birthYear ?? 9999;
    if (ya !== yb) return ya - yb;
    return a.fullName.localeCompare(b.fullName);
  });
  const serial = new Map<string, number>();
  sorted.forEach((p, i) => serial.set(p.id, i + 1));
  return serial;
}

function getRelations(
  personId: string,
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
) {
  const nameOf = (id: string) => persons.find((p) => p.id === id)?.fullName ?? id.slice(0, 8);
  const parentEdges = edges.filter((e) => e.childId === personId);
  const parents = parentEdges.map((e) => {
    const u = unions.find((u) => u.id === e.unionId);
    if (!u) return null;
    const names = [nameOf(u.partnerA), u.partnerB ? nameOf(u.partnerB) : ""].filter(Boolean);
    const rel = e.relationshipType === "adopted" ? " [adopted]" : e.relationshipType === "step" ? " [step]" : "";
    return names.join(" & ") + rel;
  }).filter(Boolean);

  const partnerUnions = unions.filter((u) => u.partnerA === personId || u.partnerB === personId);
  const partners = partnerUnions.map((u) => {
    const otherId = u.partnerA === personId ? u.partnerB : u.partnerA;
    const type = u.type === "marriage" ? "" : ` (${u.type})`;
    const years = u.startYear ? ` (${u.startYear})` : "";
    return (otherId ? nameOf(otherId) : "?") + type + years;
  }).filter(Boolean);

  const childEdges = edges.filter((e) => {
    const u = unions.find((u) => u.id === e.unionId);
    return u && (u.partnerA === personId || u.partnerB === personId);
  });
  const children = childEdges.map((e) => {
    const rel = e.relationshipType === "adopted" ? " [adopted]" : e.relationshipType === "step" ? " [step]" : "";
    return nameOf(e.childId) + rel;
  }).filter(Boolean);

  return { parents, partners, children };
}

/* ── Editable Cell ───────────────────────────────────────────────── */

function EditableCell({
  value,
  type,
  onSave,
  disabled,
}: {
  value: string | number | boolean | null;
  type: "text" | "number" | "boolean";
  onSave: (val: string | number | boolean | null) => void;
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (type === "boolean") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onSave(e.target.checked)}
        disabled={disabled}
        className="accent-[var(--thread-gold)] w-4 h-4 cursor-pointer"
      />
    );
  }

  if (editing) {
    const commit = () => {
      setEditing(false);
      if (type === "number") {
        const n = draft.trim() === "" ? null : Number(draft);
        onSave(n);
      } else {
        onSave(draft);
      }
    };
    return (
      <input
        ref={inputRef}
        type={type === "number" ? "number" : "text"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value ?? ""));
            setEditing(false);
          }
          if (e.key === "Tab") commit();
        }}
        className="w-full bg-[var(--tapestry-bg)] border border-[var(--thread-gold)]/60 text-[var(--parchment)] text-xs px-1.5 py-1 rounded font-body focus:outline-none focus:ring-1 focus:ring-[var(--thread-gold)]"
      />
    );
  }

  const display = type === "number" ? (value != null ? String(value) : "") : String(value ?? "");
  return (
    <div
      onClick={() => {
        if (!disabled) {
          setDraft(String(value ?? ""));
          setEditing(true);
        }
      }}
      className={`w-full min-h-[28px] px-1.5 py-1 text-xs font-body text-[var(--parchment)] truncate ${disabled ? "cursor-default" : "cursor-pointer hover:bg-[var(--thread-gold)]/10 rounded"}`}
      title={display}
    >
      {display || <span className="text-[var(--parchment-dim)]/40">—</span>}
    </div>
  );
}

/* ── Photo Cell ──────────────────────────────────────────────────── */

function PhotoCell({ url, name }: { url: string | null; name: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!url) {
    return (
      <div className="w-8 h-8 rounded-full bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 flex items-center justify-center">
        <span className="text-[10px] text-[var(--parchment-dim)]/40">
          {name.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }
  return (
    <>
      <img
        src={url}
        alt={name}
        className="w-8 h-8 rounded-full object-cover border border-[var(--thread-gold-dim)]/30 cursor-pointer hover:border-[var(--thread-gold)] transition-colors"
        onClick={() => setExpanded(true)}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <img src={url} alt={name} className="max-w-[80vw] max-h-[80vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */

interface AdminSheetProps {
  persons: PersonLike[];
  unions: UnionLike[];
  edges: EdgeLike[];
  onSavePerson: (person: PersonLike) => void;
  onImportTree?: (persons: PersonLike[], unions: UnionLike[], edges: EdgeLike[]) => void;
}

export default function AdminSheet({
  persons,
  unions,
  edges,
  onSavePerson,
  onImportTree,
}: AdminSheetProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    persons: PersonLike[];
    unions: UnionLike[];
    edges: EdgeLike[];
    newCount: number;
    updateCount: number;
    unchangedCount: number;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const serialMap = useMemo(() => computeSerial(persons, unions, edges), [persons, unions, edges]);

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return persons;
    const q = search.toLowerCase();
    return persons.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        (p.nameNative ?? "").toLowerCase().includes(q) ||
        (p.birthPlace ?? "").toLowerCase().includes(q) ||
        (p.profession ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.phone ?? "").includes(q)
    );
  }, [persons, search]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let av: string | number | null;
      let bv: string | number | null;
      if (sortKey === "s#") {
        av = serialMap.get(a.id) ?? 999;
        bv = serialMap.get(b.id) ?? 999;
      } else if (sortKey === "parents" || sortKey === "partners" || sortKey === "children") {
        const ra = getRelations(a.id, persons, unions, edges);
        const rb = getRelations(b.id, persons, unions, edges);
        av = ra[sortKey as keyof typeof ra].join(", ");
        bv = rb[sortKey as keyof typeof rb].join(", ");
      } else {
        av = (a as unknown as Record<string, string | number | null>)[sortKey] as string | number | null;
        bv = (b as unknown as Record<string, string | number | null>)[sortKey] as string | number | null;
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, serialMap, persons, unions, edges]);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey]
  );

  const handleSaveField = useCallback(
    (personId: string, field: string, value: string | number | boolean | null) => {
      const person = persons.find((p) => p.id === personId);
      if (!person) return;
      const updated = { ...person, [field]: value };
      // Auto-compute isAlive from deathYear
      if (field === "deathYear") {
        updated.isAlive = value == null;
      }
      onSavePerson(updated);
    },
    [persons, onSavePerson]
  );

  // Export
  const handleExportJSON = useCallback(() => {
    const data = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      app: "Digital Family Tapestry",
      persons: persons.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        nameNative: p.nameNative,
        gender: p.gender,
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
        lat: p.lat,
        lng: p.lng,
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
        relationshipType: e.relationshipType,
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-tree-data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [persons, unions, edges]);

  const handleExportCSV = useCallback(() => {
    const headers = [
      "S#",
      "ID",
      "Full Name",
      "Name (Native)",
      "Gender",
      "Birth Year",
      "Death Year",
      "Alive",
      "Birth Place",
      "Death Place",
      "Profession",
      "Bio",
      "Email",
      "Phone",
      "Address",
      "Website",
      "Photo URL",
      "Lat",
      "Lng",
    ];
    const rows = sorted.map((p) => {
      const s = serialMap.get(p.id) ?? "";
      return [
        String(s),
        p.id,
        csvEscape(p.fullName),
        csvEscape(p.nameNative ?? ""),
        p.gender ?? "",
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
        csvEscape(p.photoUrl),
        String(p.lat ?? ""),
        String(p.lng ?? ""),
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-tree-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted, serialMap]);

  // Import
  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const importedPersons: PersonLike[] = (data.persons ?? []).map(
            (p: Record<string, unknown>) => ({
              id: String(p.id ?? ""),
              fullName: String(p.fullName ?? p.full_name ?? ""),
              nameNative: String(p.nameNative ?? p.name_native ?? ""),
              gender: String(p.gender ?? ""),
              birthYear: p.birthYear ?? p.birth_year ?? null,
              deathYear: p.deathYear ?? p.death_year ?? null,
              isAlive: p.isAlive ?? p.is_alive ?? true,
              bio: String(p.bio ?? ""),
              birthPlace: String(p.birthPlace ?? p.birth_place ?? ""),
              profession: String(p.profession ?? ""),
              email: String(p.email ?? ""),
              phone: String(p.phone ?? ""),
              address: String(p.address ?? ""),
              website: String(p.website ?? ""),
              photoUrl: String(p.photoUrl ?? p.photo_url ?? ""),
              lat: (p.lat as number) ?? null,
              lng: (p.lng as number) ?? null,
            })
          );
          const importedUnions: UnionLike[] = (data.unions ?? []).map(
            (u: Record<string, unknown>) => ({
              id: String(u.id ?? ""),
              partnerA: String(u.partnerA ?? u.partner_a ?? ""),
              partnerB: String(u.partnerB ?? u.partner_b ?? ""),
              type: String(u.type ?? u.union_type ?? "marriage"),
              startYear: (u.startYear ?? u.start_year ?? null) as number | null,
              endYear: (u.endYear ?? u.end_year ?? null) as number | null,
            })
          );
          const importedEdges: EdgeLike[] = (data.relationships ?? data.edges ?? []).map(
            (r: Record<string, unknown>) => ({
              unionId: String(r.unionId ?? r.union_id ?? ""),
              childId: String(r.childId ?? r.child_id ?? ""),
              relationshipType: String(r.relationshipType ?? r.relationship_type ?? "biological"),
            })
          );

          const existingIds = new Set(persons.map((p) => p.id));
          let newCount = 0;
          let updateCount = 0;
          let unchangedCount = 0;
          for (const ip of importedPersons) {
            if (!existingIds.has(ip.id)) {
              newCount++;
            } else {
              const existing = persons.find((p) => p.id === ip.id);
              if (existing && JSON.stringify(existing) === JSON.stringify(ip)) {
                unchangedCount++;
              } else {
                updateCount++;
              }
            }
          }

          setImportPreview({
            persons: importedPersons,
            unions: importedUnions,
            edges: importedEdges,
            newCount,
            updateCount,
            unchangedCount,
          });
          setImporting(true);
        } catch {
          alert("Invalid JSON file. Please check the format.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [persons]
  );

  const handleImportConfirm = useCallback(() => {
    if (importPreview && onImportTree) {
      onImportTree(importPreview.persons, importPreview.unions, importPreview.edges);
    }
    setImporting(false);
    setImportPreview(null);
  }, [importPreview, onImportTree]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--parchment-dim)]"
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="M10 10l3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search persons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
          />
        </div>
        <span className="text-xs font-body text-[var(--parchment-dim)]">
          {sorted.length} of {persons.length} persons
        </span>
        <div className="flex-1" />
        <button
          onClick={handleExportJSON}
          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--popover-border)] text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors font-body"
        >
          Export JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--popover-border)] text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors font-body"
        >
          Export CSV
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="px-3 py-1.5 text-xs rounded-lg bg-[var(--accent-emerald)]/20 border border-[var(--accent-emerald)]/40 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/30 transition-colors font-body"
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleImportFile}
          className="hidden"
        />
      </div>

      {/* Import Preview Modal */}
      {importing && importPreview && (
        <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--panel-border)] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-display text-lg text-[var(--thread-gold)]">Import Preview</h3>
            <div className="space-y-2 text-sm font-body text-[var(--parchment)]">
              <p>
                <span className="text-[var(--accent-emerald)]">{importPreview.newCount}</span> new
                persons
              </p>
              <p>
                <span className="text-[var(--thread-gold)]">{importPreview.updateCount}</span>{" "}
                updated persons
              </p>
              <p>
                <span className="text-[var(--parchment-dim)]">{importPreview.unchangedCount}</span>{" "}
                unchanged
              </p>
              <p>
                {importPreview.unions.length} unions / {importPreview.edges.length} parent edges
              </p>
            </div>
            <p className="text-xs font-body text-[var(--ember-red)]">
              This will replace ALL current tree data. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setImporting(false);
                  setImportPreview(null);
                }}
                className="px-4 py-2 text-xs rounded-lg bg-white/5 text-[var(--parchment-dim)] hover:bg-white/10 transition-colors font-body"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                className="px-4 py-2 text-xs rounded-lg bg-[var(--ember-red)]/20 border border-[var(--ember-red)]/40 text-[var(--ember-red)] hover:bg-[var(--ember-red)]/30 transition-colors font-body"
              >
                Import & Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto rounded-xl border border-[var(--panel-border)] bg-[var(--tapestry-bg-alt)]/50 shadow-lg max-h-[calc(100vh-220px)]">
        <table className="w-full border-collapse text-xs font-body">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[var(--tapestry-bg)] border-b border-[var(--panel-border)]">
              <th className="sticky left-0 z-30 bg-[var(--tapestry-bg)] px-2 py-2.5 text-left text-[var(--thread-gold)] font-semibold border-r border-[var(--panel-border)] min-w-[44px]">
                #
              </th>
              {ALL_COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`px-2 py-2.5 text-left text-[var(--thread-gold)] font-semibold border-r border-[var(--panel-border)] last:border-r-0 cursor-pointer hover:bg-[var(--thread-gold)]/10 transition-colors select-none ${col.key === "parents" || col.key === "partners" || col.key === "children" ? "bg-[var(--tapestry-bg-alt)]" : ""}`}
                  style={{ minWidth: col.width }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((person, idx) => {
              const rels = getRelations(person.id, persons, unions, edges);
              return (
                <tr
                  key={person.id}
                  className={`border-b border-[var(--thread-gold-dim)]/10 hover:bg-[var(--thread-gold)]/5 transition-colors ${idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}`}
                >
                  <td className="sticky left-0 z-10 bg-[var(--tapestry-bg-alt)] px-2 py-1.5 text-[var(--parchment-dim)] border-r border-[var(--panel-border)] font-mono">
                    {serialMap.get(person.id) ?? ""}
                  </td>
                  {/* Photo */}
                  <td className="px-2 py-1.5 border-r border-[var(--panel-border)]">
                    <PhotoCell url={person.photoUrl} name={person.fullName} />
                  </td>
                  {/* Editable person fields */}
                  {PERSON_COLS.filter((c) => c.key !== "photo").map((col) => (
                    <td
                      key={col.key}
                      className="px-0 py-0 border-r border-[var(--panel-border)] last:border-r-0"
                    >
                      <EditableCell
                        value={(person as unknown as Record<string, string | number | boolean | null>)[col.key]}
                        type={col.type as "text" | "number" | "boolean"}
                        onSave={(val) => handleSaveField(person.id, col.key, val)}
                      />
                    </td>
                  ))}
                  {/* Computed relationship columns */}
                  <td className="px-2 py-1.5 border-r border-[var(--panel-border)] bg-[var(--tapestry-bg-alt)]/50">
                    <span className="text-[var(--parchment-dim)] text-[11px]">
                      {rels.parents.join("; ") || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 border-r border-[var(--panel-border)] bg-[var(--tapestry-bg-alt)]/50">
                    <span className="text-[var(--parchment-dim)] text-[11px]">
                      {rels.partners.join("; ") || "—"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 bg-[var(--tapestry-bg-alt)]/50">
                    <span className="text-[var(--parchment-dim)] text-[11px]">
                      {rels.children.join("; ") || "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function csvEscape(val: string | null | undefined): string {
  if (!val) return "";
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
