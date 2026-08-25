"use client";

import { useState, useMemo } from "react";
export interface PersonLike {
  id: string;
  fullName: string;
  birthYear: number | null;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
}

export interface UnionLike {
  id: string;
  partnerA: string;
  partnerB: string;
  type: string;
  startYear: number | null;
  endYear: number | null;
}

export interface EdgeLike {
  unionId: string;
  childId: string;
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
  onAddChild: (personId: string, childId: string) => void;
  onAddParent: (childId: string, parentId: string) => void;
  onCreatePersonAndLink: (
    newPerson: PersonLike,
    linkType: "partner" | "child" | "parent",
    relatedToId: string,
    unionType?: string,
    startYear?: number | null,
  ) => void;
  onRemoveLink: (linkType: "partner" | "child", fromId: string, toId: string) => void;
  nextPersonId: () => string;
}

type Tab = "profile" | "parents" | "partners" | "children";

export default function InfoPanel({
  person,
  persons,
  unions,
  parentEdges,
  onClose,
  onUpdatePerson,
  onDeletePerson,
  onAddPartner,
  onAddChild,
  onAddParent,
  onCreatePersonAndLink,
  onRemoveLink,
  nextPersonId,
}: InfoPanelProps) {
  const [tab, setTab] = useState<Tab>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [addMode, setAddMode] = useState<"existing" | "new" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newPersonFields, setNewPersonFields] = useState({ fullName: "", birthYear: "", birthPlace: "", profession: "" });
  const [newUnionType, setNewUnionType] = useState("marriage");
  const [newStartYear, setNewStartYear] = useState("");

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

    const parents: PersonLike[] = [];
    for (const pe of parentEdges) {
      if (pe.childId === person.id) {
        const union = unions.find((u) => u.id === pe.unionId);
        if (union) {
          const pA = persons.find((p) => p.id === union.partnerA);
          const pB = persons.find((p) => p.id === union.partnerB);
          if (pA) parents.push(pA);
          if (pB) parents.push(pB);
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

  if (!person) return null;

  const resetAdd = () => {
    setAddMode(null);
    setSearchQuery("");
    setNewPersonFields({ fullName: "", birthYear: "", birthPlace: "", profession: "" });
    setNewStartYear("");
  };

  const switchTab = (t: Tab) => { setTab(t); resetAdd(); };

  const saveProfile = () => {
    onUpdatePerson({
      ...person,
      fullName: fields.fullName ?? person.fullName,
      birthYear: fields.birthYear ? Number(fields.birthYear) : person.birthYear,
      deathYear: fields.deathYear !== undefined ? (fields.deathYear === "" ? null : Number(fields.deathYear)) : person.deathYear,
      birthPlace: fields.birthPlace ?? person.birthPlace,
      profession: fields.profession ?? person.profession,
      bio: fields.bio ?? person.bio,
    });
    setIsEditing(false);
    setFields({});
  };

  const handleCreateAndLink = () => {
    const id = nextPersonId();
    const np: PersonLike = {
      id,
      fullName: newPersonFields.fullName,
      birthYear: newPersonFields.birthYear ? Number(newPersonFields.birthYear) : null,
      deathYear: null,
      isAlive: true,
      bio: "",
      birthPlace: newPersonFields.birthPlace,
      profession: newPersonFields.profession,
    };
    if (tab === "partners") onCreatePersonAndLink(np, "partner", person.id, newUnionType, newStartYear ? Number(newStartYear) : null);
    else if (tab === "children") onCreatePersonAndLink(np, "child", person.id);
    else if (tab === "parents") onCreatePersonAndLink(np, "parent", person.id);
    resetAdd();
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "profile", label: "Profile", count: 0 },
    { key: "parents", label: "Parents", count: relatedData.parents.length },
    { key: "partners", label: "Partners", count: relatedData.partners.length },
    { key: "children", label: "Children", count: relatedData.children.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[92vw] bg-[#1a1714] border-l border-[var(--thread-gold-dim)] z-50 flex flex-col overflow-hidden shadow-[-8px_0_32px_rgba(0,0,0,0.5)]">
        {/* Header with avatar */}
        <div className="flex justify-center pt-5 pb-3 border-b border-[var(--thread-gold-dim)]/20">
          <div
            className={`w-20 h-20 rounded-full border-2 overflow-hidden flex items-center justify-center ${
              person.isAlive
                ? "border-[var(--living-glow)] shadow-[0_0_16px_rgba(217,139,62,0.3)]"
                : "border-[var(--deceased-frame)] grayscale"
            }`}
          >
            <svg viewBox="0 0 80 80" className="w-full h-full opacity-60">
              <circle cx="40" cy="28" r="15" fill={person.isAlive ? "#D98B3E" : "#5C564C"} />
              <ellipse cx="40" cy="68" rx="25" ry="20" fill={person.isAlive ? "#D98B3E" : "#5C564C"} />
            </svg>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-[var(--thread-gold-dim)]/20">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`px-3 py-1.5 rounded text-xs font-body transition-colors ${
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

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-2 py-1.5 rounded text-xs text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* ── Profile tab ── */}
          {tab === "profile" && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="font-display text-xl font-semibold text-[var(--parchment)]">{person.fullName}</h2>
                <p className="text-xs text-[var(--parchment-dim)] italic mt-1">
                  {person.birthYear} – {person.deathYear ?? "present"}
                </p>
              </div>

              <div className="border-t border-[var(--thread-gold-dim)]/20" />

              <div className="space-y-3">
                {field("fullName", "Full Name")}
                {field("birthYear", "Birth Year", "number")}
                {field("deathYear", "Death Year", "number")}
                {field("birthPlace", "Birth Place")}
                {field("profession", "Profession")}
              </div>

              <div className="border-t border-[var(--thread-gold-dim)]/20" />

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1 block">Biography</label>
                {isEditing ? (
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
                ) : (
                  <button
                    onClick={() => {
                      setFields({ fullName: person.fullName, birthYear: String(person.birthYear ?? ""), deathYear: person.deathYear != null ? String(person.deathYear) : "", birthPlace: person.birthPlace, profession: person.profession, bio: person.bio });
                      setIsEditing(true);
                    }}
                    className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Relationship tabs ── */}
          {tab === "parents" && (
            <RelSection
              items={relatedData.parents.map((p) => ({ id: p.id, label: p.fullName, sub: `${p.birthYear} – ${p.deathYear ?? "present"}` }))}
              addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
              onSearch={setSearchQuery}
              onPickExisting={(id) => { onAddParent(person.id, id); resetAdd(); }}
              onCreateNew={handleCreateAndLink}
              onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
              onStartAdd={setAddMode} onCancelAdd={resetAdd}
              onRemove={(id) => onRemoveLink("child", person.id, id)} personLabel="Parent"
            />
          )}

          {tab === "partners" && (
            <RelSection
              items={relatedData.partners.map((pp) => ({ id: pp.person.id, label: pp.person.fullName, sub: `${pp.union.type} · ${pp.union.startYear ?? "?"} – ${pp.union.endYear ?? "present"}`, badge: pp.union.type === "divorced" ? "divorced" : undefined }))}
              addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
              onSearch={setSearchQuery}
              onPickExisting={(id) => { onAddPartner(person.id, id, newUnionType, newStartYear ? Number(newStartYear) : null); resetAdd(); }}
              onCreateNew={handleCreateAndLink}
              onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
              onStartAdd={setAddMode} onCancelAdd={resetAdd}
              onRemove={(id) => onRemoveLink("partner", person.id, id)} personLabel="Partner"
              showUnionType unionType={newUnionType} onUnionTypeChange={setNewUnionType}
              startYear={newStartYear} onStartYearChange={setNewStartYear}
            />
          )}

          {tab === "children" && (
            <RelSection
              items={relatedData.children.map((c) => ({ id: c.id, label: c.fullName, sub: `${c.birthYear} – ${c.deathYear ?? "present"}` }))}
              addMode={addMode} searchQuery={searchQuery} searchResults={searchResults} newPersonFields={newPersonFields}
              onSearch={setSearchQuery}
              onPickExisting={(id) => { onAddChild(person.id, id); resetAdd(); }}
              onCreateNew={handleCreateAndLink}
              onNewFieldChange={(k, v) => setNewPersonFields((f) => ({ ...f, [k]: v }))}
              onStartAdd={setAddMode} onCancelAdd={resetAdd}
              onRemove={(id) => onRemoveLink("child", person.id, id)} personLabel="Child"
            />
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-[#1a1714] border border-[var(--ember-red)]/40 rounded-xl p-6 max-w-sm w-full shadow-2xl">
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
    return (
      <div className="space-y-1">
        <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">{label}</label>
        {isEditing ? (
          type === "textarea" ? (
            <textarea value={fields[key] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body resize-none h-24 focus:outline-none focus:border-[var(--thread-gold)]" />
          ) : (
            <input type={type} value={fields[key] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]" />
          )
        ) : (
          <p className="text-sm text-[var(--parchment)] font-body">
            {key === "deathYear" ? (person!.deathYear ?? "present") : key === "birthYear" ? (person!.birthYear ?? "—") : ((person as unknown as Record<string, unknown>)[key] as string) || "—"}
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
}: {
  items: { id: string; label: string; sub: string; badge?: string }[];
  addMode: "existing" | "new" | null;
  searchQuery: string;
  searchResults: PersonLike[];
  newPersonFields: { fullName: string; birthYear: string; birthPlace: string; profession: string };
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
}) {
  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-4 py-2.5 border border-[var(--thread-gold-dim)]/10">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[var(--thread-gold)]/10 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="var(--thread-gold-dim)" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm text-[var(--parchment)] font-body">{item.label}</span>
                  {item.badge && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[var(--ember-red)]/15 text-[var(--ember-red)]">{item.badge}</span>}
                  <p className="text-[10px] text-[var(--parchment-dim)]">{item.sub}</p>
                </div>
              </div>
              <button onClick={() => onRemove(item.id)} className="w-6 h-6 flex items-center justify-center rounded text-[var(--parchment-dim)] hover:text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors text-xs shrink-0">✕</button>
            </div>
          ))}
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
            <button onClick={onCancelAdd} className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs">✕</button>
          </div>

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
              <button onClick={onCreateNew} disabled={!newPersonFields.fullName} className="w-full py-2 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">Create & Link</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
