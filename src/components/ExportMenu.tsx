"use client";

import { useState, useRef } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import {
  exportToJSON,
  exportPersonsCSV,
  exportRelationshipsCSV,
  exportToPNG,
  exportToPDF,
  downloadFile,
} from "@/lib/export";

interface ExportMenuProps {
  persons: PersonLike[];
  unions: UnionLike[];
  edges: EdgeLike[];
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  onExportGedcom?: () => void;
}

export default function ExportMenu({ persons, unions, edges, viewportRef, onExportGedcom }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          if (viewportRef?.current) await exportToPNG(viewportRef.current);
          break;
        case "pdf":
          if (viewportRef?.current) await exportToPDF(viewportRef.current);
          break;
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 text-xs rounded-lg bg-[var(--thread-gold)]/10 border border-[var(--thread-gold-dim)]/30 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/20 transition-colors font-body flex items-center gap-2"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <path d="M8 2v8M4 7l4 4 4-4M2 13h12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Export
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-52 bg-[var(--tapestry-bg)]/95 backdrop-blur-md border border-[var(--thread-gold-dim)]/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden z-50">
            <div className="px-3 py-2 border-b border-[var(--thread-gold-dim)]/20">
              <h3 className="font-display text-xs text-[var(--thread-gold)] font-semibold">Export Format</h3>
            </div>
            <div className="py-1">
              {viewportRef?.current && (
                <>
                  <ExportItem label="PNG Image" desc="Screenshot of tree" icon="🖼" onClick={() => handleExport("png")} disabled={exporting} />
                  <ExportItem label="PDF Document" desc="Printable tree" icon="📄" onClick={() => handleExport("pdf")} disabled={exporting} />
                  <div className="border-t border-[var(--thread-gold-dim)]/15 my-1" />
                </>
              )}
              <ExportItem label="GEDCOM" desc="Genealogy standard" icon="📋" onClick={() => { if (onExportGedcom) onExportGedcom(); setOpen(false); }} disabled={exporting} />
              <ExportItem label="JSON" desc="Full tree data" icon="📦" onClick={() => handleExport("json")} disabled={exporting} />
              <ExportItem label="CSV — Persons" desc="Tabular person data" icon="📊" onClick={() => handleExport("csv-persons")} disabled={exporting} />
              <ExportItem label="CSV — Relationships" desc="Family connections" icon="📊" onClick={() => handleExport("csv-relationships")} disabled={exporting} />
            </div>
          </div>
        </>
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
      <span className="text-sm">{icon}</span>
      <div>
        <p className="text-xs text-[var(--parchment)] font-body">{label}</p>
        <p className="text-[10px] text-[var(--parchment-dim)]">{desc}</p>
      </div>
    </button>
  );
}
