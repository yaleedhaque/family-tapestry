"use client";

import { useEffect, useState } from "react";

export default function TapestryBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-1000 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      }`}
    >
      <div className="relative px-8 py-4 bg-[var(--tapestry-bg)]/80 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 rounded-lg shadow-[0_0_40px_rgba(201,162,75,0.08)]">
        {/* top ornament line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px flex items-center gap-2">
          <span className="block w-8 h-px bg-gradient-to-r from-transparent to-[var(--thread-gold)]/50" />
          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[var(--thread-gold)]/60">
            <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5Z" fill="currentColor" />
          </svg>
          <span className="block w-8 h-px bg-gradient-to-l from-transparent to-[var(--thread-gold)]/50" />
        </div>

        {/* title */}
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--thread-gold)] tracking-wide text-center leading-tight">
          The Haque Tapestry
        </h1>

        {/* subtitle */}
        <p className="font-body text-[10px] md:text-xs text-[var(--parchment-dim)]/70 tracking-[0.25em] uppercase text-center mt-1">
          A Living Chronicle
        </p>

        {/* bottom ornament line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-px flex items-center gap-2">
          <span className="block w-12 h-px bg-gradient-to-r from-transparent to-[var(--thread-gold)]/40" />
          <svg viewBox="0 0 8 8" className="w-1.5 h-1.5 text-[var(--thread-gold)]/40 rotate-45">
            <rect width="8" height="8" fill="currentColor" />
          </svg>
          <span className="block w-12 h-px bg-gradient-to-l from-transparent to-[var(--thread-gold)]/40" />
        </div>
      </div>
    </div>
  );
}
