"use client";

import { useEffect, useState } from "react";

export default function KeyboardHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.shiftKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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
    { key: "/", desc: "Open search" },
    { key: "Esc", desc: "Deselect / close panel" },
    { key: "?", desc: "Toggle this help" },
    { key: "Click", desc: "Select a person" },
    { key: "Hover", desc: "Highlight connected family" },
    { key: "Scroll", desc: "Zoom in/out" },
    { key: "Drag", desc: "Pan the canvas" },
    { key: "Ctrl+Scroll", desc: "Zoom (trackpad)" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setOpen(false)} />
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[65] bg-[#0E0B0A]/95 backdrop-blur-md border border-[var(--thread-gold-dim)]/30 rounded-xl p-5 w-[320px] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <h3 className="font-display text-sm text-[var(--thread-gold)] mb-3">Keyboard Shortcuts</h3>
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
        </button>
      </div>
    </>
  );
}
