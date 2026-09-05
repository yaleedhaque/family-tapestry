"use client";

import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import { findDualParentConflicts, type Gender } from "@/lib/parentRules";

/* ── Pure relation helpers (mirror useTreeCrud.ai semantics) ───────────── */

export function nextUnionId(unions: UnionLike[]): string {
  let max = 0;
  for (const u of unions) {
    const n = parseInt(u.id.replace(/\D/g, ""), 10);
    if (n > max) max = n;
  }
  return `u${max + 1}`;
}

export function findParentUnion(unions: UnionLike[], personId: string): UnionLike | undefined {
  const couple = unions.find(
    (u) => (u.partnerA === personId || u.partnerB === personId) && u.partnerB
  );
  return couple ?? unions.find((u) => u.partnerA === personId || u.partnerB === personId);
}

function genderByIdOf(persons: PersonLike[]): Map<string, Gender> {
  return new Map(persons.map((p) => [p.id, (p.gender as Gender) ?? ""]));
}

/** Would attaching a NEW biological edge (unionId→childId) create a second bio mother/father? */
function bioConflict(
  unions: UnionLike[],
  edges: EdgeLike[],
  persons: PersonLike[],
  childId: string,
  unionId: string,
  rel?: string
): boolean {
  if (rel && rel !== "biological") return false;
  const exists = edges.some((e) => e.unionId === unionId && e.childId === childId);
  const finalEdges = exists
    ? edges
    : [...edges, { unionId, childId, relationshipType: "biological" }];
  const conflicts = findDualParentConflicts(
    unions.map((u) => ({ id: u.id, partnerA: u.partnerA, partnerB: u.partnerB })),
    finalEdges.map((e) => ({
      unionId: e.unionId,
      childId: e.childId,
      relationshipType: e.relationshipType,
    })),
    genderByIdOf(persons)
  );
  return conflicts.some((c) => c.childId === childId);
}

function newSingleUnion(unions: UnionLike[], parentId: string): { union: UnionLike; id: string } {
  const id = nextUnionId(unions);
  return {
    union: {
      id,
      partnerA: parentId,
      partnerB: "",
      type: "marriage",
      startYear: null,
      endYear: null,
    },
    id,
  };
}

/** Add parent T to child C (mirrors useTreeCrud.handleAddParent). Returns null on gender conflict. */
export function commitAddParent(
  unions: UnionLike[],
  edges: EdgeLike[],
  persons: PersonLike[],
  childId: string,
  parentId: string,
  rel: string
): { unions: UnionLike[]; edges: EdgeLike[] } | null {
  const childUnionId =
    rel === "biological"
      ? edges.find(
          (e) => e.childId === childId && (e.relationshipType ?? "biological") === "biological"
        )?.unionId
      : undefined;
  const childUnion = childUnionId ? unions.find((u) => u.id === childUnionId) : undefined;
  const parentUnion = unions.find(
    (u) => (u.partnerA === parentId || u.partnerB === parentId) && !childUnion
  );
  const targetUnion = childUnion ?? parentUnion;
  if (targetUnion) {
    const isExistingPartner =
      targetUnion.partnerA === parentId || targetUnion.partnerB === parentId;
    // A child whose biological couple union is already full cannot gain a third bio parent.
    if (rel === "biological" && childUnion && childUnion.partnerB && !isExistingPartner) {
      return null;
    }
    // Prospective couple (single → couple) so the conflict check sees the merged genders.
    const prospectiveUnions =
      rel === "biological" && childUnion && !childUnion.partnerB && !isExistingPartner
        ? unions.map((u) => (u.id === childUnion.id ? { ...u, partnerB: parentId } : u))
        : unions;
    if (bioConflict(prospectiveUnions, edges, persons, childId, targetUnion.id, rel)) {
      return null;
    }
    // Merge a second biological parent into the child's single-parent union.
    if (rel === "biological" && childUnion && !childUnion.partnerB && !isExistingPartner) {
      const merged: UnionLike = { ...childUnion, partnerB: parentId };
      return {
        unions: unions.map((u) => (u.id === merged.id ? merged : u)),
        edges: edges.map((e) =>
          e.childId === childId && e.unionId === childUnion.id
            ? { ...e, relationshipType: rel }
            : e
        ),
      };
    }
    const newEdge = { unionId: targetUnion.id, childId, relationshipType: rel };
    const newEdges = edges.some((e) => e.unionId === targetUnion.id && e.childId === childId)
      ? edges
      : [...edges, newEdge];
    return { unions, edges: newEdges };
  }
  const { union, id } = newSingleUnion(unions, parentId);
  return {
    unions: [...unions, union],
    edges: [...edges, { unionId: id, childId, relationshipType: rel }],
  };
}

