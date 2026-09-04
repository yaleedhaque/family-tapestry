"use client";

import { useLang } from "@/lib/i18n";
import type { PersonLike, UnionLike, EdgeLike } from "./InfoPanel";

interface UnionChildrenPanelProps {
  union: UnionLike;
  persons: PersonLike[];
  edges: EdgeLike[];
  onSelectChild: (person: PersonLike) => void;
  onAddChild: (unionId: string) => void;
  onClose: () => void;
}

export default function UnionChildrenPanel({
  union,
  persons,
  edges,
  onSelectChild,
  onAddChild,
  onClose,
}: UnionChildrenPanelProps) {
  const { t } = useLang();
  const partnerA = persons.find((p) => p.id === union.partnerA);
  const partnerB = persons.find((p) => p.id === union.partnerB);

  const childEdges = edges.filter((e) => e.unionId === union.id);
  const children = childEdges
    .map((e) => ({
      person: persons.find((p) => p.id === e.childId),
      relType: e.relationshipType ?? "biological",
    }))
    .filter((c) => c.person);

  const title = partnerA && partnerB
    ? `${partnerA.fullName} & ${partnerB.fullName}`
    : partnerA?.fullName ?? partnerB?.fullName ?? "Unknown";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-scrim)]" onClick={onClose}>
      <div
        className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/30 rounded-xl p-5 max-w-sm w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg text-[var(--thread-gold)]">{t("tree.children")}</h2>
            <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--parchment-dim)] mt-0.5">
              {title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Children list */}
        {children.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-body text-[var(--parchment-dim)]">
              {t("tree.legend.parentChild")}: —
            </p>
            <p className="text-xs font-body text-[var(--parchment-dim)]/60 mt-1">
              No children added yet
            </p>
          </div>
        ) : (
          <div className="space-y-1 mb-4">
            {children.map(({ person, relType }) => (
              <button
                key={person!.id}
                onClick={() => onSelectChild(person!)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--thread-gold)]/10 transition-colors text-left group"
              >
                {/* Photo or initial */}
                {person!.photoUrl ? (
                  <img
                    src={person!.photoUrl}
                    alt={person!.fullName}
                    className="w-8 h-8 rounded-full object-cover border border-[var(--thread-gold-dim)]/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--tapestry-bg)] border border-[var(--thread-gold-dim)]/30 flex items-center justify-center">
                    <span className="text-xs text-[var(--parchment-dim)] font-body">
                      {person!.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Name + details */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-body text-[var(--parchment)] truncate group-hover:text-[var(--thread-gold)] transition-colors">
                    {person!.fullName}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--parchment-dim)]">
                    {person!.birthYear && <span>{person!.birthYear}</span>}
                    {relType !== "biological" && (
                      <span className={`px-1.5 py-0.5 rounded-full ${
                        relType === "adopted"
                          ? "bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]"
                          : "bg-[var(--link)]/20 text-[var(--link)]"
                      }`}>
                        {relType}
                      </span>
                    )}
                  </div>
                </div>
                {/* Arrow */}
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-[var(--parchment-dim)]/40 group-hover:text-[var(--thread-gold)] transition-colors shrink-0">
                  <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Add children button */}
        <button
          onClick={() => onAddChild(union.id)}
          className="w-full py-2.5 text-sm rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--popover-border)] text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors font-body flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M8 3v10M3 8h10" strokeLinecap="round" />
          </svg>
          {t("add.submit").replace("Add a Person", "Add Child")}
        </button>
      </div>
    </div>
  );
}
