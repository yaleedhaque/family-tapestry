"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPerson, getPersonEvents, persons, unions, parentEdges } from "@/data/family";

const EVENT_COLORS: Record<string, string> = {
  birth: "var(--living-glow)", death: "var(--deceased-frame)",
  marriage: "var(--thread-gold)", divorce: "var(--ember-red)",
  career: "#4B7A9E", education: "#6B4C8B",
  migration: "#3E6B5C", achievement: "#C9A24B",
  military: "#8B6B5C", other: "var(--parchment-dim)",
};

const AVATAR_COLORS = [
  "#C9A24B", "#8B2E2E", "#3E6B5C", "#D98B3E", "#6B4C8B",
  "#4B7A9E", "#9E6B4B", "#5C8B6B", "#8B6B5C", "#4B6B8B",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const person = getPerson(id);

  const events = useMemo(() => (id ? getPersonEvents(id) : []), [id]);

  const relationships = useMemo(() => {
    if (!person) return { parents: [] as { name: string; id: string }[], partners: [] as { name: string; id: string; union: string }[], children: [] as { name: string; id: string }[] };

    const parents: { name: string; id: string }[] = [];
    for (const pe of parentEdges) {
      if (pe.childId === person.id) {
        const union = unions.find((u) => u.id === pe.unionId);
        if (union) {
          if (union.partnerA) { const p = persons.find((pp) => pp.id === union.partnerA); if (p) parents.push({ name: p.fullName, id: p.id }); }
          if (union.partnerB) { const p = persons.find((pp) => pp.id === union.partnerB); if (p) parents.push({ name: p.fullName, id: p.id }); }
        }
      }
    }

    const partners: { name: string; id: string; union: string }[] = [];
    for (const u of unions) {
      if (u.partnerA === person.id) {
        const p = persons.find((pp) => pp.id === u.partnerB);
        if (p) partners.push({ name: p.fullName, id: p.id, union: `${u.type} · ${u.startYear}` });
      } else if (u.partnerB === person.id) {
        const p = persons.find((pp) => pp.id === u.partnerA);
        if (p) partners.push({ name: p.fullName, id: p.id, union: `${u.type} · ${u.startYear}` });
      }
    }

    const children: { name: string; id: string }[] = [];
    for (const pe of parentEdges) {
      const union = unions.find((u) => u.id === pe.unionId);
      if (union && (union.partnerA === person.id || union.partnerB === person.id)) {
        const child = persons.find((p) => p.id === pe.childId);
        if (child) children.push({ name: child.fullName, id: child.id });
      }
    }

    return { parents, partners, children };
  }, [person]);

  if (!person) {
    return (
      <div className="min-h-screen bg-[var(--tapestry-bg)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl text-[var(--parchment)] mb-4">Person not found</h1>
          <Link href="/" className="text-sm text-[var(--thread-gold)] hover:underline">← Back to Tree</Link>
        </div>
      </div>
    );
  }

  const isDeceased = !person.isAlive;
  const avatarColor = AVATAR_COLORS[hashName(person.fullName) % AVATAR_COLORS.length];
  const initials = person.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm">
            ← Tree
          </Link>
          <Link href="/timeline" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm">
            Timeline
          </Link>
          <div className="flex-1" />
          <span className="text-xs text-[var(--parchment-dim)]">Person Profile</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-10">
          <div
            className={`w-28 h-28 rounded-full border-3 flex items-center justify-center mb-5 overflow-hidden ${isDeceased ? "grayscale" : ""}`}
            style={{ borderWidth: 3, borderColor: isDeceased ? "var(--deceased-frame)" : avatarColor }}
          >
            {person.photoUrl ? (
              <img src={person.photoUrl} alt={person.fullName} className="w-full h-full object-cover" />
            ) : (
              <span
                className="font-display text-3xl font-bold select-none"
                style={{ color: isDeceased ? "var(--deceased-frame)" : avatarColor, opacity: isDeceased ? 0.5 : 0.85 }}
              >
                {initials}
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold text-[var(--parchment)]">{person.fullName}</h1>
          <p className="text-sm text-[var(--parchment-dim)] mt-1">
            {person.birthYear} – {person.deathYear ?? "present"} · {person.birthPlace}
          </p>
          {person.profession && (
            <p className="text-xs text-[var(--thread-gold-dim)] mt-2 italic">{person.profession}</p>
          )}
        </div>

        {/* Bio */}
        {person.bio && (
          <section className="mb-10">
            <h2 className="font-display text-lg text-[var(--thread-gold)] mb-3">About</h2>
            <p className="text-sm text-[var(--parchment-dim)] leading-relaxed font-body">{person.bio}</p>
          </section>
        )}

        {/* Contact */}
        {(person.email || person.phone || person.address || person.website) && (
          <section className="mb-10">
            <h2 className="font-display text-lg text-[var(--thread-gold)] mb-3">Contact</h2>
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05] space-y-2">
              {person.email && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] w-16 shrink-0">Email</span>
                  <a href={`mailto:${person.email}`} className="text-sm text-[var(--parchment)] hover:text-[var(--thread-gold)] transition-colors">{person.email}</a>
                </div>
              )}
              {person.phone && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] w-16 shrink-0">Phone</span>
                  <a href={`tel:${person.phone}`} className="text-sm text-[var(--parchment)] hover:text-[var(--thread-gold)] transition-colors">{person.phone}</a>
                </div>
              )}
              {person.address && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] w-16 shrink-0">Address</span>
                  <span className="text-sm text-[var(--parchment-dim)]">{person.address}</span>
                </div>
              )}
              {person.website && (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] w-16 shrink-0">Web</span>
                  <a href={person.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--thread-gold)] hover:underline">{person.website.replace(/^https?:\/\//, "")}</a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Relationships */}
        {(relationships.parents.length > 0 || relationships.partners.length > 0 || relationships.children.length > 0) && (
          <section className="mb-10">
            <h2 className="font-display text-lg text-[var(--thread-gold)] mb-4">Relationships</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relationships.parents.length > 0 && (
                <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
                  <h3 className="text-xs uppercase tracking-wider text-[var(--thread-gold-dim)] mb-2">Parents</h3>
                  {relationships.parents.map((r) => (
                    <Link key={r.id} href={`/person/${r.id}`} className="block text-sm text-[var(--parchment)] hover:text-[var(--thread-gold)] transition-colors mb-1">
                      {r.name}
                    </Link>
                  ))}
                </div>
              )}
              {relationships.partners.length > 0 && (
                <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
                  <h3 className="text-xs uppercase tracking-wider text-[var(--thread-gold-dim)] mb-2">Partners</h3>
                  {relationships.partners.map((r) => (
                    <div key={r.id} className="mb-1">
                      <Link href={`/person/${r.id}`} className="block text-sm text-[var(--parchment)] hover:text-[var(--thread-gold)] transition-colors">
                        {r.name}
                      </Link>
                      <span className="text-[10px] text-[var(--parchment-dim)]">{r.union}</span>
                    </div>
                  ))}
                </div>
              )}
              {relationships.children.length > 0 && (
                <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05]">
                  <h3 className="text-xs uppercase tracking-wider text-[var(--thread-gold-dim)] mb-2">Children</h3>
                  {relationships.children.map((r) => (
                    <Link key={r.id} href={`/person/${r.id}`} className="block text-sm text-[var(--parchment)] hover:text-[var(--thread-gold)] transition-colors mb-1">
                      {r.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Life Events Timeline */}
        {events.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-lg text-[var(--thread-gold)] mb-4">Life Events</h2>
            <div className="relative pl-8">
              <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--thread-gold)]/30 to-transparent" />
              {events.map((ev) => (
                <div key={ev.id} className="relative mb-6 last:mb-0">
                  <div
                    className="absolute left-[-25px] top-1.5 w-[12px] h-[12px] rounded-full border-2 bg-[var(--tapestry-bg)]"
                    style={{ borderColor: EVENT_COLORS[ev.type] }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-[var(--thread-gold-dim)]">{ev.year}</span>
                      <span className="text-sm text-[var(--parchment)]">{ev.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {ev.place && <span className="text-[10px] text-[var(--parchment-dim)]/60">📍 {ev.place}</span>}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: EVENT_COLORS[ev.type] + "15", color: EVENT_COLORS[ev.type] }}
                      >
                        {ev.type}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-xs text-[var(--parchment-dim)] mt-1 leading-relaxed">{ev.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