/** Add child C to parent P (mirrors useTreeCrud.handleAddChild — attaches to P's couple/single union). */
export function commitAddChild(
  unions: UnionLike[],
  edges: EdgeLike[],
  parentId: string,
  childId: string,
  rel: string
): { unions: UnionLike[]; edges: EdgeLike[] } {
  const union = findParentUnion(unions, parentId);
  if (union) {
    const newEdge = { unionId: union.id, childId, relationshipType: rel };
    const newEdges = edges.some((e) => e.unionId === union.id && e.childId === childId)
      ? edges
      : [...edges, newEdge];
    return { unions, edges: newEdges };
  }
  const { union: nu, id } = newSingleUnion(unions, parentId);
  return {
    unions: [...unions, nu],
    edges: [...edges, { unionId: id, childId, relationshipType: rel }],
  };
}

export function commitAddPartner(
  unions: UnionLike[],
  edges: EdgeLike[],
  selfId: string,
  partnerId: string,
  type: string,
  startYear: number | null
): { unions: UnionLike[]; edges: EdgeLike[] } {
  const id = nextUnionId(unions);
  return {
    unions: [
      ...unions,
      { id, partnerA: selfId, partnerB: partnerId, type, startYear, endYear: null },
    ],
    edges,
  };
}

/** Disconnect one parent-relationship (mirrors useTreeCrud.handleRemoveLink "child"): keeps the child on the other parent if the union is a couple. */
export function commitRemoveParent(
  unions: UnionLike[],
  edges: EdgeLike[],
  childId: string,
  parentId: string
): { unions: UnionLike[]; edges: EdgeLike[] } {
  const edge = edges.find(
    (e) =>
      e.childId === childId &&
      unions.some(
        (u) => u.id === e.unionId && (u.partnerA === parentId || u.partnerB === parentId)
      )
  );
  if (!edge) return { unions, edges };
  const union = unions.find((u) => u.id === edge.unionId);
  const other = union ? (union.partnerA === parentId ? union.partnerB : union.partnerA) : "";
  let nextEdges = edges.filter((e) => !(e.unionId === edge.unionId && e.childId === childId));
  let nextUnions = unions;
  if (union && other) {
    const existingSingle = unions.find(
      (u) => u.id !== edge.unionId && u.partnerA === other && !u.partnerB
    );
    if (existingSingle) {
      nextEdges = [
        ...nextEdges,
        {
          unionId: existingSingle.id,
          childId,
          relationshipType: edge.relationshipType ?? "biological",
        },
      ];
    } else {
      const { union: nu, id } = newSingleUnion(unions, other);
      nextUnions = [...unions, nu];
      nextEdges = [
        ...nextEdges,
        { unionId: id, childId, relationshipType: edge.relationshipType ?? "biological" },
      ];
    }
  }
  return { unions: nextUnions, edges: nextEdges };
}

export function commitRemovePartner(
  unions: UnionLike[],
  edges: EdgeLike[],
  unionId: string
): { unions: UnionLike[]; edges: EdgeLike[] } {
  return {
    unions: unions.filter((u) => u.id !== unionId),
    edges: edges.filter((e) => e.unionId !== unionId),
  };
}

export function commitEditEdgeRel(
  edges: EdgeLike[],
  unionId: string,
  childId: string,
  rel: string
): EdgeLike[] {
  const valid = ["biological", "adopted", "step"].includes(rel) ? rel : "biological";
  return edges.map((e) =>
    e.unionId === unionId && e.childId === childId ? { ...e, relationshipType: valid } : e
  );
}

export function commitEditUnion(
  unions: UnionLike[],
  unionId: string,
  patch: Partial<Pick<UnionLike, "type" | "startYear" | "endYear">>
): UnionLike[] {
  return unions.map((u) => (u.id === unionId ? { ...u, ...patch } : u));
}

/* ── Row modeling (mirror InfoPanel relatedData) ───────────────────────── */

interface RelRow {
  key: string;
  label: string;
  sub: string;
}

