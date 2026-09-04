"use client";

import { useState } from "react";
import { STATUS_RING_COLORS } from "@/lib/generation";
import { useLang } from "@/lib/i18n";

export default function Legend() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute max-md:top-40 md:top-36 right-4 z-30 flex flex-col items-end">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Toggle legend"
        title="Legend"
        className={`w-10 h-10 rounded-full bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border flex items-center justify-center transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.3)] ${
          open
            ? "border-[var(--thread-gold)] text-[var(--thread-gold)] bg-[var(--tapestry-bg-alt)]"
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
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-[var(--overlay-scrim)] md:hidden"
          />
          <div className="fixed md:absolute right-4 top-[88px] md:top-36 z-40 w-[min(240px,calc(100vw-32px))] md:max-h-[calc(100vh-140px)] max-h-[calc(100vh-140px)] overflow-y-auto bg-[var(--tapestry-bg-alt)]/98 backdrop-blur-md border border-[var(--popover-border)] rounded-[var(--radius-lg)] shadow-[var(--popover-shadow)]">

          <div className="px-4 py-3 border-b border-[var(--thread-gold-dim)]/20">
            <h3 className="font-display text-sm text-[var(--thread-gold)] font-semibold">{t("tree.legend")}</h3>
            <p className="text-[10px] text-[var(--parchment-dim)] mt-0.5">{t("legend.subtitle")}</p>
          </div>

          <div className="px-4 py-3 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1.5">{t("legend.ringStatus")}</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 shrink-0"
                    style={{ borderColor: STATUS_RING_COLORS.living }}
                  />
                  <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.living")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 shrink-0"
                    style={{ borderColor: STATUS_RING_COLORS.deceased }}
                  />
                  <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.deceasedD")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 shrink-0"
                    style={{ borderColor: STATUS_RING_COLORS.divorced }}
                  />
                  <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.divorced")}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--thread-gold-dim)]/15 pt-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-4 h-px bg-[var(--thread-gold)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.marriage")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t border-dashed border-[var(--ember-red)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.divorce")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-px bg-[var(--deceased-frame)] shrink-0 opacity-70" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.parentChild")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dashed border-[var(--accent-emerald)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.adopted")}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 border-t-2 border-dashed border-[var(--link)] shrink-0" />
                <span className="text-[11px] text-[var(--parchment-dim)] font-body">{t("legend.step")}</span>
              </div>
            </div>
          </div>
        </div>
      </>)}
    </div>
  );
}
