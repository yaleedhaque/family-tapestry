"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";

export default function KeyboardHelp() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (!open) return null;

  const shortcuts = [
    { key: "/", desc: t("keyhelp.openSearch") },
    { key: "Esc", desc: t("keyhelp.deselect") },
    { key: "?", desc: t("keyhelp.toggle") },
    { key: "Click", desc: t("keyhelp.select") },
    { key: "Hover", desc: t("keyhelp.highlight") },
    { key: "Scroll", desc: t("keyhelp.zoom") },
    { key: "Drag", desc: t("keyhelp.pan") },
    { key: "Ctrl+Scroll", desc: t("keyhelp.zoomTrackpad") },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[90]" onClick={() => setOpen(false)} />
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[95] bg-[var(--tapestry-bg)]/95 backdrop-blur-md border border-[var(--popover-border)] rounded-xl p-5 w-[320px] shadow-[var(--popover-shadow)]">
        <h3 className="font-display text-sm text-[var(--thread-gold)] mb-3">{t("keyhelp.title")}</h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <kbd className="px-2 py-1 text-[10px] rounded bg-white/10 border border-white/10 font-mono text-[var(--parchment)] min-w-[40px] text-center">
                {s.key}
              </kbd>
              <span className="text-xs text-[var(--parchment-dim)] font-body">{s.desc}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setOpen(false)} className="mt-4 w-full text-center text-[10px] text-[var(--parchment-dim)]/50 hover:text-[var(--parchment-dim)]">
          Press ? or Esc to close
        </button>      </div>
    </>
  );
}
