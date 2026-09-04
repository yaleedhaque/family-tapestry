"use client";

import { useState, useMemo } from "react";
import type { Source } from "@/data/family";
import { useLang } from "@/lib/i18n";
import { sanitizeField, validateEmail, validateUrl, validateYear, cachedPhotoUrl } from "@/lib/validation";
import { findDualParentConflicts, type Gender } from "@/lib/parentRules";
import { RelSection } from "@/components/RelSection";
import { SourcesTab } from "@/components/SourcesTab";
import { ProfileTab } from "@/components/ProfileTab";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
export interface PersonLike {
  id: string;
  fullName: string;
  nameNative?: string | null;
  gender?: string;
  birthYear: number | null;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  lat: number | null;
  lng: number | null;
  photoUrl: string;
  updatedAt?: string | null;
  createdBy?: string | null;
}

export interface UnionLike {
  id: string;
  partnerA: string;
  partnerB: string;
  type: string;
  startYear: number | null;
  endYear: number | null;
  createdBy?: string | null;
}

export interface EdgeLike {
  unionId: string;
  childId: string;
  relationshipType?: string;
  createdBy?: string | null;
}

interface InfoPanelProps {
  person: PersonLike | null;
  persons: PersonLike[];
  unions: UnionLike[];
  parentEdges: EdgeLike[];
  onClose: () => void;
  onUpdatePerson: (person: PersonLike) => void;
  onDeletePerson: (personId: string) => void;
  onAddPartner: (personId: string, partnerId: string, unionType: string, startYear: number | null) => void;
  onUpdateUnion: (union: UnionLike) => void;
  onAddChild: (personId: string, childId: string, relationshipType?: string) => void;
  onAddParent: (childId: string, parentId: string, relationshipType?: string) => void;
  onUpdateEdgeType: (unionId: string, childId: string, relationshipType: string) => void;
  onCreatePersonAndLink: (
    newPerson: PersonLike,
    linkType: "partner" | "child" | "parent",
    relatedToId: string,
    unionType?: string,
    startYear?: number | null,
    relationshipType?: string,
  ) => void;
  onRemoveLink: (linkType: "partner" | "child", fromId: string, toId: string) => void;
  onSetSingleParent: (childId: string, parentId: string) => void;
  nextPersonId: () => string;
  onNavigate: (personId: string) => void;
  canEdit?: boolean;
  canEditPrivate?: boolean;
  canDelete?: boolean;
  locked?: boolean;
  sources?: Source[];
  onAddSource?: (source: Source) => void;
  onUpdateSource?: (source: Source) => void;
  onDeleteSource?: (sourceId: string) => void;
  nextSourceId?: () => string;
}

  type Tab = "profile" | "parents" | "partners" | "children" | "sources";

