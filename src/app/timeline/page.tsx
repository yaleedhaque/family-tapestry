"use client";

import { useMemo, useState, useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { getAllEventsSorted, persons as staticPersons, unions as staticUnions } from "@/data/family";
import type { LifeEvent } from "@/data/family";
import type { PersonLike, UnionLike } from "@/components/InfoPanel";
import { useAuth } from "@/components/AuthProvider";
import { useLiveTree } from "@/lib/useLiveTree";
import { toPersonLike, toUnionLike } from "@/lib/convert";

const EVENT_ICONS: Record<string, string> = {
  birth: "\u{1F476}",
  death: "\u{271D}",
  marriage: "\u{25C6}",
  divorce: "\u{2715}",
  career: "\u{1F4BC}",
  education: "\u{1F393}",
  migration: "\u{2708}",
  achievement: "\u{1F3C6}",
  military: "\u{2694}",
  other: "\u{2022}",
};

const EVENT_COLORS: Record<string, string> = {
  birth: "var(--living-glow)",
  death: "var(--deceased-frame)",
  marriage: "var(--thread-gold)",
  divorce: "var(--divorce-red)",
  career: "#4B7A9E",
  education: "#6B4C8B",
  migration: "#3E6B5C",
  achievement: "#C9A24B",
  military: "#8B6B5C",
  other: "var(--parchment-dim)",
};

const EVENT_TYPES = ["all", "birth", "death", "marriage", "divorce", "career", "education", "migration", "achievement", "military", "other"];

export default function TimelinePage() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([1800, 2030]);
  const [searchQuery, setSearchQuery] = useState("");
  const rangeInited = useRef(false);

  /* Live tree: fetches /api/tree, subscribes to realtime, refetches on focus —
     so people AND marriages/divorces added/removed anywhere appear instantly. */
  const live = useLiveTree();

  const persons: PersonLike[] = useMemo(() => {
    const livePs = (live.persons ?? []).map((p) => toPersonLike(p));
    if (livePs.length > 0) return livePs;
    if (user) return staticPersons;
    return staticPersons;
  }, [live.persons, user]);

  const unions: UnionLike[] = useMemo(() => {
    const liveUs = (live.unions ?? []).map(toUnionLike);
    if (liveUs.length > 0) return liveUs;
    return staticUnions.map((u) => ({ ...u }));
  }, [live.unions]);

  const allEvents = useMemo(() => {
    const staticEvents = getAllEventsSorted();
    const personMap = new Map(persons.map((p) => [p.id, p]));

    const derivedEvents: LifeEvent[] = [];
    for (const p of persons) {
      if (p.birthYear) {
        derivedEvents.push({
          id: `${p.id}-birth`,
          personId: p.id,
          year: p.birthYear,
          type: "birth",
          title: `Born: ${p.fullName}`,
          place: p.birthPlace || undefined,
        });
      }
      if (p.deathYear) {
        derivedEvents.push({
          id: `${p.id}-death`,
          personId: p.id,
          year: p.deathYear,
          type: "death",
          title: `Died: ${p.fullName}`,
          place: undefined,
        });
      }
      if (p.profession) {
        derivedEvents.push({
          id: `${p.id}-career`,
          personId: p.id,
          year: p.birthYear ? p.birthYear + 22 : 1900,
          type: "career",
          title: `${p.fullName} — ${p.profession}`,
          place: p.birthPlace || undefined,
        });
      }
    }

    for (const u of unions) {
      if (u.startYear) {
        const pA = personMap.get(u.partnerA);
        const pB = personMap.get(u.partnerB);
        if (pA && pB) {
          const evType = u.type === "divorced" ? "divorce" : "marriage";
          derivedEvents.push({
            id: `${u.id}-union`,
            personId: u.partnerA,
            year: u.startYear,
            type: evType,
            title: `${evType === "divorce" ? "Divorced" : "Married"}: ${pA.fullName} & ${pB.fullName}`,
          });
        }
      }
    }

    const seen = new Set<string>();
    const merged: LifeEvent[] = [];
    for (const ev of [...derivedEvents, ...staticEvents]) {
      const key = `${ev.personId}-${ev.year}-${ev.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        const person = personMap.get(ev.personId);
        merged.push({ ...ev, title: ev.title || `${ev.type}: ${person?.fullName ?? "Unknown"}` });
      }
    }

    return merged.sort((a, b) => a.year - b.year);
  }, [persons, unions]);

  const yearBounds = useMemo(() => {
    const years = allEvents.map((e) => e.year).filter((y): y is number => typeof y === "number");
    if (years.length === 0) return { min: 1800, max: 2030 };
    let min = Infinity, max = -Infinity;
    for (const y of years) { if (y < min) min = y; if (y > max) max = y; }
    return { min, max };
  }, [allEvents]);

  useEffect(() => {
    if (rangeInited.current) return;
    if (allEvents.length > 0) {
      rangeInited.current = true;
      const pad = 5;
      setYearRange([Math.max(0, yearBounds.min - pad), yearBounds.max + pad]);
    }
  }, [allEvents, yearBounds]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      if (selectedType !== "all" && ev.type !== selectedType) return false;
      if (selectedPerson && ev.personId !== selectedPerson) return false;
      if (ev.year < yearRange[0] || ev.year > yearRange[1]) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const person = persons.find((p) => p.id === ev.personId);
        if (
          !ev.title.toLowerCase().includes(q) &&
          !(person?.fullName.toLowerCase().includes(q)) &&
          !(ev.place?.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [allEvents, selectedType, selectedPerson, yearRange, searchQuery, persons]);

  const yearGroups = useMemo(() => {
    const groups = new Map<number, LifeEvent[]>();
    for (const ev of filteredEvents) {
      const existing = groups.get(ev.year) ?? [];
      existing.push(ev);
      groups.set(ev.year, existing);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [filteredEvents]);

  const stats = useMemo(() => {
    const types = new Map<string, number>();
    for (const ev of filteredEvents) {
      types.set(ev.type, (types.get(ev.type) ?? 0) + 1);
    }
    return { total: filteredEvents.length, types };
  }, [filteredEvents]);

  const uniquePersons = useMemo(() => {
    const seen = new Set<string>();
    return persons.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return allEvents.some((e) => e.personId === p.id);
    }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [persons, allEvents]);

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-semibold text-[var(--thread-gold)]">Family Timeline</h1>
            <p className="text-[10px] md:text-xs text-[var(--parchment-dim)] mt-0.5">
              {stats.total} events across {persons.length} people
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/"
              className="px-3 md:px-4 py-1.5 md:py-2 text-xs rounded-lg border border-[var(--thread-gold-dim)]/30 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]/60 transition-colors font-body"
            >
              ← Tree
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 md:py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search events, people, places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded-lg px-4 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {EVENT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 text-[10px] md:text-xs rounded-full whitespace-nowrap transition-colors font-body border ${
                selectedType === type
                  ? "bg-[var(--thread-gold)] text-[var(--tapestry-bg)] border-[var(--thread-gold)]"
                  : "bg-[var(--tapestry-bg-alt)] text-[var(--parchment-dim)] border-[var(--thread-gold-dim)]/40 hover:border-[var(--thread-gold-dim)] hover:text-[var(--parchment)]"
              }`}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
              {type !== "all" && stats.types.get(type) ? (
                <span className="ml-1 opacity-60">{stats.types.get(type)}</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Person filter */}
        <div className="flex items-center gap-3">
          <select
            value={selectedPerson ?? ""}
            onChange={(e) => setSelectedPerson(e.target.value || null)}
            className="flex-1 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded-lg px-3 py-2 text-xs text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]"
          >
            <option value="">All people</option>
            {uniquePersons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-[10px] text-[var(--parchment-dim)]">
            <span aria-hidden="true">{yearRange[0]}</span>
            <input
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearRange[0]}
              aria-label="From year"
              aria-valuetext={`From year ${yearRange[0]}`}
              onChange={(e) => setYearRange([Number(e.target.value), Math.max(Number(e.target.value), yearRange[1])])}
              className="w-16 md:w-24 tapestry-range"
              style={{ "--fill": `${((yearRange[0] - yearBounds.min) / Math.max(1, yearBounds.max - yearBounds.min)) * 100}%` } as CSSProperties}
            />
            <span aria-hidden="true">—</span>
            <input
              type="range"
              min={yearBounds.min}
              max={yearBounds.max}
              value={yearRange[1]}
              aria-label="To year"
              aria-valuetext={`To year ${yearRange[1]}`}
              onChange={(e) => setYearRange([Math.min(Number(e.target.value), yearRange[0]), Number(e.target.value)])}
              className="w-16 md:w-24 tapestry-range"
              style={{ "--fill": `${((yearRange[1] - yearBounds.min) / Math.max(1, yearBounds.max - yearBounds.min)) * 100}%` } as CSSProperties}
            />
            <span aria-hidden="true">{yearRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-24 md:pb-20">
        {yearGroups.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[var(--parchment-dim)] text-sm">No events match your filters.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[80px] md:left-[140px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--thread-gold)]/30 via-[var(--thread-gold)]/20 to-transparent" />

            {yearGroups.map(([year, events]) => (
              <div key={year} className="relative flex gap-3 md:gap-6 mb-6 md:mb-8">
                {/* Year label */}
                <div className="w-[60px] md:w-[120px] text-right pt-1 shrink-0">
                  <span className="font-display text-base md:text-lg font-semibold text-[var(--thread-gold)]">{year}</span>
                </div>

                {/* Dot on timeline */}
                <div className="relative z-10 mt-2.5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[var(--tapestry-bg)] border-2 border-[var(--thread-gold)]" />
                </div>

                {/* Events */}
                <div className="flex-1 space-y-2 pt-0.5">
                  {events.map((ev) => {
                    const person = persons.find((p) => p.id === ev.personId);
                    const isExpanded = expandedEvent === ev.id;

                    return (
                      <div key={ev.id}>
                        <button
                          onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                          className="w-full text-left group block bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] hover:border-[var(--thread-gold-dim)]/30 rounded-lg px-3 md:px-4 py-2.5 md:py-3 transition-all"
                        >
                          <div className="flex items-start gap-2 md:gap-3">
                            <span
                              className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[10px] md:text-xs shrink-0 border"
                              style={{ borderColor: EVENT_COLORS[ev.type], color: EVENT_COLORS[ev.type] }}
                            >
                              {EVENT_ICONS[ev.type]}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs md:text-sm font-body text-[var(--parchment)] group-hover:text-[var(--thread-gold)] transition-colors">
                                  {ev.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {person && (
                                  <Link
                                    href={`/person/${ev.personId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] font-body px-1.5 py-0.5 rounded-full hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: "var(--thread-gold)" + "15", color: "var(--thread-gold)" }}
                                  >
                                    {person.fullName}
                                  </Link>
                                )}
                                {ev.place && (
                                  <span className="text-[9px] md:text-[10px] text-[var(--parchment-dim)]/60">📍 {ev.place}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[var(--parchment-dim)] text-xs shrink-0 mt-1">
                              {isExpanded ? "▾" : "▸"}
                            </span>
                          </div>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="ml-8 md:ml-12 mt-1 mb-2 p-3 bg-white/[0.03] rounded-lg border border-[var(--thread-gold-dim)]/20 animate-slide-in">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: EVENT_COLORS[ev.type] + "20", color: EVENT_COLORS[ev.type] }}
                                >
                                  {ev.type}
                                </span>
                                <span className="text-[10px] text-[var(--parchment-dim)]">{ev.year}</span>
                              </div>
                              {ev.description && (
                                <p className="text-xs text-[var(--parchment-dim)] leading-relaxed">{ev.description}</p>
                              )}
                              {ev.place && (
                                <p className="text-[10px] text-[var(--parchment-dim)]">📍 {ev.place}</p>
                              )}
                              {person && (
                                <Link
                                  href={`/person/${ev.personId}`}
                                  className="inline-flex items-center gap-1 text-[10px] text-[var(--thread-gold)] hover:underline"
                                >
                                  View {person.fullName}&apos;s full profile →
                                </Link>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
