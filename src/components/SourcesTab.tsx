"use client";

import { useState } from "react";
import type { Source } from "@/data/family";
import { sanitizeField, validateUrl } from "@/lib/validation";

export const SOURCE_TYPES = [
  { value: "birth-certificate", label: "Birth Certificate" },
  { value: "marriage-certificate", label: "Marriage Certificate" },
  { value: "death-certificate", label: "Death Certificate" },
  { value: "census", label: "Census Record" },
  { value: "newspaper", label: "Newspaper" },
  { value: "photograph", label: "Photograph" },
  { value: "letter", label: "Letter" },
  { value: "book", label: "Book" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

interface SourcesTabProps {
  sources: Source[];
  canEdit: boolean;
  onAdd: (s: Source) => void;
  onUpdate: (s: Source) => void;
  onDelete: (id: string) => void;
  nextId: () => string;
  personId: string;
}

export function SourcesTab({
  sources, canEdit, onAdd, onUpdate, onDelete, nextId, personId,
}: SourcesTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formType, setFormType] = useState<Source["type"]>("other");
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const inputCls = "w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body placeholder:text-[var(--parchment-dim)]/40 focus:outline-none focus:border-[var(--thread-gold)]";

  const resetForm = () => {
    setFormType("other");
    setFormTitle("");
    setFormUrl("");
    setFormNotes("");
    setShowAdd(false);
    setEditId(null);
  };

  const handleSave = () => {
    const title = sanitizeField("title", formTitle);
    if (!title) return;
    const url = sanitizeField("url", formUrl);
    if (url && !validateUrl(url)) return;
    const notes = sanitizeField("notes", formNotes);
    if (editId) {
      const existing = sources.find((s) => s.id === editId);
      if (existing) onUpdate({ ...existing, type: formType, title, url, notes });
    } else {
      onAdd({ id: nextId(), personId, type: formType, title, url, notes, dateAdded: new Date().toISOString() });
    }
    resetForm();
  };

  const startEdit = (s: Source) => {
    setEditId(s.id);
    setFormType(s.type);
    setFormTitle(s.title);
    setFormUrl(s.url);
    setFormNotes(s.notes);
    setShowAdd(true);
  };

  return (
    <div className="space-y-3">
      {sources.length > 0 ? (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="bg-white/[0.03] rounded-lg px-4 py-3 border border-[var(--thread-gold-dim)]/10">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--thread-gold)]/10 text-[var(--thread-gold)]">{SOURCE_TYPES.find((t) => t.value === s.type)?.label ?? s.type}</span>
                  </div>
                  <p className="text-sm text-[var(--parchment)] font-body">{s.title}</p>
                  {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--thread-gold)] hover:underline break-all">{s.url}</a>}
                  {s.notes && <p className="text-[10px] text-[var(--parchment-dim)] mt-1">{s.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => startEdit(s)} className="text-[10px] text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] px-1">Edit</button>
                    <button onClick={() => onDelete(s.id)} className="text-[10px] text-[var(--parchment-dim)] hover:text-[var(--ember-red)] px-1">Del</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--parchment-dim)] italic">No sources cited yet.</p>
      )}

      {canEdit && !showAdd && (
        <button onClick={() => setShowAdd(true)} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold)]/40 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors">+ Add Source</button>
      )}

      {showAdd && (
        <div className="bg-white/[0.03] rounded-lg border border-[var(--thread-gold-dim)]/20 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-body text-[var(--thread-gold)]">{editId ? "Edit Source" : "Add Source"}</span>
            <button onClick={resetForm} className="w-8 h-8 flex items-center justify-center text-[var(--parchment-dim)] hover:text-[var(--parchment)] text-xs rounded-full">x</button>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value as Source["type"])} className={inputCls}>
              {SOURCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Title *</label>
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Birth certificate for John Smith" autoFocus className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">URL</label>
            <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] block mb-1">Notes</label>
            <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional details..." rows={2} className={inputCls + " resize-none"} />
          </div>
          <button onClick={handleSave} disabled={!formTitle.trim()} className="w-full py-2 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed">
            {editId ? "Save Changes" : "Add Source"}
          </button>
        </div>
      )}
    </div>
  );
}