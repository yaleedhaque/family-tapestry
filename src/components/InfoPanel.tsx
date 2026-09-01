"use client";

import { useState, useMemo } from "react";
import type { Source } from "@/data/family";
import { useLang } from "@/lib/i18n";
import { sanitizeField, validateEmail, validateUrl, validateYear } from "@/lib/validation";
import { findDualParentConflicts, type Gender } from "@/lib/parentRules";

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
  onCreatePersonAndLink: (
    newPerson: PersonLike,
    linkType: "partner" | "child" | "parent",
    relatedToId: string,
    unionType?: string,
    startYear?: number | null,
    relationshipType?: string,
  ) => void;
  onRemoveLink: (linkType: "partner" | "child", fromId: string, toId: string) => void;
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
  onCreatePersonAndLink,
  onRemoveLink,
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

  // --- -- -- -- -- --
  // Parent role labels tie into the "no two mothers" rule: each parent shows a
  // role tag (Mother / Father / Step Mother / Adopted Father) that reflects the
  // parent edge's relationship type and the person's gender.
  // --- -- -- -- -- --
  function parentRoleLabel(gender: string | undefined, relType: string | undefined): string {
    const rel = relType === "step" ? "Step " : relType === "adopted" ? "Adopted " : "";
    const role =
      gender === "female" ? "Mother" : gender === "male" ? "Father" : "Parent";
    return `${rel}${role}`;
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

    const parents: { person: PersonLike; relType: string; role: string }[] = [];
    for (const pe of parentEdges) {
      if (pe.childId === person.id) {
        const union = unions.find((u) => u.id === pe.unionId);
        if (union) {
          const relType = pe.relationshipType ?? "biological";
          const pA = persons.find((p) => p.id === union.partnerA);
          const pB = persons.find((p) => p.id === union.partnerB);
          if (pA) parents.push({ person: pA, relType, role: parentRoleLabel(pA.gender, relType) });
          if (pB) parents.push({ person: pB, relType, role: parentRoleLabel(pB.gender, relType) });
        }
      }
    }

    const children: PersonLike[] = [];
    for (const pe of parentEdges) {
      const union = unions.find((u) => u.id === pe.unionId);
      if (union && (union.partnerA === person.id || union.partnerB === person.id)) {
        const child = persons.find((p) => p.id === pe.childId);
        if (child) children.push(child);
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
              <img src={person.photoUrl} alt={person.fullName} className="w-full h-full object-cover" />
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
            <div className="space-y-4">
              {locked && (
                <div className="flex items-start gap-2 rounded-lg border border-[var(--thread-gold-dim)]/30 bg-white/5 px-3 py-2 text-xs text-[var(--parchment-dim)]">
                  <span aria-hidden="true">🔒</span><span>View-only — outside your circle.</span>
                </div>
              )}
              {canEdit && canEditPrivate && (
                <div className="flex items-center gap-3">
                  <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">Photo</label>
                  <label className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors cursor-pointer">
                    {photoLoading ? "Uploading..." : person.photoUrl ? "Change Photo" : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={photoLoading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5MB."); return; }
                        setPhotoLoading(true);
                        try {
                          const form = new FormData();
                          form.append("file", file);
                          form.append("personId", person.id);
                          const res = await fetch("/api/upload", { method: "POST", body: form });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Upload failed");
                          onUpdatePerson({ ...person, photoUrl: data.url });
                        } catch (err) {
                          alert(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setPhotoLoading(false);
                          e.target.value = "";
                        }
                      }}
                    />
                  </label>
                  {person.photoUrl && !photoLoading && (
                    <button
                      onClick={() => onUpdatePerson({ ...person, photoUrl: "" })}
                      className="px-3 py-1.5 text-xs rounded border border-[var(--ember-red)]/40 text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {field("gender", "Gender", "select")}
                {field("fullName", "Full Name")}
                {field("nameNative", "Name (your script)")}
                {field("birthYear", "Birth Year", "number")}
                {field("deathYear", "Death Year", "number")}
                {field("birthPlace", "Birth Place")}
                {field("profession", "Profession")}
              </div>

              <div className="border-t border-[var(--thread-gold-dim)]/20" />

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1 block">Biography</label>
                {isEditing && canEditPrivate ? (
                  <textarea
                    value={fields.bio ?? ""}
                    onChange={(e) => setFields((f) => ({ ...f, bio: e.target.value }))}
                    className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body resize-none h-32 focus:outline-none focus:border-[var(--thread-gold)]"
                  />
                ) : (
                  <p className="text-sm text-[var(--parchment-dim)] font-body leading-relaxed">{person.bio || "No biography yet."}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {isEditing ? (
                  <>
                    <button onClick={() => { setIsEditing(false); setFields({}); }} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">Cancel</button>
                    <button onClick={saveProfile} className="px-3 py-1.5 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] hover:opacity-90 transition-opacity">Save</button>
                  </>
                ) : canEdit ? (
                  <button
                    onClick={() => {
                      setFields({ fullName: person.fullName, nameNative: person.nameNative ?? "", gender: person.gender ?? "", birthYear: String(person.birthYear ?? ""), deathYear: person.deathYear != null ? String(person.deathYear) : "", birthPlace: person.birthPlace, profession: person.profession, bio: person.bio, email: person.email, phone: person.phone, address: person.address, website: person.website });
                      setIsEditing(true);
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors"
                  >
                    Edit Profile
                  </button>
                ) : null}
              </div>

              <div className="border-t border-[var(--thread-gold-dim)]/20" />

              <div className="space-y-3">
                <h3 className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">Contact</h3>
                {field("email", "Email")}
                {field("phone", "Phone")}
                <div className="space-y-1">
                  {field("address", "Address")}
                  {(() => {
                    const addr = (isEditing && fields.address ? fields.address : person.address?.trim()) || "";
                    const coords = person.lat != null && person.lng != null ? `${person.lat},${person.lng}` : "";
                    const target = addr || (person.birthPlace?.trim() || "") || coords;
                    if (!target) return null;
                    return (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(target)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/25 transition-colors font-body"
                        title="Open in Google Maps to drive there"
                      >
                        📍 Drop pin on map
                      </a>
                    );
                  })()}
                </div>
                {field("website", "Website")}
              </div>
            </div>
          )}

          {/* ── Relationship tabs ── */}
          {tab === "parents" && (
            <>
              <RelSection
                items={relatedData.parents.map(({ person: p, role }) => ({
                  id: p.id,
                  label: p.fullName,
                  sub: `${role} · ${p.birthYear} – ${p.deathYear ?? "present"}`,
                  badge: role.startsWith("Step") ? "step" : role.startsWith("Adopted") ? "adopted" : undefined,
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
              items={relatedData.children.map((c) => ({ id: c.id, label: c.fullName, sub: `${c.birthYear} – ${c.deathYear ?? "present"}` }))}
              addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
              onSearch={setSearchQuery}
              onPickExisting={(id) => { onAddChild(person.id, id, newRelType); resetAdd(); }}
              onCreateNew={handleCreateAndLink}
              onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
              onStartAdd={setAddMode} onCancelAdd={resetAdd}
              onRemove={(id) => onRemoveLink("child", person.id, id)} personLabel="Child"
              showRelType relType={newRelType} onRelTypeChange={setNewRelType}
              onNavigate={onNavigate}
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

  function field(key: string, label: string, type = "text") {
    const privateLocked = !canEditPrivate && ["email", "phone", "address", "website"].includes(key);
    const showEdit = isEditing && !privateLocked;
    return (
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">{label}</label>
        {showEdit ? (
          type === "textarea" ? (
            <textarea value={fields[key] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body resize-none h-24 focus:outline-none focus:border-[var(--thread-gold)]" />
          ) : type === "select" ? (
            <select
              value={fields["gender"] ?? person!.gender ?? ""}
              onChange={(e) => setFields((f) => ({ ...f, gender: e.target.value }))}
              className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]"
            >
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          ) : (
            <input type={type} value={fields[key] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]" />
          )
        ) : (
          <p className="text-sm text-[var(--parchment)] font-body">
            {key === "deathYear" ? (person!.deathYear ?? "present") : key === "birthYear" ? (person!.birthYear ?? "—") : key === "gender" ? ((person as unknown as Record<string, unknown>)[key] as string || "Not specified") : ((person as unknown as Record<string, unknown>)[key] as string) || "—"}
          </p>
        )}
      </div>
    );
  }
}

function RelSection({
  items, addMode, searchQuery, searchResults, newPersonFields,
  onSearch, onPickExisting, onCreateNew, onNewFieldChange,
  onStartAdd, onCancelAdd, onRemove, personLabel,
  showUnionType, unionType, onUnionTypeChange, startYear, onStartYearChange,
  showRelType, relType, onRelTypeChange,
  onNavigate,
  onEditUnion, editingUnionId, editUnionType, onEditUnionTypeChange,
  editStartYear, onEditStartYearChange, editEndYear, onEditEndYearChange,
  onSaveUnion, onCancelEditUnion,
}: {
  items: { id: string; unionId?: string; label: string; sub: string; badge?: string; union?: UnionLike }[];
  addMode: "existing" | "new" | null;
  searchQuery: string;
  searchResults: PersonLike[];
  newPersonFields: { fullName: string; birthYear: string; birthPlace: string; profession: string; email: string; phone: string; address: string; website: string; gender: string };
  onSearch: (q: string) => void;
  onPickExisting: (id: string) => void;
  onCreateNew: () => void;
  onNewFieldChange: (key: string, val: string) => void;
  onStartAdd: (mode: "existing" | "new") => void;
  onCancelAdd: () => void;
  onRemove: (id: string) => void;
  personLabel: string;
  showUnionType?: boolean;
  unionType?: string;
  onUnionTypeChange?: (val: string) => void;
  startYear?: string;
  onStartYearChange?: (val: string) => void;
  showRelType?: boolean;
  relType?: string;
  onRelTypeChange?: (val: string) => void;
  onNavigate: (id: string) => void;
  onEditUnion?: (item: { id: string; unionId?: string; union?: UnionLike }) => void;
  editingUnionId?: string | null;
  editUnionType?: string;
  onEditUnionTypeChange?: (val: string) => void;
  editStartYear?: string;
  onEditStartYearChange?: (val: string) => void;
  editEndYear?: string;
  onEditEndYearChange?: (val: string) => void;
  onSaveUnion?: () => void;
  onCancelEditUnion?: () => void;
}) {
  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const isEditingThis = onEditUnion && item.unionId && editingUnionId === item.unionId;
            return (
            <div key={item.id} className="bg-white/[0.03] rounded-lg px-4 py-2.5 border border-[var(--thread-gold-dim)]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-[var(--thread-gold)]/10 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="var(--thread-gold-dim)" strokeWidth="1.5">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>
                  <div>
                    <button onClick={() => onNavigate(item.id)} className="text-sm text-[var(--parchment)] font-body hover:text-[var(--thread-gold)] transition-colors text-left">{item.label}</button>
                    {item.badge && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--ember-red)]/15 text-[var(--ember-red)]">{item.badge}</span>}
                    <p className="text-[10px] text-[var(--parchment-dim)]">{item.sub}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {onEditUnion && (
                    <button onClick={() => onEditUnion(item)} aria-label={`Edit relationship with ${item.label}`} title="Change type / years" className="w-8 h-8 flex items-center justify-center rounded text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors text-xs">✎</button>
                  )}
                  <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.label}`} className="w-8 h-8 flex items-center justify-center rounded text-[var(--parchment-dim)] hover:text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors text-xs shrink-0">✕</button>
                </div>
              </div>

              {isEditingThis && (
                <div className="mt-3 pt-3 border-t border-[var(--thread-gold-dim)]/10 space-y-2">
                  <div className="flex gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Type</label>
                    <select value={editUnionType} onChange={(e) => onEditUnionTypeChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]">
                      <option value="marriage">Marriage</option>
                      <option value="partnership">Partnership</option>
                      <option value="divorced">Divorced</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Start</label>
                    <input type="number" placeholder="Start year" value={editStartYear} onChange={(e) => onEditStartYearChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
                  </div>
                  <div className="flex gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">End</label>
                    <input type="number" placeholder="End year (e.g. divorce year)" value={editEndYear} onChange={(e) => onEditEndYearChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={onSaveUnion} className="flex-1 px-3 py-1.5 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity">Save</button>
                    <button onClick={onCancelEditUnion} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-[var(--parchment-dim)] italic">No linked yet.</p>
      )}

      {!addMode ? (
        <div className="flex gap-2 pt-1">
          <button onClick={() => onStartAdd("existing")} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors">+ Existing {personLabel}</button>
          <button onClick={() => onStartAdd("new")} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold)]/40 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors">+ New {personLabel}</button>
        </div>
      ) : (
        <div className="bg-white/[0.03] rounded-lg border border-[var(--thread-gold-dim)]/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body text-[var(--thread-gold)]">{addMode === "existing" ? `Link existing ${personLabel.toLowerCase()}` : `Create new ${personLabel.toLowerCase()}`}</span>
            <button onClick={onCancelAdd} aria-label="Cancel" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs">✕</button>
          </div>

          {showRelType && (
            <>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Rel</label>
                <select value={relType} onChange={(e) => onRelTypeChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]">
                  <option value="biological">Biological</option>
                  <option value="adopted">Adopted</option>
                  <option value="step">Step</option>
                </select>
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Gender</label>
                <select value={newPersonFields.gender} onChange={(e) => onNewFieldChange("gender", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]">
                  <option value="">Not specified</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </>
          )}

          {addMode === "existing" ? (
            <>
              <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => onSearch(e.target.value)} autoFocus className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              {searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {searchResults.map((p) => (
                    <button key={p.id} onClick={() => onPickExisting(p.id)} className="w-full text-left px-3 py-2 rounded hover:bg-[var(--thread-gold)]/10 text-sm text-[var(--parchment)] font-body transition-colors">
                      {p.fullName} <span className="ml-2 text-[10px] text-[var(--parchment-dim)]">{p.birthYear} – {p.deathYear ?? "present"}</span>
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-xs text-[var(--parchment-dim)] italic">No matches. <button onClick={() => onStartAdd("new")} className="text-[var(--thread-gold)] underline">Create new</button>.</p>
              )}
            </>
          ) : (
            <>
              {showUnionType && (
                <>
                  <div className="flex gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Type</label>
                    <select value={unionType} onChange={(e) => onUnionTypeChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]">
                      <option value="marriage">Marriage</option>
                      <option value="partnership">Partnership</option>
                      <option value="divorced">Divorced</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Year</label>
                    <input type="number" placeholder="Start year" value={startYear} onChange={(e) => onStartYearChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Name</label>
                <input type="text" placeholder="Full name" value={newPersonFields.fullName} onChange={(e) => onNewFieldChange("fullName", e.target.value)} autoFocus className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Born</label>
                <input type="number" placeholder="Birth year" value={newPersonFields.birthYear} onChange={(e) => onNewFieldChange("birthYear", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Place</label>
                <input type="text" placeholder="Birth place" value={newPersonFields.birthPlace} onChange={(e) => onNewFieldChange("birthPlace", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Job</label>
                <input type="text" placeholder="Profession" value={newPersonFields.profession} onChange={(e) => onNewFieldChange("profession", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Email</label>
                <input type="email" placeholder="Email address" value={newPersonFields.email} onChange={(e) => onNewFieldChange("email", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Phone</label>
                <input type="tel" placeholder="Phone number" value={newPersonFields.phone} onChange={(e) => onNewFieldChange("phone", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Addr</label>
                <input type="text" placeholder="Address" value={newPersonFields.address} onChange={(e) => onNewFieldChange("address", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Web</label>
                <input type="url" placeholder="Website URL" value={newPersonFields.website} onChange={(e) => onNewFieldChange("website", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]" />
              </div>
              <button onClick={onCreateNew} disabled={!newPersonFields.fullName} className="w-full py-2 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">Create & Link</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const SOURCE_TYPES = [
  { value: "birth-certificate", label: "Birth Certificate" },
  { value: "marriage-certificate", label: "Marriage Certificate" },
  { value: "death-certificate", label: "Death Certificate" },
  { value: "census", label: "Census Record" },
  { value: "newspaper", label: "Newspaper" },
  { value: "photograph", label: "Photograph" },
  { value: "letter", label: "Letter" },
  { value: "book", label: "Book" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

function SourcesTab({
  sources, canEdit, onAdd, onUpdate, onDelete, nextId, personId,
}: {
  sources: Source[];
  canEdit: boolean;
  onAdd: (s: Source) => void;
  onUpdate: (s: Source) => void;
  onDelete: (id: string) => void;
  nextId: () => string;
  personId: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formType, setFormType] = useState<Source["type"]>("other");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const inputCls = "w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]";

  const resetForm = () => {
    setFormType("other");
    setFormTitle("");
    setFormUrl("");
    setFormNotes("");
    setShowAdd(false);
    setEditId(null);
  };

  const handleSave = () => {
    const title = sanitizeField("title", formTitle);
    if (!title) return;
    const url = sanitizeField("url", formUrl);
    if (url && !validateUrl(url)) return;
    const notes = sanitizeField("notes", formNotes);
    if (editId) {
      const existing = sources.find((s) => s.id === editId);
      if (existing) onUpdate({ ...existing, type: formType, title, url, notes });
    } else {
      onAdd({ id: nextId(), personId, type: formType, title, url, notes, dateAdded: new Date().toISOString() });
    }
    resetForm();
  };

  const startEdit = (s: Source) => {
    setEditId(s.id);
    setFormType(s.type);
    setFormTitle(s.title);
    setFormUrl(s.url);
    setFormNotes(s.notes);
    setShowAdd(true);
  };

  return (
    <div className="space-y-3">
      {sources.length > 0 ? (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="bg-white/[0.03] rounded-lg px-4 py-3 border border-[var(--thread-gold-dim)]/10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--thread-gold)]/10 text-[var(--thread-gold)]">{SOURCE_TYPES.find((t) => t.value === s.type)?.label ?? s.type}</span>
                  </div>
                  <p className="text-sm text-[var(--parchment)] font-body">{s.title}</p>
                  {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--thread-gold)] hover:underline break-all">{s.url}</a>}
                  {s.notes && <p className="text-[10px] text-[var(--parchment-dim)] mt-1">{s.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => startEdit(s)} className="text-[10px] text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] px-1">Edit</button>
                    <button onClick={() => onDelete(s.id)} className="text-[10px] text-[var(--parchment-dim)] hover:text-[var(--ember-red)] px-1">Del</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--parchment-dim)] italic">No sources cited yet.</p>
      )}

      {canEdit && !showAdd && (
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold)]/40 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors">+ Add Source</button>
      )}

      {showAdd && (
        <div className="bg-white/[0.03] rounded-lg border border-[var(--thread-gold-dim)]/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body text-[var(--thread-gold)]">{editId ? "Edit Source" : "Add Source"}</span>
            <button onClick={resetForm} className="w-8 h-8 flex items-center justify-center text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs rounded-full">x</button>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value as Source["type"])} className={inputCls}>
              {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Title *</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Birth certificate for John Smith" autoFocus className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">URL</label>
            <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Notes</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional details..." rows={2} className={inputCls + " resize-none"} />
          </div>
          <button onClick={handleSave} disabled={!formTitle.trim()} className="w-full py-2 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
            {editId ? "Save Changes" : "Add Source"}
          </button>
        </div>
      )}
    </div>
  );
}
