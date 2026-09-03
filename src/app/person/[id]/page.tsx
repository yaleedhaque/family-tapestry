"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getPerson as getStaticPerson, getPersonEvents as getStaticEvents, persons as staticPersons, unions as staticUnions, parentEdges as staticEdges } from "@/data/family";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import type { LifeEvent } from "@/data/family";
import { useLiveTree } from "@/lib/useLiveTree";
import { useUserCircle } from "@/lib/useUserCircle";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/lib/i18n";
import { cachedPhotoUrl } from "@/lib/validation";
import { toPersonLike, toUnionLike, toEdgeLike } from "@/lib/convert";

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

/* Life events are derived from the LIVE tree data (birth/death/career plus
   marriages/divorces for the person) so edits made anywhere appear here. */
function deriveEvents(person: PersonLike | null, persons: PersonLike[], unions: UnionLike[]): LifeEvent[] {
  if (!person) return [];
  const events: LifeEvent[] = [];
  if (person.birthYear) {
    events.push({ id: `${person.id}-birth`, personId: person.id, year: person.birthYear, type: "birth", title: `Born`, place: person.birthPlace || undefined });
  }
  if (person.deathYear) {
    events.push({ id: `${person.id}-death`, personId: person.id, year: person.deathYear, type: "death", title: `Died`, place: undefined });
  }
  if (person.profession) {
    events.push({ id: `${person.id}-career`, personId: person.id, year: person.birthYear ? person.birthYear + 22 : 1900, type: "career", title: person.profession, place: person.birthPlace || undefined });
  }
  for (const u of unions) {
    if (!u.startYear) continue;
    const isMine = u.partnerA === person.id || u.partnerB === person.id;
    if (!isMine) continue;
    const otherId = u.partnerA === person.id ? u.partnerB : u.partnerA;
    const other = persons.find((p) => p.id === otherId);
    const label = other ? other.fullName : "Unknown";
    const div = u.type === "divorced";
    events.push({
      id: `${u.id}-union`,
      personId: person.id,
      year: u.startYear,
      type: div ? "divorce" : "marriage",
      title: div ? `Divorced: ${label}` : `Married: ${label}`,
      place: undefined,
    });
  }
  return events.sort((a, b) => a.year - b.year);
}

export default function PersonDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const live = useLiveTree();

  const { user } = useAuth();

  const hasLive = (live.persons ?? []).length > 0;
  const persons: PersonLike[] = useMemo(
    () => (hasLive ? (live.persons ?? []).map((p) => toPersonLike(p)) : staticPersons),
    [live.persons, hasLive]
  );
  const unions: UnionLike[] = useMemo(
    () => (hasLive ? (live.unions ?? []).map(toUnionLike) : staticUnions.map((u) => ({ ...u }))),
    [live.unions, hasLive]
  );
  const parentEdges: EdgeLike[] = useMemo(
    () => (hasLive ? (live.edges ?? []).map(toEdgeLike) : staticEdges.map((e) => ({ ...e }))),
    [live.edges, hasLive]
  );

  const gate = useUserCircle(user, persons, unions, parentEdges);
  const isLoggedIn = !!user;
  const canRename = isLoggedIn && (user?.role ? user.role !== "viewer" : true);

  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const person = useMemo(() => persons.find((p) => p.id === id) ?? getStaticPerson(id), [persons, id]);

  const events = useMemo(() => {
    if (!person) return [];
    if (hasLive && person.id === id) {
      const derived = deriveEvents(person, persons, unions);
      if (derived.length > 0) return derived;
    }
    return getStaticEvents(id);
  }, [person, id, persons, unions, hasLive]);

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

  const editPerson = (patch: Record<string, unknown>) => {
    fetch(`/api/tree/persons`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    })
      .then((res) => { if (!res.ok) throw new Error("save failed"); })
      .then(() => { setEditing(false); })
      .catch(() => alert("Failed to save changes. Please try again."));
  };

  const renamePerson = () => {
    const name = nameDraft.trim();
    if (!name) return;
    fetch(`/api/tree/persons`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, fullName: name }),
    })
      .then((res) => { if (!res.ok) throw new Error("save failed"); })
      .then(() => { setRenaming(false); setNameDraft(""); })
      .catch(() => alert("Failed to rename. Please try again."));
  };

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
          {canRename && (
            <button
              onClick={() => {
                setNameDraft(person.fullName);
                setRenaming((r) => !r);
                setEditing(false);
              }}
              className="text-[10px] md:text-xs px-2.5 py-1.5 rounded-lg bg-[var(--tapestry-bg)]/60 border border-[var(--thread-gold-dim)]/30 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/15 transition-colors font-body"
              title="Rename this person (available to all members)"
            >
              {renaming ? "Cancel" : "Rename"}
            </button>
          )}
          {gate.canEditPerson(id) && (
            <button
              onClick={() => {
                setEditing((e) => !e);
                setRenaming(false);
              }}
              className="text-[10px] md:text-xs px-2.5 py-1.5 rounded-lg bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/25 transition-colors font-body"
            >
              {editing ? "Done" : "Edit"}
            </button>
          )}
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
              <img src={cachedPhotoUrl(person.photoUrl, person.updatedAt)} alt={person.fullName} className="w-full h-full object-cover" />
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

        {/* Rename (available to all members) */}
        {renaming && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") renamePerson(); if (e.key === "Escape") setRenaming(false); }}
              className="w-64 bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body text-center focus:outline-none focus:border-[var(--thread-gold)]"
              placeholder="Full name"
            />
            <button
              onClick={renamePerson}
              className="px-3 py-2 text-sm rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity"
            >
              Save
            </button>
          </div>
        )}

        {/* Edit Profile */}
        {editing && (
          <EditForm
            person={person}
            canEditPrivate={gate.canEditPrivate(id)}
            onSave={(patch) => editPerson(patch)}
            onCancel={() => setEditing(false)}
          />
        )}

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
                src={cachedPhotoUrl(person.photoUrl, person.updatedAt)}
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

