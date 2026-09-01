"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, LANGS } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Language"
        className="px-2.5 py-2 text-xs rounded-lg bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--panel-border)] text-[var(--parchment)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)] transition-colors font-body flex items-center gap-1.5"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5">
          <circle cx="10" cy="10" r="8" />
          <path d="M2 10h16M10 2c2.5 2.3 2.5 13.7 0 16M10 2C7.5 4.3 7.5 15.7 10 18" strokeLinecap="round" />
        </svg>
        {current.label}
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-36 py-1 rounded-lg bg-[var(--tapestry-bg-alt)] border border-[var(--panel-border)] shadow-[var(--popover-shadow)] overflow-hidden z-[60]"
          dir="ltr"
        >
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => { setLang(l.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-body transition-colors ${
                l.code === lang
                  ? "text-[var(--thread-gold)] bg-[var(--thread-gold)]/10"
                  : "text-[var(--parchment)] hover:bg-white/5"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
