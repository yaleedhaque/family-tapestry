"use client";

import { useMemo, useState } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import ExportMenu from "@/components/ExportMenu";
import { useLang } from "@/lib/i18n";

interface TreeToolbarProps {
  persons: PersonLike[];
  unions: UnionLike[];
  parentEdges: EdgeLike[];
  onExportGedcom?: () => void;
  onImportGedcom?: () => void;
  onExportImage?: (format: "png" | "pdf") => void;
}

export default function TreeToolbar({ persons, unions, parentEdges, onExportGedcom, onImportGedcom, onExportImage }: TreeToolbarProps) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);

  const stats = useMemo(() => {
    const alive = persons.filter((p) => p.isAlive).length;
    const deceased = persons.length - alive;
    const generations = computeGenerations(persons, unions, parentEdges);
    const marriages = unions.filter((u) => u.type === "marriage").length;
    const partnerships = unions.filter((u) => u.type === "partnership").length;
    const divorced = unions.filter((u) => u.type === "divorced").length;
    return { alive, deceased, generations, marriages, partnerships, divorced };
  }, [persons, unions, parentEdges]);

  return (
    <div className="absolute top-28 md:top-20 right-4 z-30">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-10 h-10 rounded-full bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 flex items-center justify-center text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]/60 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.3)]"
        title="Tree info & export"
        aria-label="Tree info and export"
        aria-expanded={expanded}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <circle cx="10" cy="4" r="2" />
          <circle cx="4" cy="14" r="2" />
          <circle cx="16" cy="14" r="2" />
          <path d="M10 6v4M6 10l-1 2M14 10l1 2" strokeLinecap="round" />
        </svg>
      </button>

      {expanded && (
        <div className="absolute top-0 right-12 w-60 max-h-[calc(100vh-8rem)] overflow-y-auto bg-[var(--tapestry-bg)]/95 backdrop-blur-md border border-[var(--popover-border)] rounded-xl shadow-[var(--popover-shadow)]">
          <div className="px-4 py-3 border-b border-[var(--thread-gold-dim)]/20">
            <h3 className="font-display text-sm text-[var(--thread-gold)] font-semibold">{t("tree.overview")}</h3>
          </div>

          <div className="px-4 py-3 space-y-2.5">
            <StatRow label={t("toolbar.people")} value={persons.length} icon="&#x1F464;" />
            <StatRow label={t("toolbar.living")} value={stats.alive} icon="&#x271A;" color="var(--living-glow)" />
            <StatRow label={t("toolbar.deceased")} value={stats.deceased} icon="&#x2720;" color="var(--deceased-frame)" />
            <StatRow label={t("toolbar.generations")} value={stats.generations} icon="&#x2193;" />

            <div className="border-t border-[var(--thread-gold-dim)]/15 pt-2.5" />

            <StatRow label={t("toolbar.marriages")} value={stats.marriages} icon="&#x25C6;" color="var(--thread-gold)" />
            <StatRow label={t("toolbar.partnerships")} value={stats.partnerships} icon="&#x25C6;" color="var(--thread-gold-dim)" />
            <StatRow label={t("toolbar.divorced")} value={stats.divorced} icon="&#x2716;" color="var(--ember-red)" />
          </div>

          <div className="px-4 py-3 border-t border-[var(--thread-gold-dim)]/20 space-y-2">
            <ExportMenu
              persons={persons}
              unions={unions}
              edges={parentEdges}
              onExportGedcom={onExportGedcom}
              onExportImage={onExportImage}
            />
            {onImportGedcom && (
              <button
                onClick={onImportGedcom}
                className="w-full py-2 text-xs rounded-lg border border-[var(--thread-gold-dim)]/20 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
                  <path d="M8 14V6M4 9l4-4 4 4M2 3h12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("toolbar.import")} GEDCOM
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-[var(--parchment-dim)] font-body flex items-center gap-1.5">
        <span style={{ color: color ?? "var(--parchment-dim)" }} className="text-xs">{icon}</span>
        {label}
      </span>
      <span className="text-[11px] text-[var(--parchment)] font-body font-medium tabular-nums">{value}</span>
    </div>
  );
}

function computeGenerations(persons: PersonLike[], unions: UnionLike[], parentEdges: EdgeLike[]): number {
  const childOf = new Map<string, string>();
  for (const e of parentEdges) childOf.set(e.childId, e.unionId);

  let maxDepth = 1;
  for (const p of persons) {
    let depth = 0;
    let current: string | undefined = p.id;
    const visited = new Set<string>();
    while (current && !visited.has(current)) {
      visited.add(current);
      depth++;
      const unionId = childOf.get(current);
      if (!unionId) break;
      const union = unions.find((u) => u.id === unionId);
      if (!union) break;
      const parentA = union.partnerA;
      const parentB = union.partnerB;
      if (parentA && !visited.has(parentA)) { current = parentA; continue; }
      if (parentB && !visited.has(parentB)) { current = parentB; continue; }
      break;
    }
    maxDepth = Math.max(maxDepth, depth);
  }
  return maxDepth;
}
