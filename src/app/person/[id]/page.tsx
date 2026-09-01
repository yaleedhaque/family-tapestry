"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPerson as getStaticPerson, getPersonEvents as getStaticEvents, persons as staticPersons, unions as staticUnions, parentEdges as staticEdges } from "@/data/family";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import type { LifeEvent } from "@/data/family";
import { useAuth } from "@/components/AuthProvider";
import { fetchFamilyData } from "@/lib/data";
import type { DbPerson } from "@/lib/types";

const EVENT_COLORS: Record<string, string> = {
  birth: "var(--living-glow)", death: "var(--deceased-frame)",
  marriage: "var(--thread-gold)", divorce: "var(--divorce-red)",
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

function toPersonLike(p: PersonLike | DbPerson): PersonLike {
  if ("fullName" in p && "birthPlace" in p) return p as PersonLike;
  const dp = p as DbPerson;
  return {
    id: dp.id, fullName: dp.full_name, birthYear: dp.birth_year, deathYear: dp.death_year,
    isAlive: dp.is_alive, bio: dp.bio ?? "", birthPlace: dp.birth_place ?? "",
    profession: dp.profession ?? "", email: "", phone: "", address: "", website: "",
    lat: null, lng: null, photoUrl: dp.photo_url ?? "",
  };
}

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [persons, setPersons] = useState<PersonLike[]>(staticPersons);
  const [unions, setUnions] = useState<UnionLike[]>(staticUnions.map((u) => ({ ...u })));
  const [parentEdges, setParentEdges] = useState<EdgeLike[]>(staticEdges.map((e) => ({ ...e })));

  useEffect(() => {
    if (user) {
      fetch("/api/tree")
        .then((r) => r.json())
        .then((db) => {
          if (db.persons?.length > 0) {
            setPersons(db.persons.map(toPersonLike));
            setUnions(db.unions.map((u: Record<string, unknown>) => ({
              id: u.id as string, partnerA: (u.partner_a ?? u.partnerA) as string,
              partnerB: (u.partner_b ?? u.partnerB) as string,
              type: (u.union_type ?? u.type) as string,
              startYear: (u.start_year ?? u.startYear) as number | null,
              endYear: (u.end_year ?? u.endYear) as number | null,
            })));
            setParentEdges(db.edges.map((e: Record<string, unknown>) => ({
              unionId: (e.union_id ?? e.unionId) as string,
              childId: (e.child_id ?? e.childId) as string,
            })));
          }
        })
        .catch(() => {});
    } else {
      fetchFamilyData()
        .then((data) => {
          if (data.persons.length > 0) {
            setPersons(data.persons.map(toPersonLike));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const person = useMemo(() => persons.find((p) => p.id === id) ?? getStaticPerson(id), [persons, id]);

  const [dbEvents] = useState<LifeEvent[]>([]);

  const events = useMemo(() => {
    if (dbEvents.length > 0) return dbEvents.filter((e) => e.personId === id);
    return getStaticEvents(id);
  }, [dbEvents, id]);

  const relationships = useMemo(() => {
    if (!person) return { parents: [] as { name: string; id: string }[], partners: [] as { name: string; id: string; union: string; type: string }[], children: [] as { name: string; id: string }[], siblings: [] as { name: string; id: string }[] };

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

    const partners: { name: string; id: string; union: string; type: string }[] = [];
    for (const u of unions) {
      if (u.partnerA === person.id) {
        const p = persons.find((pp) => pp.id === u.partnerB);
        if (p) partners.push({ name: p.fullName, id: p.id, union: `${u.type} · ${u.startYear ?? "?"}`, type: u.type });
      } else if (u.partnerB === person.id) {
        const p = persons.find((pp) => pp.id === u.partnerA);
        if (p) partners.push({ name: p.fullName, id: p.id, union: `${u.type} · ${u.startYear ?? "?"}`, type: u.type });
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

    const siblingIds = new Set<string>();
    for (const pe of parentEdges) {
      const union = unions.find((u) => u.id === pe.unionId);
      if (union && (union.partnerA === person.id || union.partnerB === person.id)) {
        for (const pe2 of parentEdges) {
          if (pe2.unionId === pe.unionId && pe2.childId !== person.id) {
            siblingIds.add(pe2.childId);
          }
        }
      }
    }
    const siblings = Array.from(siblingIds)
      .map((sid) => persons.find((p) => p.id === sid))
      .filter((p): p is PersonLike => !!p)
      .map((p) => ({ name: p.fullName, id: p.id }));

    return { parents, partners, children, siblings };
  }, [person, persons, unions, parentEdges]);

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
  const age = person.birthYear ? (person.deathYear ?? new Date().getFullYear()) - person.birthYear : null;

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] text-[var(--parchment)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--tapestry-bg)]/90 backdrop-blur-md border-b border-[var(--thread-gold-dim)]/20">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center gap-3 md:gap-4">
          <Link href="/" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-xs md:text-sm">
            ← Tree
          </Link>
          <Link href="/timeline" className="text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-xs md:text-sm">
            Timeline
          </Link>
          <div className="flex-1" />
          <span className="text-[10px] md:text-xs text-[var(--parchment-dim)]">Person Profile</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8 md:mb-10">
          <div
            className={`w-24 h-24 md:w-28 md:h-28 rounded-full border-3 flex items-center justify-center mb-4 md:mb-5 overflow-hidden ${isDeceased ? "grayscale" : ""}`}
            style={{ borderWidth: 3, borderColor: isDeceased ? "var(--deceased-frame)" : avatarColor }}
          >
            {person.photoUrl ? (
              <img src={person.photoUrl} alt={person.fullName} className="w-full h-full object-cover" />
            ) : (
              <span
                className="font-display text-2xl md:text-3xl font-bold select-none"
                style={{ color: isDeceased ? "var(--deceased-frame)" : avatarColor, opacity: isDeceased ? 0.5 : 0.85 }}
              >
                {initials}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold text-[var(--parchment)]">{person.fullName}</h1>
          <p className="text-xs md:text-sm text-[var(--parchment-dim)] mt-1">
            {person.birthYear} – {person.deathYear ?? "present"} · {person.birthPlace}
            {age && <span className="ml-2 opacity-60">({age} years{isDeceased ? "" : " old"})</span>}
          </p>
          {person.profession && (
            <p className="text-xs text-[var(--thread-gold-dim)] mt-2 italic">{person.profession}</p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2 h-2 rounded-full ${person.isAlive ? "bg-[var(--living-glow)]" : "bg-[var(--deceased-frame)]"}`} />
            <span className="text-[10px] text-[var(--parchment-dim)]">{person.isAlive ? "Living" : "Deceased"}</span>
          </div>
        </div>

        {/* Bio */}
        {person.bio && (
          <section className="mb-8 md:mb-10">
            <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-3">About</h2>
            <p className="text-xs md:text-sm text-[var(--parchment-dim)] leading-relaxed font-body whitespace-pre-wrap">{person.bio}</p>
          </section>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 md:mb-10">
          <QuickStat label="Born" value={person.birthYear ? String(person.birthYear) : "—"} />
          <QuickStat label="Died" value={person.deathYear ? String(person.deathYear) : person.isAlive ? "Living" : "—"} />
          <QuickStat label="Age" value={age ? `${age} yrs` : "—"} />
          <QuickStat label="Location" value={person.birthPlace || "—"} />
        </div>

        {/* Relationships */}
        {(relationships.parents.length > 0 || relationships.partners.length > 0 || relationships.children.length > 0 || relationships.siblings.length > 0) && (
          <section className="mb-8 md:mb-10">
            <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-4">Relationships</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {relationships.parents.length > 0 && (
                <RelCard title="Parents" items={relationships.parents.map((r) => ({ id: r.id, label: r.name }))} />
              )}
              {relationships.partners.length > 0 && (
                <RelCard
                  title="Partners"
                  items={relationships.partners.map((r) => ({ id: r.id, label: r.name, sub: r.union, badge: r.type === "divorced" ? "divorced" : undefined }))}
                />
              )}
              {relationships.children.length > 0 && (
                <RelCard title="Children" items={relationships.children.map((r) => ({ id: r.id, label: r.name }))} />
              )}
              {relationships.siblings.length > 0 && (
                <RelCard title="Siblings" items={relationships.siblings.map((r) => ({ id: r.id, label: r.name }))} />
              )}
            </div>
          </section>
        )}

        {/* Contact */}
        {(person.email || person.phone || person.address || person.website) && (
          <section className="mb-8 md:mb-10">
            <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-3">Contact</h2>
            <div className="bg-white/[0.03] rounded-lg p-4 border border-white/[0.05] space-y-2">
              {person.email && (
                <ContactRow label="Email" value={person.email} href={`mailto:${person.email}`} />
              )}
              {person.phone && (
                <ContactRow label="Phone" value={person.phone} href={`tel:${person.phone}`} />
              )}
              {person.address && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] w-14 md:w-16 shrink-0">Address</span>
                  <span className="text-xs md:text-sm text-[var(--parchment-dim)]">{person.address}</span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(person.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/25 transition-colors font-body"
                    title="Open in Google Maps to drive there"
                  >
                    📍 Drop pin on map
                  </a>
                </div>
              )}
              {person.website && (
                <ContactRow label="Web" value={person.website.replace(/^https?:\/\//, "")} href={person.website} external />
              )}
            </div>
          </section>
        )}

        {/* Life Events Timeline */}
        {events.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-4">Life Events</h2>
            <div className="relative pl-6 md:pl-8">
              <div className="absolute left-[9px] md:left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--thread-gold)]/30 to-transparent" />
              {events.map((ev) => (
                <div key={ev.id} className="relative mb-5 md:mb-6 last:mb-0">
                  <div
                    className="absolute left-[-19px] md:left-[-25px] top-1.5 w-[10px] md:w-[12px] h-[10px] md:h-[12px] rounded-full border-2 bg-[var(--tapestry-bg)]"
                    style={{ borderColor: EVENT_COLORS[ev.type] }}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] md:text-xs font-mono text-[var(--thread-gold-dim)]">{ev.year}</span>
                      <span className="text-xs md:text-sm text-[var(--parchment)]">{ev.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ev.place && <span className="text-[9px] md:text-[10px] text-[var(--parchment-dim)]/60">📍 {ev.place}</span>}
                      <span
                        className="text-[9px] md:text-[10px] px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: EVENT_COLORS[ev.type] + "15", color: EVENT_COLORS[ev.type] }}
                      >
                        {ev.type}
                      </span>
                    </div>
                    {ev.description && (
                      <p className="text-[10px] md:text-xs text-[var(--parchment-dim)] mt-1 leading-relaxed">{ev.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photo gallery placeholder */}
        {person.photoUrl && (
          <section className="mb-10">
            <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-3">Photo</h2>
            <div className="rounded-xl overflow-hidden border border-[var(--thread-gold-dim)]/20">
              <img
                src={person.photoUrl}
                alt={person.fullName}
                className="w-full max-h-[400px] object-cover"
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.05] text-center">
      <p className="text-[9px] md:text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1">{label}</p>
      <p className="text-xs md:text-sm text-[var(--parchment)] font-body truncate">{value}</p>
    </div>
  );
}

function ContactRow({ label, value, href, external }: { label: string; value: string; href?: string; external?: boolean }) {
  const content = href ? (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-xs md:text-sm text-[var(--thread-gold)] hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="text-xs md:text-sm text-[var(--parchment-dim)]">{value}</span>
  );

  return (
    <div className="flex items-center gap-3">
      <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] w-14 md:w-16 shrink-0">{label}</span>
      {content}
    </div>
  );
}

function RelCard({ title, items }: { title: string; items: { id: string; label: string; sub?: string; badge?: string }[] }) {
  return (
    <div className="bg-white/[0.03] rounded-lg p-3 md:p-4 border border-white/[0.05]">
      <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-[var(--thread-gold-dim)] mb-2">{title}</h3>
      {items.map((r) => (
        <div key={r.id} className="mb-1.5 last:mb-0">
          <Link href={`/person/${r.id}`} className="text-xs md:text-sm text-[var(--parchment)] hover:text-[var(--thread-gold)] transition-colors">
            {r.label}
          </Link>
          {r.badge && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[var(--ember-red)]/15 text-[var(--ember-red)]">{r.badge}</span>}
          {r.sub && <p className="text-[9px] md:text-[10px] text-[var(--parchment-dim)]">{r.sub}</p>}
        </div>
      ))}
    </div>
  );
}
