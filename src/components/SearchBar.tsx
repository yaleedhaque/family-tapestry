"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import type { PersonLike } from "@/components/InfoPanel";

interface SearchBarProps {
  persons: PersonLike[];
  onSelect: (person: PersonLike) => void;
}

export default function SearchBar({ persons, onSelect }: SearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rf = useReactFlow();

  const results = query.trim()
    ? persons.filter((p) => p.fullName.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : [];

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const jumpTo = useCallback(
    (person: PersonLike) => {
      const node = rf.getNode(person.id);
      if (node) {
        rf.setCenter(node.position.x + 80, node.position.y + 65, { zoom: 1.2, duration: 500 });
      }
      onSelect(person);
      setOpen(false);
    },
    [rf, onSelect]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !open && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const onKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIdx]) {
      jumpTo(results[selectedIdx]);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2.5 bg-[#0E0B0A]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]/60 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
        title="Search people (press /)"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <circle cx="8.5" cy="8.5" r="5.5" />
          <path d="M13 13l4 4" strokeLinecap="round" />
        </svg>
        <span className="font-body text-sm">Search the tapestry</span>
        <kbd className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-white/10 border border-white/10 font-mono">/</kbd>
      </button>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[380px] max-w-[90vw]">
      <div className="bg-[#0E0B0A]/95 backdrop-blur-md border border-[var(--thread-gold-dim)]/40 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--thread-gold-dim)]/20">
          <svg viewBox="0 0 20 20" fill="none" stroke="var(--thread-gold-dim)" strokeWidth="1.5" className="w-4 h-4 shrink-0">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4 4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            onKeyDown={onKeyNav}
            placeholder="Search by name..."
            className="flex-1 bg-transparent text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] rounded bg-white/10 border border-white/10 text-[var(--parchment-dim)] font-mono">
            esc
          </kbd>
        </div>

        {results.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            {results.map((p, i) => (
              <button
                key={p.id}
                onClick={() => jumpTo(p)}
                onMouseEnter={() => setSelectedIdx(i)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                  i === selectedIdx ? "bg-[var(--thread-gold)]/10" : "hover:bg-white/5"
                }`}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border"
                  style={{ borderColor: p.isAlive ? "var(--thread-gold)" : "var(--deceased-frame)" }}>
                  <span className="font-display text-[10px] font-bold"
                    style={{ color: p.isAlive ? "var(--thread-gold)" : "var(--deceased-frame)" }}>
                    {p.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-[var(--parchment)] font-body block truncate">{p.fullName}</span>
                  <span className="text-[10px] text-[var(--parchment-dim)]">{p.birthYear} – {p.deathYear ?? "present"}</span>
                </div>
                {p.isAlive === false && (
                  <span className="ml-auto text-[9px] text-[var(--deceased-frame)] italic shrink-0">deceased</span>
                )}
              </button>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-[var(--parchment-dim)] italic">No one found named &ldquo;{query}&rdquo;</p>
          </div>
        )}

        {!query && (
          <div className="px-4 py-4 text-center">
            <p className="text-xs text-[var(--parchment-dim)]/50">Start typing a name to search</p>
          </div>
        )}
      </div>
    </div>
  );
}