function EditForm({ person, canEditPrivate, onSave, onCancel }: {
  person: PersonLike;
  canEditPrivate: boolean;
  onSave: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  const [fields, setFields] = useState({
    fullName: person.fullName,
    nameNative: person.nameNative ?? "",
    gender: person.gender ?? "",
    birthYear: person.birthYear ?? "",
    deathYear: person.deathYear ?? "",
    isAlive: person.isAlive ?? true,
    birthPlace: person.birthPlace ?? "",
    profession: person.profession ?? "",
    bio: person.bio ?? "",
    email: person.email ?? "",
    phone: person.phone ?? "",
    address: person.address ?? "",
    website: person.website ?? "",
  });

  const set = (k: string, v: string | boolean) => setFields((f) => ({ ...f, [k]: v }));

  const input = "w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]";
  const label = "block text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1";

  const save = () => {
    const patch: Record<string, unknown> = {
      id: person.id,
      fullName: fields.fullName,
      nameNative: fields.nameNative || null,
      gender: fields.gender,
      birthYear: fields.birthYear || null,
      deathYear: fields.deathYear || null,
      isAlive: fields.deathYear ? false : fields.isAlive,
      birthPlace: fields.birthPlace || null,
      profession: fields.profession || null,
    };
    if (canEditPrivate) {
      patch.bio = fields.bio || null;
      patch.email = fields.email || null;
      patch.phone = fields.phone || null;
      patch.address = fields.address || null;
      patch.website = fields.website || null;
    }
    onSave(patch);
  };

  return (
    <section className="bg-white/[0.03] rounded-xl p-4 md:p-5 border border-[var(--thread-gold-dim)]/20 mb-8 md:mb-10">
      <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-4">Edit Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={label}>{t("add.fullName")}</label>
          <input className={input} value={fields.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
        <div>
          <label className={label}>Name (your script)</label>
          <input className={input} value={fields.nameNative} onChange={(e) => set("nameNative", e.target.value)} dir="auto" />
        </div>
        <div>
          <label className={label}>Gender</label>
          <select className={input} value={fields.gender} onChange={(e) => set("gender", e.target.value)}>
            <option value="">{t("gender.notSpecified")}</option>
            <option value="female">{t("gender.female")}</option>
            <option value="male">{t("gender.male")}</option>
            <option value="other">{t("gender.other")}</option>
          </select>
        </div>
        <div>
          <label className={label}>{t("add.birthYear")}</label>
          <input className={input} value={fields.birthYear ?? ""} onChange={(e) => set("birthYear", e.target.value)} placeholder="e.g. 1950" />
        </div>
        <div>
          <label className={label}>{t("add.deathYear")}</label>
          <input className={input} value={fields.deathYear ?? ""} onChange={(e) => set("deathYear", e.target.value)} placeholder="Leave empty if living" />
        </div>
        <div>
          <label className={label}>Place of birth</label>
          <input className={input} value={fields.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} />
        </div>
        <div>
          <label className={label}>Profession</label>
          <input className={input} value={fields.profession} onChange={(e) => set("profession", e.target.value)} />
        </div>
        {canEditPrivate && (
          <>
            <div>
              <label className={label}>Email</label>
              <input className={input} value={fields.email} onChange={(e) => set("email", e.target.value)} type="email" />
            </div>
            <div>
              <label className={label}>Phone</label>
              <input className={input} value={fields.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div>
              <label className={label}>Address</label>
              <input className={input} value={fields.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div>
              <label className={label}>Website</label>
              <input className={input} value={fields.website} onChange={(e) => set("website", e.target.value)} type="url" />
            </div>
          </>
        )}
      </div>
      {canEditPrivate && (
        <div className="mt-4">
          <label className={label}>About / Bio</label>
          <textarea className={input + " min-h-[100px] resize-y"} value={fields.bio} onChange={(e) => set("bio", e.target.value)} />
        </div>
      )}
      <div className="flex items-center gap-3 mt-5">
        <button onClick={save} className="px-5 py-2 text-sm rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity">
          Save changes
        </button>
        <button onClick={onCancel} className="px-5 py-2 text-sm rounded-lg border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">
          Cancel
        </button>
      </div>
      {!canEditPrivate && (
        <p className="text-[10px] text-[var(--parchment-dim)] mt-4 italic">
          Private contact details are only editable by the person themself. As Editor you can update the public genealogical fields here.
        </p>
      )}
    </section>
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