function relRows(
  mode: "parents" | "partners" | "children",
  person: PersonLike,
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
): RelRow[] {
  const nameOf = (id: string) => persons.find((p) => p.id === id)?.fullName ?? "";
  const relTag = (rel?: string) => (rel === "adopted" ? " adopted" : rel === "step" ? " step" : "");

  if (mode === "partners") {
    const rows: RelRow[] = [];
    for (const u of unions) {
      if (u.partnerA !== person.id && u.partnerB !== person.id) continue;
      const otherId = u.partnerA === person.id ? u.partnerB : u.partnerA;
      const other = persons.find((p) => p.id === otherId);
      if (!other) continue;
      const sub =
        (u.type && u.type !== "marriage" ? u.type : "") +
        (u.startYear ? ` · ${u.startYear}` : "");
      rows.push({ key: u.id, label: other.fullName, sub });
    }
    return rows;
  }

  if (mode === "parents") {
    const rows: RelRow[] = [];
    for (const e of edges) {
      if (e.childId !== person.id) continue;
      const union = unions.find((u) => u.id === e.unionId);
      if (!union) continue;
      const pA = persons.find((p) => p.id === union.partnerA);
      const pB = union.partnerB ? persons.find((p) => p.id === union.partnerB) : undefined;
      if (pA) rows.push({ key: `${e.unionId}::${pA.id}`, label: pA.fullName, sub: relTag(e.relationshipType) });
      if (pB) rows.push({ key: `${e.unionId}::${pB.id}`, label: pB.fullName, sub: relTag(e.relationshipType) });
    }
    return rows;
  }

  const rows: RelRow[] = [];
  for (const e of edges) {
    const union = unions.find((u) => u.id === e.unionId);
    if (!union || (union.partnerA !== person.id && union.partnerB !== person.id)) continue;
    const child = persons.find((p) => p.id === e.childId);
    if (!child) continue;
    rows.push({
      key: `${e.unionId}::${e.childId}`,
      label: child.fullName,
      sub: relTag(e.relationshipType),
    });
  }
  return rows;
}

/* ── Cell component ─────────────────────────────────────────────────────── */

const ADD_LABELS = {
  parents: "Add parent",
  partners: "Add partner",
  children: "Add child",
} as const;

const REL_OPTIONS = [
  { value: "biological", label: "Biological" },
  { value: "adopted", label: "Adopted" },
  { value: "step", label: "Step" },
];

const UNION_TYPES = [
  { value: "marriage", label: "Marriage" },
  { value: "partnership", label: "Partnership" },
  { value: "divorced", label: "Divorced" },
];

type Pop =
  | { kind: "add" }
  | { kind: "edge"; unionId: string; childId: string; rel: string }
  | { kind: "union"; union: UnionLike };

interface Props {
  mode: "parents" | "partners" | "children";
  person: PersonLike;
  persons: PersonLike[];
  unions: UnionLike[];
  edges: EdgeLike[];
  onSave: (unions: UnionLike[], edges: EdgeLike[]) => void;
}

