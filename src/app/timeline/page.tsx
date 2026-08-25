"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getAllEventsSorted, getPerson, persons } from "@/data/family";
import type { LifeEvent } from "@/data/family";

const EVENT_ICONS: Record<string, string> = {
  birth: "新生儿",
  death: "✝",
  marriage: "◆",
  divorce: "✕",
  career: "💼",
  education: "🎓",
  migration: "✈",
  achievement: "🏆",
  military: "⚔",
  other: "•",
};

const EVENT_COLORS: Record<string, string> = {
  birth: "var(--living-glow)",
  death: "var(--deceased-frame)",
  marriage: "var(--thread-gold)",
  divorce: "var(--ember-red)",
  career: "#4B7A9E",
  education: "#6B4C8B",
  migration: "#3E6B5C",
  achievement: "#C9A24B",
  military: "#8B6B5C",
  other: "var(--parchment-dim)",
};

export default function TimelinePage() {
  const allEvents = useMemo(() => getAllEventsSorted(), []);
  const generations = useMemo(() => {
    const gen1 = persons.filter((p) => ["p1", "p2", "p3"].includes(p.id));
    const gen2 = persons.filter((p) => ["p4", "p5", "p6", "p7", "p8"].includes(p.id));
    const gen3 = persons.filter((p) => ["p9", "p10", "p11", "p12"].includes(p.id));
    return [gen1, gen2, gen3];
  }, []);

  const yearGroups = useMemo(() => {
    const groups = new Map<number, (LifeEvent & { personName: string })[]>();
    for (const ev of allEvents) {
      const existing = groups.get(ev.year) ?? [];
      existing.push(ev);
      groups.set(ev.year, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [allEvents]);

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-[var(--thread-gold)]">Family Timeline</h1>
            <p className="text-xs text-[var(--parchment-dim)] mt-0.5">
              {allEvents.length} events across {persons.length} people
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 text-sm rounded-lg border border-[var(--thread-gold-dim)]/30 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]/60 transition-colors font-body"
            >
              ← Back to Tree
            </Link>
          </div>
        </div>
      </header>

      {/* Generation legend */}
      <div className="max-w-5xl mx-auto px-6 py-4 flex gap-6 text-xs text-[var(--parchment-dim)]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[var(--thread-gold)]" /> Generation 1
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[var(--living-glow)]" /> Generation 2
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[var(--accent-emerald)]" /> Generation 3
        </span>
      </div>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[140px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--thread-gold)]/30 via-[var(--thread-gold)]/20 to-transparent" />

          {yearGroups.map(([year, events]) => (
            <div key={year} className="relative flex gap-6 mb-8">
              {/* Year label */}
              <div className="w-[120px] text-right pt-1 shrink-0">
                <span className="font-display text-lg font-semibold text-[var(--thread-gold)]">{year}</span>
              </div>

              {/* Dot on timeline */}
              <div className="relative z-10 mt-2.5 shrink-0">
                <div className="w-[14px] h-[14px] rounded-full bg-[var(--tapestry-bg)] border-2 border-[var(--thread-gold)]" />
              </div>

              {/* Events */}
              <div className="flex-1 space-y-2 pt-0.5">
                {events.map((ev) => {
                  const person = getPerson(ev.personId);
                  const genIdx = generations.findIndex((g) => g.some((p) => p.id === ev.personId));
                  const genColor = genIdx === 0 ? "var(--thread-gold)" : genIdx === 1 ? "var(--living-glow)" : "var(--accent-emerald)";

                  return (
                    <Link
                      key={ev.id}
                      href={`/person/${ev.personId}`}
                      className="group block bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-[var(--thread-gold-dim)]/30 rounded-lg px-4 py-3 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 border"
                          style={{ borderColor: EVENT_COLORS[ev.type], color: EVENT_COLORS[ev.type] }}
                        >
                          {EVENT_ICONS[ev.type]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-body text-[var(--parchment)] group-hover:text-[var(--thread-gold)] transition-colors">
                              {ev.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] font-body px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: genColor + "15", color: genColor }}
                            >
                              {person?.fullName ?? "Unknown"}
                            </span>
                            {ev.place && (
                              <span className="text-[10px] text-[var(--parchment-dim)]/60">📍 {ev.place}</span>
                            )}
                          </div>
                          {ev.description && (
                            <p className="text-xs text-[var(--parchment-dim)] mt-1 leading-relaxed">{ev.description}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
