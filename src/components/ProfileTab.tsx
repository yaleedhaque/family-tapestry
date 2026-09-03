"use client";

import { cachedPhotoUrl } from "@/lib/validation";
import { sanitizeField, validateEmail, validateUrl, validateYear } from "@/lib/validation";
import { useLang } from "@/lib/i18n";
import type { PersonLike } from "@/components/InfoPanel";

interface ProfileTabProps {
  person: PersonLike;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  fields: Record<string, string>;
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  canEdit: boolean;
  canEditPrivate: boolean;
  locked: boolean;
  photoLoading: boolean;
  setPhotoLoading: (v: boolean) => void;
  onUpdatePerson: (person: PersonLike) => void;
  saveProfile: () => void;
}

function field(
  key: string,
  label: string,
  type: string,
  person: PersonLike,
  isEditing: boolean,
  canEditPrivate: boolean,
  fields: Record<string, string>,
  setFields: React.Dispatch<React.SetStateAction<Record<string, string>>>,
  t: (key: string) => string
) {
  const privateLocked = !canEditPrivate && ["email", "phone", "address", "website"].includes(key);
  const showEdit = isEditing && !privateLocked;
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">{label}</label>
      {showEdit ? (
        type === "textarea" ? (
          <textarea value={fields[key] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body resize-none h-24 focus:outline-none focus:border-[var(--thread-gold)]" />
        ) : type === "select" ? (
          <select
            value={fields["gender"] ?? person.gender ?? ""}
            onChange={(e) => setFields((f) => ({ ...f, gender: e.target.value }))}
            className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]"
          >
            <option value="">{t("gender.notSpecified")}</option>
            <option value="female">{t("gender.female")}</option>
            <option value="male">{t("gender.male")}</option>
            <option value="other">{t("gender.other")}</option>
          </select>
        ) : (
          <input type={type} value={fields[key] ?? ""} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body focus:outline-none focus:border-[var(--thread-gold)]" />
        )
      ) : (
        <p className="text-sm text-[var(--parchment)] font-body">
          {key === "deathYear" ? (person.deathYear ?? "present") : key === "birthYear" ? (person.birthYear ?? "—") : key === "gender" ? ((g) => g === "female" || g === "male" || g === "other" ? t(`gender.${g}` as "gender.female") : t("gender.notSpecified"))((person as unknown as Record<string, unknown>)[key] as string) : ((person as unknown as Record<string, unknown>)[key] as string) || "—"}
        </p>
      )}
    </div>
  );
}

export function ProfileTab({
  person,
  isEditing,
  setIsEditing,
  fields,
  setFields,
  canEdit,
  canEditPrivate,
  locked,
  photoLoading,
  setPhotoLoading,
  onUpdatePerson,
  saveProfile,
}: ProfileTabProps) {
  const { t } = useLang();

  return (
    <div className="space-y-4">
      {locked && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--thread-gold-dim)]/30 bg-white/5 px-3 py-2 text-xs text-[var(--parchment-dim)]">
          <span aria-hidden="true">🔒</span><span>View-only — outside your circle.</span>
        </div>
      )}
      {canEdit && canEditPrivate && (
        <div className="flex items-center gap-3">
          <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">Photo</label>
          <label className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors cursor-pointer">
            {photoLoading ? "Uploading..." : person.photoUrl ? "Change Photo" : "Upload Photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              disabled={photoLoading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5MB."); return; }
                setPhotoLoading(true);
                try {
                  const form = new FormData();
                  form.append("file", file);
                  form.append("personId", person.id);
                  const res = await fetch("/api/upload", { method: "POST", body: form });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Upload failed");
                  onUpdatePerson({ ...person, photoUrl: data.url, updatedAt: new Date().toISOString() });
                } catch (err) {
                  alert(err instanceof Error ? err.message : "Upload failed");
                } finally {
                  setPhotoLoading(false);
                  e.target.value = "";
                }
              }}
            />
          </label>
          {person.photoUrl && !photoLoading && (
            <button
              onClick={() => onUpdatePerson({ ...person, photoUrl: "" })}
              className="px-3 py-1.5 text-xs rounded border border-[var(--ember-red)]/40 text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}

      <div className="space-y-3">
        {field("gender", t("gender.label"), "select", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("fullName", "Full Name", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("nameNative", "Name (your script)", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("birthYear", "Birth Year", "number", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("deathYear", "Death Year", "number", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("birthPlace", "Birth Place", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("profession", "Profession", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
      </div>

      <div className="border-t border-[var(--thread-gold-dim)]/20" />

      <div>
        <label className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)] mb-1 block">Biography</label>
        {isEditing && canEditPrivate ? (
          <textarea
            value={fields.bio ?? ""}
            onChange={(e) => setFields((f) => ({ ...f, bio: e.target.value }))}
            className="w-full bg-white/5 border border-[var(--thread-gold-dim)]/30 rounded px-3 py-2 text-sm text-[var(--parchment)] font-body resize-none h-32 focus:outline-none focus:border-[var(--thread-gold)]"
          />
        ) : (
          <p className="text-sm text-[var(--parchment-dim)] font-body leading-relaxed">{person.bio || "No biography yet."}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        {isEditing ? (
          <>
            <button onClick={() => { setIsEditing(false); setFields({}); }} className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors">Cancel</button>
            <button onClick={saveProfile} className="px-3 py-1.5 text-xs rounded bg-[var(--thread-gold)] text-[var(--tapestry-bg)] hover:opacity-90 transition-opacity">Save</button>
          </>
        ) : canEdit ? (
          <button
            onClick={() => {
              setFields({ fullName: person.fullName, nameNative: person.nameNative ?? "", gender: person.gender ?? "", birthYear: String(person.birthYear ?? ""), deathYear: person.deathYear != null ? String(person.deathYear) : "", birthPlace: person.birthPlace, profession: person.profession, bio: person.bio, email: person.email, phone: person.phone, address: person.address, website: person.website });
              setIsEditing(true);
            }}
            className="px-3 py-1.5 text-xs rounded border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)] transition-colors"
          >
            Edit Profile
          </button>
        ) : null}
      </div>

      <div className="border-t border-[var(--thread-gold-dim)]/20" />

      <div className="space-y-3">
        <h3 className="text-[10px] uppercase tracking-wider text-[var(--thread-gold-dim)]">Contact</h3>
        {field("email", "Email", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
        {field("phone", "Phone", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
        <div className="space-y-1">
          {field("address", "Address", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
          {(() => {
            const addr = (isEditing && fields.address ? fields.address : person.address?.trim()) || "";
            const coords = person.lat != null && person.lng != null ? `${person.lat},${person.lng}` : "";
            const target = addr || (person.birthPlace?.trim() || "") || coords;
            if (!target) return null;
            return (
              <a
                href={`https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(target)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/25 transition-colors font-body"
                title="Open in Google Maps to drive there"
              >
                📍 Drop pin on map
              </a>
            );
          })()}
        </div>
        {field("website", "Website", "text", person, isEditing, canEditPrivate, fields, setFields, t)}
      </div>
    </div>
  );
}
