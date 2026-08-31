"use client";

import { useState } from "react";
import type { PersonLike } from "./InfoPanel";
import { sanitizeField, validateEmail, validateUrl } from "@/lib/validation";

interface AddPersonModalProps {
  persons: PersonLike[];
  nextId: () => string;
  onAdd: (person: PersonLike) => void;
  onClose: () => void;
}

export default function AddPersonModal({ persons, nextId, onAdd, onClose }: AddPersonModalProps) {
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [profession, setProfession] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");

  const duplicate = fullName.trim() && persons.some((p) => p.fullName.toLowerCase() === fullName.trim().toLowerCase());

  const handleSubmit = () => {
    const name = sanitizeField("fullName", fullName);
    if (!name) { setError("Name is required."); return; }
    if (duplicate) { setError("A person with this name already exists."); return; }

    const by = birthYear ? Number(birthYear) : null;
    const dy = deathYear ? Number(deathYear) : null;
    if (by && by < 1400) { setError("Birth year seems too old (before 1400)."); return; }
    if (by && dy && dy < by) { setError("Death year cannot be before birth year."); return; }

    const sanitizedEmail = sanitizeField("email", email);
    if (sanitizedEmail && !validateEmail(sanitizedEmail)) { setError("Invalid email address."); return; }
    const sanitizedWebsite = sanitizeField("website", website);
    if (sanitizedWebsite && !validateUrl(sanitizedWebsite)) { setError("Invalid website URL."); return; }

    const person: PersonLike = {
      id: nextId(),
      fullName: name,
      birthYear: by,
      deathYear: dy,
      isAlive: !dy,
      bio: sanitizeField("bio", bio),
      birthPlace: sanitizeField("birthPlace", birthPlace),
      profession: sanitizeField("profession", profession),
      email: sanitizedEmail,
      phone: sanitizeField("phone", phone),
      address: sanitizeField("address", address),
      website: sanitizedWebsite,
      lat: null,
      lng: null,
      photoUrl: "",
    };
    onAdd(person);
  };

  const inputCls = "w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]";
  const labelCls = "text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[var(--tapestry-bg-alt)] border border-[var(--thread-gold-dim)]/30 rounded-xl p-6 max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-xl text-[var(--thread-gold)] font-semibold tracking-wide">Add a Person</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--parchment-dim)] mt-0.5">Record a life in the tapestry</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 flex items-center justify-center rounded-full border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors text-sm">✕</button>
        </div>

        <div className="space-y-4">
          {error && <p className="text-xs text-[var(--ember-red)] bg-[var(--ember-red)]/10 px-3 py-2 rounded">{error}</p>}

          <Group label="Identity">
            <div>
              <label className={labelCls}>Full Name *</label>
              <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); setError(""); }} placeholder="e.g. Jane Smith" autoFocus className={inputCls} />
              {duplicate && <p className="text-[10px] text-[var(--ember-red)] mt-1">Name already exists in tree.</p>}
            </div>
          </Group>

          <Group label="Dates">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Birth Year</label>
                <input type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="e.g. 1985" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Death Year</label>
                <input type="number" value={deathYear} onChange={(e) => setDeathYear(e.target.value)} placeholder="Blank if alive" className={inputCls} />
              </div>
            </div>
          </Group>

          <Group label="Life">
            <div>
              <label className={labelCls}>Birth Place</label>
              <input type="text" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="e.g. London, England" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Profession</label>
              <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="e.g. Engineer" className={inputCls} />
            </div>
          </Group>

          <Group label="Contact">
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7700 900000" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Website</label>
              <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className={inputCls} />
            </div>
          </Group>

          <Group label="Biography">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell their story..." rows={3} className={inputCls + " resize-none"} />
          </Group>

          <button
            onClick={handleSubmit}
            disabled={!fullName.trim()}
            className="w-full py-3 text-sm rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-display font-semibold tracking-wide shadow-[0_0_24px_rgba(201,165,68,0.25)] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Add to Tree
          </button>
        </div>
      </div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--thread-gold-dim)] font-body font-medium">
          {label}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-[var(--thread-gold-dim)]/50 to-transparent" />
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
