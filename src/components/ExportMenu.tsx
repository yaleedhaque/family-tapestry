"use client";

import { useState } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import { useLang } from "@/lib/i18n";
import {
  exportToJSON,
  exportPersonsCSV,
  exportRelationshipsCSV,
  downloadFile,
} from "@/lib/export";

interface ExportMenuProps {
  persons: PersonLike[];
  unions: UnionLike[];
  edges: EdgeLike[];
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  onExportGedcom?: () => void;
  onExportImage?: (format: "png" | "pdf") => void;
}

export default function ExportMenu({ persons, unions, edges, onExportGedcom, onExportImage }: ExportMenuProps) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: string) => {
    setExporting(true);
    try {
      switch (format) {
        case "json":
          downloadFile(exportToJSON(persons, unions, edges), "family-tree.json", "application/json");
          break;
        case "csv-persons":
          downloadFile(exportPersonsCSV(persons), "family-persons.csv", "text/csv");
          break;
        case "csv-relationships":
          downloadFile(exportRelationshipsCSV(unions, edges, persons), "family-relationships.csv", "text/csv");
          break;
        case "png":
        case "pdf":
          // Full-tree capture (fits the whole graph, captures, restores).
          onExportImage?.(format as "png" | "pdf");
          break;
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  // Inline (non-floating) expansion: when opened, the options are laid out
  // inside the parent panel so they never overlap the rest of the UI or
  // scroll independent of the panel.
  return (
    <div className="w-full">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full px-3 py-2 text-xs rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--popover-border)] text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors font-body flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <path d="M8 2v8M4 7l4 4 4-4M2 13h12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {t("toolbar.export")}
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M3 4.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 border border-[var(--popover-border)] rounded-lg overflow-hidden bg-[var(--tapestry-bg-alt)]/70 shadow-[var(--popover-shadow)]">
          <div className="px-3 py-2 border-b border-[var(--thread-gold-dim)]/20">
            <h3 className="font-display text-xs text-[var(--thread-gold)] font-semibold">{t("export.title")}</h3>
          </div>
          <div className="py-1">
            {onExportImage ? (
              <>
                <ExportItem label={t("export.png")} desc={t("export.pngDesc")} icon="🖼" onClick={() => handleExport("png")} disabled={exporting} />
                <ExportItem label={t("export.pdf")} desc={t("export.pdfDesc")} icon="📄" onClick={() => handleExport("pdf")} disabled={exporting} />
                <div className="border-t border-[var(--thread-gold-dim)]/15 my-1" />
              </>
            ) : null}
            <ExportItem label={t("export.gedcom")} desc={t("export.gedcomDesc")} icon="📋" onClick={() => { if (onExportGedcom) onExportGedcom(); setOpen(false); }} disabled={exporting} />
            <ExportItem label={t("export.json")} desc={t("export.jsonDesc")} icon="📦" onClick={() => handleExport("json")} disabled={exporting} />
            <ExportItem label={t("export.csvPersons")} desc={t("export.csvPersonsDesc")} icon="📊" onClick={() => handleExport("csv-persons")} disabled={exporting} />
            <ExportItem label={t("export.csvRel")} desc={t("export.csvRelDesc")} icon="📊" onClick={() => handleExport("csv-relationships")} disabled={exporting} />
          </div>
        </div>
      )}
    </div>
  );
}

function ExportItem({
  label,
  desc,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  desc: string;
  icon: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-3 py-2 text-left hover:bg-[var(--thread-gold)]/10 transition-colors disabled:opacity-50 flex items-center gap-3"
    >
      <span className="text-sm shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-[var(--parchment)] font-body">{label}</p>
        <p className="text-[10px] text-[var(--parchment-dim)]">{desc}</p>
      </div>
    </button>
  );
}