export default function RelationEditorCell({
  mode,
  person,
  persons,
  unions,
  edges,
  onSave,
}: Props) {
  const [anchor, setAnchor] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addRel, setAddRel] = useState("biological");
  const [addType, setAddType] = useState("marriage");
  const [addStart, setAddStart] = useState("");
  const [editRel, setEditRel] = useState("biological");
  const [editType, setEditType] = useState("marriage");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [error, setError] = useState("");
  const popId = useRef(`rel-pop-${Math.random().toString(36).slice(2)}`).current;

  const rows = useMemo(
    () => relRows(mode, person, persons, unions, edges),
    [mode, person, persons, unions, edges]
  );
  const relatedIds = useMemo(() => {
    const set = new Set<string>();
    if (mode === "partners") {
      for (const u of unions) {
        if (u.partnerA === person.id) set.add(u.partnerB);
        else if (u.partnerB === person.id) set.add(u.partnerA);
      }
    } else if (mode === "parents") {
      for (const e of edges) {
        if (e.childId !== person.id) continue;
        const u = unions.find((x) => x.id === e.unionId);
        if (!u) continue;
        set.add(u.partnerA);
        if (u.partnerB) set.add(u.partnerB);
      }
    } else {
      for (const e of edges) {
        const u = unions.find((x) => x.id === e.unionId);
        if (!u || (u.partnerA !== person.id && u.partnerB !== person.id)) continue;
        set.add(e.childId);
      }
    }
    return set;
  }, [mode, person, persons, unions, edges]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return persons.filter(
      (p) =>
        p.id !== person.id &&
        !relatedIds.has(p.id) &&
        (!q || p.fullName.toLowerCase().includes(q))
    );
  }, [persons, person.id, relatedIds, query]);

  const commit = (nextUnions: UnionLike[], nextEdges: EdgeLike[]) => {
    onSave(nextUnions, nextEdges);
    closePop();
  };

  const closePop = () => {
    setPop(null);
    setAnchor(null);
    setQuery("");
    setSelectedId(null);
    setError("");
  };

  const openPop = (
    e: React.MouseEvent<HTMLButtonElement>,
    nextPop: Pop,
    editedRel?: string,
    editedUnion?: UnionLike
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = 300;
    const h = mode === "partners" ? 360 : 340;
    const left = Math.max(8, Math.min(rect.left, vw - w - 8));
    const above = rect.bottom + 6 + h > vh - 8;
    setAnchor({ top: above ? rect.top - h - 6 : rect.bottom + 6, left, above });
    setPop(nextPop);
    setQuery("");
    setSelectedId(null);
    setError("");
    if (nextPop.kind === "edge") {
      setEditRel(editedRel ?? "biological");
    } else if (nextPop.kind === "union" && editedUnion) {
      setEditType(editedUnion.type ?? "marriage");
      setEditStart(editedUnion.startYear != null ? String(editedUnion.startYear) : "");
      setEditEnd(editedUnion.endYear != null ? String(editedUnion.endYear) : "");
    } else {
      setAddRel("biological");
      setAddType("marriage");
      setAddStart("");
    }
  };

  const handleAddLink = () => {
    if (!selectedId) return;
    let result: { unions: UnionLike[]; edges: EdgeLike[] } | null = null;
    if (mode === "parents") {
      result = commitAddParent(unions, edges, persons, person.id, selectedId, addRel);
      if (!result) {
        setError("Child already has a biological parent of that gender — add as Step/Adopted.");
        return;
      }
      commit(result.unions, result.edges);
    } else if (mode === "children") {
      result = commitAddChild(unions, edges, person.id, selectedId, addRel);
      commit(result.unions, result.edges);
    } else {
      const startYear = addStart.trim() === "" ? null : Number(addStart);
      result = commitAddPartner(unions, edges, person.id, selectedId, addType, startYear);
      commit(result.unions, result.edges);
    }
  };

  const handleRemoveRow = (row: RelRow) => {
    if (mode === "partners") {
      const children = edges.filter((e) => e.unionId === row.key).length;
      const msg =
        children > 0
          ? `Remove this partnership? This will also unlink ${children} child relation${children === 1 ? "" : "s"} attached to it. This cannot be undone.`
          : "Remove this partnership? This cannot be undone.";
      if (!window.confirm(msg)) return;
      const rem = commitRemovePartner(unions, edges, row.key);
      commit(rem.unions, rem.edges);
    } else if (mode === "parents") {
      const [, parentId] = row.key.split("::");
      if (!window.confirm(`Remove ${row.label} as a parent of ${person.fullName}?`)) return;
      const rem = commitRemoveParent(unions, edges, person.id, parentId);
      commit(rem.unions, rem.edges);
    } else {
      const [, childId] = row.key.split("::");
      if (!window.confirm(`Remove ${row.label} as a child of ${person.fullName}?`)) return;
      const rem = commitRemoveParent(unions, edges, childId, person.id);
      commit(rem.unions, rem.edges);
    }
  };

  const handleSaveEdit = () => {
    if (!pop) return;
    if (pop.kind === "edge") {
      const safe = ["biological", "adopted", "step"].includes(editRel) ? editRel : "biological";
      commit(unions, commitEditEdgeRel(edges, pop.unionId, pop.childId, safe));
    } else if (pop.kind === "union") {
      const startYear = editStart.trim() === "" ? null : Number(editStart);
      const endYear = editEnd.trim() === "" ? null : Number(editEnd);
      commit(
        commitEditUnion(unions, pop.union.id, {
          type: editType,
          startYear,
          endYear,
        }),
        edges
      );
    }
  };

  const buttonCls =
    "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-body border border-[var(--thread-gold-dim)]/30 bg-[var(--tapestry-bg)]/40 hover:bg-[var(--thread-gold)]/15 hover:border-[var(--thread-gold)]/50 transition-colors";

  return (
    <div className="flex flex-wrap items-start gap-1 min-w-[120px] max-w-[300px]">
      {rows.length === 0 && (
        <span className="text-[var(--parchment-dim)]/50 text-[11px] py-0.5 mr-1">—</span>
      )}
      {rows.map((row) => (
        <span
          key={row.key}
          className="inline-flex items-center gap-0.5 max-w-full bg-[var(--tapestry-bg)]/60 border border-[var(--thread-gold-dim)]/30 rounded-md pl-1.5 pr-1 py-0.5 text-[10px] font-body text-[var(--parchment)]"
          title={row.sub}
        >
          <span className="truncate max-w-[120px]">{row.label}</span>
          {row.sub && (
            <span className="text-[var(--thread-gold)]/80 whitespace-nowrap">{row.sub}</span>
          )}
          {mode === "parents" || mode === "children" ? (
            <button
              className="ml-0.5 text-[var(--parchment-dim)]/70 hover:text-[var(--thread-gold)]"
              aria-label={`Edit relationship with ${row.label}`}
              onClick={(e) =>
                {
                  const [unionId, relTargetId] = row.key.split("::");
                  const relevantEdge = edges.find(
                    (x) => x.unionId === unionId && x.childId === (mode === "parents" ? person.id : relTargetId)
                  );
                  openPop(e, { kind: "edge", unionId, childId: mode === "parents" ? person.id : relTargetId, rel: relevantEdge?.relationshipType ?? "biological" }, relevantEdge?.relationshipType ?? "biological");
                }
              }
            >
              ✎
            </button>
          ) : (
            <button
              className="ml-0.5 text-[var(--parchment-dim)]/70 hover:text-[var(--thread-gold)]"
              aria-label={`Edit partnership with ${row.label}`}
              onClick={(e) =>
                {
                  const union = unions.find((u) => u.id === row.key);
                  if (union) openPop(e, { kind: "union", union }, undefined, union);
                }
              }
            >
              ✎
            </button>
          )}
          <button
            className="ml-0.5 text-[var(--parchment-dim)]/70 hover:text-[var(--ember-red)]"
            aria-label={`Remove ${row.label}`}
            onClick={() => handleRemoveRow(row)}
          >
            ×
          </button>
        </span>
      ))}
      <button
        className={buttonCls}
        onClick={(e) => openPop(e, { kind: "add" })}
        aria-haspopup="dialog"
        aria-expanded={pop?.kind === "add"}
        aria-controls={popId}
      >
        + {ADD_LABELS[mode]}
      </button>

      {anchor && pop && (
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[190]"
              onClick={closePop}
              aria-hidden="true"
            />
            <div
              id={popId}
              role="dialog"
              aria-label={`Edit ${mode} for ${person.fullName}`}
              className="fixed z-[200] w-[300px] max-h-[380px] overflow-y-auto rounded-xl border border-[var(--panel-border)] bg-[var(--tapestry-bg-alt)] shadow-[var(--shadow-xl)] p-3 flex flex-col gap-2.5 text-xs font-body"
              style={{ top: anchor.top, left: anchor.left }}
            >
              {pop.kind === "add" ? (
                <>
                  <div className="font-display text-sm text-[var(--thread-gold)]">
                    {ADD_LABELS[mode]}
                  </div>
                  <div className="relative">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--parchment-dim)]"
                    >
                      <circle cx="6.5" cy="6.5" r="4.5" />
                      <path d="M10 10l3.5 3.5" strokeLinecap="round" />
                    </svg>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setSelectedId(null);
                      }}
                      placeholder="Search persons…"
                      autoFocus
                      className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
                    />
                  </div>
                  {error && (
                    <p className="text-[var(--ember-red)] text-[11px]">{error}</p>
                  )}
                  <ul className="space-y-0.5 max-h-[150px] overflow-y-auto" role="listbox" aria-label="People">
                    {candidates.length === 0 && (
                      <li className="text-[var(--parchment-dim)]/60 text-[11px] px-1 py-1">
                        No matching person.
                      </li>
                    )}
                    {candidates.slice(0, 30).map((p) => (
                      <li key={p.id} role="option">
                        <button
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={`w-full text-left px-2 py-1 rounded-md hover:bg-[var(--thread-gold)]/10 transition-colors ${selectedId === p.id ? "bg-[var(--thread-gold)]/15 ring-1 ring-[var(--thread-gold)]/40" : ""}`}
                        >
                          <span className="text-[var(--parchment)]">{p.fullName}</span>
                          {p.gender && (
                            <span className="text-[var(--parchment-dim)]/70 ml-1.5">
                              {p.gender}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>

                  {selectedId && (
                    <div className="border-t border-[var(--panel-border)] pt-2 space-y-2">
                      <div className="text-[var(--parchment)]">
                        Link{" "}
                        <span className="text-[var(--thread-gold)]">
                          {persons.find((p) => p.id === selectedId)?.fullName}
                        </span>
                      </div>
                      {mode === "partners" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={addType}
                            onChange={(e) => setAddType(e.target.value)}
                            className="px-1.5 py-1 rounded-md bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] focus:outline-none"
                          >
                            {UNION_TYPES.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[var(--parchment-dim)]">
                            From
                            <input
                              type="number"
                              value={addStart}
                              onChange={(e) => setAddStart(e.target.value)}
                              placeholder="Year"
                              className="w-[64px] px-1.5 py-1 rounded-md bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] focus:outline-none"
                            />
                          </label>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {REL_OPTIONS.map((o) => (
                            <label
                              key={o.value}
                              className={`px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                                addRel === o.value
                                  ? "border-[var(--thread-gold)] bg-[var(--thread-gold)]/15 text-[var(--parchment)]"
                                  : "border-[var(--thread-gold-dim)]/30 text-[var(--parchment-dim)] hover:border-[var(--thread-gold)]/50"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`addrel-${popId}`}
                                className="sr-only"
                                checked={addRel === o.value}
                                onChange={() => setAddRel(o.value)}
                              />
                              {o.label}
                            </label>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleAddLink}
                        className="w-full py-1.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-medium hover:opacity-90 transition-opacity"
                      >
                        Link {ADD_LABELS[mode].replace("Add ", "")}
                      </button>
                    </div>
                  )}
                </>
              ) : pop.kind === "edge" ? (
                <>
                  <div className="font-display text-sm text-[var(--thread-gold)]">
                    Edit relationship
                  </div>
                  <div className="text-[var(--parchment-dim)]">
                    {mode === "parents" ? "Parent" : "Child"}{" "}
                    relationship for{" "}
                    <span className="text-[var(--parchment)]">
                      {mode === "parents"
                        ? persons.find((p) => p.id === pop.childId)?.fullName ?? person.fullName
                        : persons.find((p) => p.id === pop.childId)?.fullName ?? person.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {REL_OPTIONS.map((o) => (
                      <label
                        key={o.value}
                        className={`px-2 py-1 rounded-md border cursor-pointer transition-colors ${
                          editRel === o.value
                            ? "border-[var(--thread-gold)] bg-[var(--thread-gold)]/15 text-[var(--parchment)]"
                            : "border-[var(--thread-gold-dim)]/30 text-[var(--parchment-dim)] hover:border-[var(--thread-gold)]/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`editrel-${popId}`}
                          className="sr-only"
                          checked={editRel === o.value}
                          onChange={() => setEditRel(o.value)}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closePop}
                      className="flex-1 py-1.5 rounded-lg border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="flex-1 py-1.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-medium hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display text-sm text-[var(--thread-gold)]">
                    Edit partnership
                  </div>
                  <div className="text-[var(--parchment-dim)]">
                    {persons.find((p) => p.id === pop.union.partnerA)?.fullName ?? ""}
                    {pop.union.partnerB ? " & " + (persons.find((p) => p.id === pop.union.partnerB)?.fullName ?? "") : ""}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="px-1.5 py-1 rounded-md bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] focus:outline-none"
                    >
                      {UNION_TYPES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[var(--parchment-dim)]">
                      From
                      <input
                        type="number"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        placeholder="Year"
                        className="w-[64px] px-1.5 py-1 rounded-md bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] focus:outline-none"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[var(--parchment-dim)]">
                      To
                      <input
                        type="number"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        placeholder="Year"
                        className="w-[64px] px-1.5 py-1 rounded-md bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] focus:outline-none"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closePop}
                      className="flex-1 py-1.5 rounded-lg border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="flex-1 py-1.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-medium hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                  </div>
                </>
              )}
            </div>
          </>,
          document.body
        )
      )}
    </div>
  );
}