export default function InfoPanel({
  person,
  persons,
  unions,
  parentEdges,
  onClose,
  onUpdatePerson,
  onDeletePerson,
  onAddPartner,
  onUpdateUnion,
  onAddChild,
  onAddParent,
  onUpdateEdgeType,
  onCreatePersonAndLink,
  onRemoveLink,
  onSetSingleParent,
  nextPersonId,
  onNavigate,
  canEdit = true,
  canEditPrivate = true,
  canDelete = true,
  locked = false,
  sources = [],
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  nextSourceId,
}: InfoPanelProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { t } = useLang();

  const [photoLoading, setPhotoLoading] = useState(false);

  const [addMode, setAddMode] = useState<"existing" | "new" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPersonFields, setNewPersonFields] = useState({ fullName: "", birthYear: "", birthPlace: "", profession: "", email: "", phone: "", address: "", website: "", gender: "" });
  const [newUnionType, setNewUnionType] = useState("marriage");
  const [newStartYear, setNewStartYear] = useState("");
  const [newRelType, setNewRelType] = useState("biological");
  const [editingUnionId, setEditingUnionId] = useState<string | null>(null);
  const [editUnionType, setEditUnionType] = useState("marriage");
  const [editStartYear, setEditStartYear] = useState("");
  const [editEndYear, setEditEndYear] = useState("");
  const [editingEdgeKey, setEditingEdgeKey] = useState<string | null>(null);
  const [editEdgeRel, setEditEdgeRel] = useState("biological");

  // --- -- -- -- -- --
  // Parent role labels tie into the "no two mothers" rule: each parent shows a
  // role tag (Mother / Father / Step Mother / Adopted Father) that reflects the
  // parent edge's relationship type and the person's gender.
  // --- -- -- -- -- --
  function parentRoleLabel(gender: string | undefined, relType: string | undefined): string {
    const role = gender === "female" ? "mother" : gender === "male" ? "father" : "parent";
    const prefix = relType === "step" ? "step" : relType === "adopted" ? "adopted" : "";
    const key = prefix
      ? `role.${prefix}${role[0].toUpperCase()}${role.slice(1)}`
      : `role.${role}`;
    return t(key as never);
  }

  const relatedData = useMemo(() => {
    if (!person) return { parents: [], partners: [], children: [] };

    const partners: { person: PersonLike; union: UnionLike }[] = [];
    for (const u of unions) {
      if (u.partnerA === person.id) {
        const p = persons.find((pp) => pp.id === u.partnerB);
        if (p) partners.push({ person: p, union: u });
      } else if (u.partnerB === person.id) {
        const p = persons.find((pp) => pp.id === u.partnerA);
        if (p) partners.push({ person: p, union: u });
      }
    }

    const parents: { person: PersonLike; relType: string; role: string; unionId: string }[] = [];
    for (const pe of parentEdges) {
      if (pe.childId === person.id) {
        const union = unions.find((u) => u.id === pe.unionId);
        if (union) {
          const relType = pe.relationshipType ?? "biological";
          const pA = persons.find((p) => p.id === union.partnerA);
          const pB = persons.find((p) => p.id === union.partnerB);
          if (pA) parents.push({ person: pA, relType, role: parentRoleLabel(pA.gender, relType), unionId: pe.unionId });
          if (pB) parents.push({ person: pB, relType, role: parentRoleLabel(pB.gender, relType), unionId: pe.unionId });
        }
      }
    }

    const children: { person: PersonLike; edge: EdgeLike }[] = [];
    for (const pe of parentEdges) {
      const union = unions.find((u) => u.id === pe.unionId);
      if (union && (union.partnerA === person.id || union.partnerB === person.id)) {
        const child = persons.find((p) => p.id === pe.childId);
        if (child) children.push({ person: child, edge: pe });
      }
    }

    return { parents, partners, children };
  }, [person, persons, unions, parentEdges]);

  const searchResults = useMemo(() => {
    if (!person || !searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return persons.filter((p) => p.id !== person.id && p.fullName.toLowerCase().includes(q));
  }, [person, persons, searchQuery]);

  // Audit: does THIS person already carry two known biological mothers/fathers?
  const hasDualBioParents = useMemo(() => {
    if (!person) return false;
    const genderById = new Map<string, Gender>(
      persons.map((p) => [p.id, (p.gender as Gender) ?? ""])
    );
    const conflicts = findDualParentConflicts(
      unions.map((u) => ({ id: u.id, partnerA: u.partnerA, partnerB: u.partnerB })),
      parentEdges.map((e) => ({ unionId: e.unionId, childId: e.childId, relationshipType: e.relationshipType })),
      genderById
    );
    return conflicts.some((c) => c.childId === person.id);
  }, [person, persons, unions, parentEdges]);

  if (!person) return null;

  const resetAdd = () => {
    setAddMode(null);
    setSearchQuery("");
    setNewPersonFields({ fullName: "", birthYear: "", birthPlace: "", profession: "", email: "", phone: "", address: "", website: "", gender: "" });
    setNewStartYear("");
    setNewRelType("biological");
    setEditingUnionId(null);
  };

  const switchTab = (t: Tab) => { setTab(t); resetAdd(); };

  const saveProfile = () => {
    const fullName = sanitizeField("fullName", fields.fullName ?? person.fullName);
    if (!fullName) return;
    const birthYear = fields.birthYear ? Number(fields.birthYear) : person.birthYear;
    const deathYear = fields.deathYear !== undefined ? (fields.deathYear === "" ? null : Number(fields.deathYear)) : person.deathYear;
    if (!validateYear(birthYear) || !validateYear(deathYear)) return;
    const email = sanitizeField("email", fields.email ?? person.email);
    if (email && !validateEmail(email)) return;
    const website = sanitizeField("website", fields.website ?? person.website);
    if (website && !validateUrl(website)) return;

    onUpdatePerson({
      ...person,
      fullName,
      birthYear,
      deathYear,
      isAlive: deathYear == null,
      birthPlace: sanitizeField("birthPlace", fields.birthPlace ?? person.birthPlace),
      profession: sanitizeField("profession", fields.profession ?? person.profession),
      bio: sanitizeField("bio", fields.bio ?? person.bio),
      email,
      phone: sanitizeField("phone", fields.phone ?? person.phone),
      address: sanitizeField("address", fields.address ?? person.address),
      website,
      nameNative: sanitizeField("nameNative", fields.nameNative ?? person.nameNative ?? ""),
      gender: (fields.gender ?? person.gender ?? "").trim(),
    });
    setIsEditing(false);
    setFields({});
  };

  const handleCreateAndLink = () => {
    const fullName = sanitizeField("fullName", newPersonFields.fullName);
    if (!fullName) return;
    const id = nextPersonId();
const np: PersonLike = {
      id,
      fullName,
      gender: (newPersonFields.gender ?? "").trim() as Gender,
      birthYear: newPersonFields.birthYear ? Number(newPersonFields.birthYear) : null,
      deathYear: null,
      isAlive: true,
      bio: "",
      birthPlace: sanitizeField("birthPlace", newPersonFields.birthPlace),
      profession: sanitizeField("profession", newPersonFields.profession),
      email: sanitizeField("email", newPersonFields.email),
      phone: sanitizeField("phone", newPersonFields.phone),
      address: sanitizeField("address", newPersonFields.address),
      website: sanitizeField("website", newPersonFields.website),
      lat: null,
      lng: null,
      photoUrl: "",
    };
    if (tab === "partners") onCreatePersonAndLink(np, "partner", person.id, newUnionType, newStartYear ? Number(newStartYear) : null);
    else if (tab === "children") onCreatePersonAndLink(np, "child", person.id, undefined, undefined, newRelType);
    else if (tab === "parents") onCreatePersonAndLink(np, "parent", person.id, undefined, undefined, newRelType);
    resetAdd();
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "profile", label: t("info.profile"), count: 0 },
    { key: "parents", label: t("info.parents"), count: relatedData.parents.length },
    { key: "partners", label: t("info.partners"), count: relatedData.partners.length },
    { key: "children", label: t("info.children"), count: relatedData.children.length },
    { key: "sources", label: t("info.sources"), count: sources.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-[var(--tapestry-bg-alt)] border-l border-[var(--thread-gold-dim)] z-50 flex flex-col overflow-hidden shadow-[-8px_0_32px_rgba(0,0,0,0.5)] max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:h-[72vh] max-md:max-h-[72vh] max-md:w-full max-md:max-w-full max-md:border-l-0 max-md:border-t max-md:rounded-t-3xl max-md:shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        {/* Mobile drag handle + close row */}
        <div className="hidden max-md:flex items-center justify-between px-4 pt-3 pb-1 relative">
          <div className="w-10 h-1 rounded-full bg-[var(--thread-gold-dim)]/30 mx-auto" />
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="absolute right-3 top-1 w-11 h-11 flex items-center justify-center rounded-full bg-white/5 border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] hover:bg-white/10 transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Header with avatar — single close button lives here (§2.3 / §6.9) */}
        <div className="relative flex items-center gap-4 justify-center pt-4 pb-3 border-b border-[var(--thread-gold-dim)]/20 px-4">
          <button
            onClick={onClose}
            aria-label="Close profile"
            title="Close"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-white/5 border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] hover:bg-white/10 transition-colors text-sm"
          >
            ✕
          </button>

          <div
            className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full border-2 overflow-hidden flex items-center justify-center bg-[var(--tapestry-bg-alt)] ${
              person.isAlive
                ? "border-[var(--living-glow)] shadow-[0_0_16px_rgba(217,139,62,0.3)]"
                : "border-[var(--deceased-frame)] grayscale"
            }`}
          >
            {person.photoUrl ? (
              <img src={cachedPhotoUrl(person.photoUrl, person.updatedAt)} alt={person.fullName} className="w-full h-full object-cover" />
            ) : (
              <span
                className="font-display text-xl md:text-2xl font-bold select-none"
                style={{
                  color: person.isAlive ? "var(--thread-gold)" : "var(--deceased-frame)",
                  opacity: person.isAlive ? 0.9 : 0.6,
                }}
              >
                {getInitials(person.fullName)}
              </span>
            )}
          </div>
          <div className="min-w-0 text-left">
            <h2 className="font-display text-xl md:text-2xl font-semibold text-[var(--parchment)] leading-snug truncate">
              {person.fullName}
            </h2>
            {person.nameNative ? (
              <p className="font-display text-sm text-[var(--thread-gold)] mt-0.5 truncate" dir="auto">
                {person.nameNative}
              </p>
            ) : null}
            <p className="text-xs text-[var(--parchment-dim)] italic mt-0.5">
              {person.birthYear ? `${person.birthYear} – ` : ""}{person.deathYear ?? "present"}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div
          role="tablist"
          aria-label="Profile sections"
          className="flex items-center gap-1 px-4 py-2 border-b border-[var(--thread-gold-dim)]/20 overflow-x-auto"
          onKeyDown={(e) => {
            const idx = tabs.findIndex((t) => t.key === tab);
            if (e.key === "ArrowRight") {
              e.preventDefault();
              switchTab(tabs[(idx + 1) % tabs.length].key);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              switchTab(tabs[(idx - 1 + tabs.length) % tabs.length].key);
            }
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              id={`info-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls="info-tabpanel"
              tabIndex={tab === t.key ? 0 : -1}
              onClick={() => switchTab(t.key)}
              className={`px-3 py-1.5 rounded text-xs font-body whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-[var(--thread-gold)] text-[var(--tapestry-bg)]"
                  : "text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5"
              }`}
            >
              {t.label}
              {t.count > 0 && <span className="ml-1 opacity-60">{t.count}</span>}
            </button>
          ))}

          <div className="flex-1" />

          {canEdit && canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-2 py-1.5 rounded text-xs text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors whitespace-nowrap"
            >
              Delete
            </button>

          )}
        </div>

        {/* Scrollable content */}
        <div
          id="info-tabpanel"
          role="tabpanel"
          aria-labelledby={`info-tab-${tab}`}
          className="flex-1 overflow-y-auto px-5 py-4"
        >
          {/* ── Profile tab ── */}
          {tab === "profile" && (
            <ProfileTab
              person={person}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              fields={fields}
              setFields={setFields}
              canEdit={canEdit}
              canEditPrivate={canEditPrivate}
              locked={locked}
              photoLoading={photoLoading}
              setPhotoLoading={setPhotoLoading}
              onUpdatePerson={onUpdatePerson}
              saveProfile={saveProfile}
            />
          )}

          {/* ── Relationship tabs ── */}
          {tab === "parents" && (
            <>
              <RelSection
                items={relatedData.parents.map(({ person: p, relType, role, unionId }) => ({
                  id: p.id,
                  edge: { unionId, childId: person.id, relationshipType: relType },
                  label: p.fullName,
                  sub: `${role} · ${p.birthYear} – ${p.deathYear ?? "present"}`,
                  badge: relType === "step" ? "step" : relType === "adopted" ? "adopted" : undefined,
                }))}
                addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
                onSearch={setSearchQuery}
                onPickExisting={(id) => { onAddParent(person.id, id, newRelType); resetAdd(); }}
                onCreateNew={handleCreateAndLink}
                onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
                onStartAdd={setAddMode} onCancelAdd={resetAdd}
                onRemove={(id) => onRemoveLink("child", person.id, id)} personLabel="Parent"
                showRelType relType={newRelType} onRelTypeChange={setNewRelType}
                onNavigate={onNavigate}
                canEdit={canEdit}
                onEditEdge={(item) => {
                  setEditingEdgeKey(`${item.edge?.unionId}|${item.edge?.childId}`);
                  setEditEdgeRel(item.edge?.relationshipType ?? "biological");
                }}
                editingEdgeKey={editingEdgeKey}
                editEdgeRel={editEdgeRel} onEditEdgeRelChange={setEditEdgeRel}
                onSaveEdge={() => {
                  const e = relatedData.parents.find(({ unionId }) => `${unionId}|${person.id}` === editingEdgeKey);
                  if (e) onUpdateEdgeType(e.unionId, person.id, editEdgeRel);
                  setEditingEdgeKey(null);
                }}
                onCancelEditEdge={() => setEditingEdgeKey(null)}
                onSetSingleParent={canEdit ? (childId, parentId) => onSetSingleParent(childId, parentId) : undefined}
              />
              {hasDualBioParents && (
                <p className="text-[11px] text-[var(--ember-red)] bg-[var(--ember-red)]/10 rounded px-3 py-2 leading-relaxed">
                  ⚠️ This person already has two recorded biological parents of the same gender. Add the extra parent as <b>Step</b> or <b>Adopted</b> — those draw with a different-coloured line and are not limited.
                </p>
              )}
            </>
          )}

          {tab === "partners" && (
            <RelSection
              items={relatedData.partners.map((pp) => ({ id: pp.person.id, unionId: pp.union.id, label: pp.person.fullName, sub: `${pp.union.type} · ${pp.union.startYear ?? "?"} – ${pp.union.endYear ?? "present"}`, badge: pp.union.type === "divorced" ? "divorced" : undefined, union: pp.union }))}
              addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
              onSearch={setSearchQuery}
              onPickExisting={(id) => { onAddPartner(person.id, id, newUnionType, newStartYear ? Number(newStartYear) : null); resetAdd(); }}
              onCreateNew={handleCreateAndLink}
              onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
              onStartAdd={setAddMode} onCancelAdd={resetAdd}
              onRemove={(id) => onRemoveLink("partner", person.id, id)} personLabel="Partner"
              showUnionType unionType={newUnionType} onUnionTypeChange={setNewUnionType}
              startYear={newStartYear} onStartYearChange={setNewStartYear}
              onNavigate={onNavigate}
              onEditUnion={(item) => {
                setEditingUnionId(item.unionId ?? null);
                if (item.union) {
                  setEditUnionType(item.union.type);
                  setEditStartYear(item.union.startYear != null ? String(item.union.startYear) : "");
                  setEditEndYear(item.union.endYear != null ? String(item.union.endYear) : "");
                }
              }}
              editingUnionId={editingUnionId}
              editUnionType={editUnionType} onEditUnionTypeChange={setEditUnionType}
              editStartYear={editStartYear} onEditStartYearChange={setEditStartYear}
              editEndYear={editEndYear} onEditEndYearChange={setEditEndYear}
              onSaveUnion={() => {
                const target = relatedData.partners.find((pp) => pp.union.id === editingUnionId)?.union;
                if (target) {
                  onUpdateUnion({
                    ...target,
                    type: editUnionType,
                    startYear: editStartYear ? Number(editStartYear) : null,
                    endYear: editEndYear ? Number(editEndYear) : null,
                  });
                }
                setEditingUnionId(null);
              }}
              onCancelEditUnion={() => setEditingUnionId(null)}
            />
          )}

          {tab === "children" && (
            <RelSection
              items={relatedData.children.map(({ person: c, edge }) => ({
                id: c.id,
                edge: { unionId: edge.unionId, childId: edge.childId, relationshipType: edge.relationshipType ?? "biological" },
                label: c.fullName,
                sub: `${c.birthYear} – ${c.deathYear ?? "present"}`,
                badge: (edge.relationshipType ?? "biological") === "step" ? "step" : (edge.relationshipType ?? "biological") === "adopted" ? "adopted" : undefined,
              }))}
              addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
              onSearch={setSearchQuery}
              onPickExisting={(id) => { onAddChild(person.id, id, newRelType); resetAdd(); }}
              onCreateNew={handleCreateAndLink}
              onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
              onStartAdd={setAddMode} onCancelAdd={resetAdd}
              onRemove={(id) => onRemoveLink("child", person.id, id)} personLabel="Child"
              showRelType relType={newRelType} onRelTypeChange={setNewRelType}
              onNavigate={onNavigate}
              canEdit={canEdit}
              onEditEdge={(item) => {
                setEditingEdgeKey(`${item.edge?.unionId}|${item.edge?.childId}`);
                setEditEdgeRel(item.edge?.relationshipType ?? "biological");
              }}
              editingEdgeKey={editingEdgeKey}
              editEdgeRel={editEdgeRel} onEditEdgeRelChange={setEditEdgeRel}
              onSaveEdge={() => {
                const e = relatedData.children.find(({ edge }) => `${edge.unionId}|${edge.childId}` === editingEdgeKey)?.edge;
                if (e) onUpdateEdgeType(e.unionId, e.childId, editEdgeRel);
                setEditingEdgeKey(null);
              }}
              onCancelEditEdge={() => setEditingEdgeKey(null)}
            />
          )}

          {tab === "sources" && (
            <SourcesTab
              sources={sources}
              canEdit={canEdit}
              onAdd={(s) => onAddSource?.(s)}
              onUpdate={(s) => onUpdateSource?.(s)}
              onDelete={(id) => onDeleteSource?.(id)}
              nextId={() => nextSourceId?.() ?? `src-${Date.now()}`}
              personId={person.id}
            />
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)]">
          <div className="bg-[var(--tapestry-bg-alt)] border border-[var(--ember-red)]/40 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-display text-lg text-[var(--parchment)] mb-2">Delete {person.fullName}?</h3>
            <p className="text-sm text-[var(--parchment-dim)] mb-5">This will remove the person and all their relationships from the tree. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">Cancel</button>
              <button onClick={() => { onDeletePerson(person.id); setShowDeleteConfirm(false); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-[var(--ember-red)] text-[var(--parchment)] hover:bg-[var(--ember-red)]/80 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
