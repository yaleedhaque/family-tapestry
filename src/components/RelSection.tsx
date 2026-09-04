"use client";

import { useLang } from "@/lib/i18n";
import { isBiological } from "@/lib/parentRules";
import type { PersonLike, UnionLike } from "@/components/InfoPanel";

export interface RelSectionItem {
  id: string;
  unionId?: string;
  label: string;
  sub: string;
  badge?: string;
  union?: UnionLike;
  edge?: { unionId: string; childId: string; relationshipType: string };
}

interface RelSectionProps {
  items: RelSectionItem[];
  addMode: "existing" | "new" | null;
  searchQuery: string;
  searchResults: PersonLike[];
  newPersonFields: {
    fullName: string;
    birthYear: string;
    birthPlace: string;
    profession: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    gender: string;
  };
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
  onEditUnion?: (item: RelSectionItem) => void;
  editingUnionId?: string | null;
  editUnionType?: string;
  onEditUnionTypeChange?: (val: string) => void;
  editStartYear?: string;
  onEditStartYearChange?: (val: string) => void;
  editEndYear?: string;
  onEditEndYearChange?: (val: string) => void;
  onSaveUnion?: () => void;
  onCancelEditUnion?: () => void;
  canEdit?: boolean;
  onEditEdge?: (item: RelSectionItem) => void;
  editingEdgeKey?: string | null;
  editEdgeRel?: string;
  onEditEdgeRelChange?: (val: string) => void;
  onSaveEdge?: () => void;
  onCancelEditEdge?: () => void;
  onSetSingleParent?: (childId: string, parentId: string) => void;
}

export function RelSection({
  items, addMode, searchQuery, searchResults, newPersonFields,
  onSearch, onPickExisting, onCreateNew, onNewFieldChange,
  onStartAdd, onCancelAdd, onRemove, personLabel,
  showUnionType, unionType, onUnionTypeChange, startYear, onStartYearChange,
  showRelType, relType, onRelTypeChange,
  onNavigate,
  onEditUnion, editingUnionId, editUnionType, onEditUnionTypeChange,
  editStartYear, onEditStartYearChange, editEndYear, onEditEndYearChange,
  onSaveUnion, onCancelEditUnion,
  canEdit,
  onEditEdge, editingEdgeKey, editEdgeRel, onEditEdgeRelChange,
  onSaveEdge, onCancelEditEdge,
  onSetSingleParent,
}: RelSectionProps) {
  const { t } = useLang();
  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => {
            const isEditingThis = onEditUnion && item.unionId && editingUnionId === item.unionId;
            const edgeKey = item.edge ? `${item.edge.unionId}|${item.edge.childId}` : undefined;
            const isEditingEdge = onEditEdge && editingEdgeKey && edgeKey === editingEdgeKey;
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
                  {canEdit && onEditEdge && item.edge && !isEditingEdge && (
                    <button onClick={() => onEditEdge?.(item)} aria-label={`Change relationship with ${item.label}`} title="Change biological / adopted / step" className="w-8 h-8 flex items-center justify-center rounded text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors text-xs">✎</button>
                  )}
                  {onEditUnion && (
                    <button onClick={() => onEditUnion(item)} aria-label={`Edit relationship with ${item.label}`} title="Change type / years" className="w-8 h-8 flex items-center justify-center rounded text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors text-xs">✎</button>
                  )}
                  {canEdit && onSetSingleParent && item.edge && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Attach this child to ONLY ${item.label} (single-parent line)? The other parent will be removed from this child.`)) onSetSingleParent?.(item.edge!.childId, item.id);
                      }}
                      aria-label={`Make ${item.label} the only parent`}
                      title="Make this the only parent — child connects to just this one parent"
                      className="px-1.5 h-6 flex items-center rounded text-[10px] text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors border border-[var(--thread-gold-dim)]/30"
                    >solo</button>
                  )}
                  <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.label}`} className="w-8 h-8 flex items-center justify-center rounded text-[var(--parchment-dim)] hover:text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors text-xs shrink-0">✕</button>
                </div>
              </div>

              {isEditingEdge && (
                <div className="mt-3 pt-3 border-t border-[var(--thread-gold-dim)]/10 space-y-2">
                  <div className="flex gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">Rel</label>
                    <select value={editEdgeRel} onChange={(e) => onEditEdgeRelChange?.(e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]" aria-label="Relationship type">
                      <option value="biological">{t("rel.biological")}</option>
                      <option value="adopted">{t("rel.adopted")}</option>
                      <option value="step">{t("rel.step")}</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={onSaveEdge} className="flex-1 px-3 py-1.5 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity">Save</button>
                    <button onClick={onCancelEditEdge} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">Cancel</button>
                  </div>
                  {isBiological(editEdgeRel) && (
                    <p className="text-[10px] text-[var(--parchment-dim)] italic">
                      Biological lines are brown; Adopted are dashed green; Step are amber. Only one biological mother &amp; one biological father per child.
                    </p>
                  )}
                </div>
              )}

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
                  <option value="biological">{t("rel.biological")}</option>
                  <option value="adopted">{t("rel.adopted")}</option>
                  <option value="step">{t("rel.step")}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] self-center min-w-[60px]">{t("gender.label")}</label>
                <select value={newPersonFields.gender} onChange={(e) => onNewFieldChange("gender", e.target.value)} className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]">
                  <option value="">{t("gender.notSpecified")}</option>
                  <option value="female">{t("gender.female")}</option>
                  <option value="male">{t("gender.male")}</option>
                  <option value="other">{t("gender.other")}</option>
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
