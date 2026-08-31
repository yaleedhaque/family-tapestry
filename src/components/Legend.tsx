"use client";

import { useState } from "react";
import { GENERATION_COLORS } from "@/lib/generation";

export default function Legend({ maxGeneration }: { maxGeneration: number }) {
  const [open, setOpen] = useState(false);

  const gens = GENERATION_COLORS
    .slice(0, Math.min(maxGeneration, GENERATION_COLORS.length - 1) + 1)
    .map((color, i) => ({ color, label: `Generation ${i + 1}` }));

  return (
    <div className="absolute top-44 md:top-36 right-4 z-30 flex flex-col items-end">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle legend"
        title="Legend"
        className={`w-10 h-10 rounded-full bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border flex items-center justify-center transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.3)] ${
          open
            ? "border-[var(--thread-gold)] text-[var(--thread-gold)]"
            : "border-[var(--thread-gold-dim)]/30 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]/60"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <rect x="3.5" y="3.5" width="4" height="4" rx="1" />
          <rect x="12.5" y="3.5" width="4" height="4" rx="1" />
          <rect x="3.5" y="12.5" width="4" height="4" rx="1" />
          <rect x="12.5" y="12.5" width="4" height="4" rx="1" />
        </svg>
      </button>

      {open && (
        <div className="mt-2 w-56 max-h-[calc(100vh-10rem)] overflow-y-auto bg-[var(--tapestry-bg)]/95 backdrop-blur-md border border-[var(--thread-gold-dim)]/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="px-4 py-3 border-b border-[var(--thread-gold-dim)]/20">
            <h3 className="font-display text-sm text-[var(--thread-gold)] font-semibold">Legend</h3>
            <p className="text-[10px] text-[var(--parchment-dim)] mt-0.5">How to read the tapestry</p>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1.5">Ring colours = generation</div>
              <div className="space-y-1.5">
                {gens.map((g) => (
                  <div key={g.color} className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full border-2 shrink-0"
                      style={{ borderColor: g.color }}
                    />
                    <span className="text-[11px] text-[var(--parchment-dim)] font-body">{g.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--thread-gold-dim)]/15 pt-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--living-glow)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">Living</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full border-2 border-[var(--deceased-frame)] opacity-60 shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">Deceased (d. year)</span>
              </div>
            </div>

            <div className="border-t border-[var(--thread-gold-dim)]/15 pt-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-px bg-[var(--thread-gold)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">Marriage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t border-dashed border-[var(--ember-red)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">Divorce</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-px bg-[var(--deceased-frame)] shrink-0 opacity-70" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">Parent → child</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
