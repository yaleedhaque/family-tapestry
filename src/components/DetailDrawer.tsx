"use client";

interface PersonLike {
  id: string;
  fullName: string;
  birthYear: number | null;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
}

interface DetailDrawerProps {
  person: PersonLike | null;
  onClose: () => void;
}

export default function DetailDrawer({ person, onClose }: DetailDrawerProps) {
  if (!person) return null;

  const isDeceased = !person.isAlive;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-[380px] max-w-[90vw] bg-tapestry-bg-alt border-l border-thread-gold-dim z-50 flex flex-col overflow-hidden animate-slide-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full border border-thread-gold-dim text-parchment-dim hover:text-thread-gold hover:border-thread-gold transition-colors"
        >
          ✕
        </button>

        {/* Portrait */}
        <div className="flex justify-center pt-8 pb-4">
          <div
            className={`
              w-28 h-28 rounded-full border-2 overflow-hidden flex items-center justify-center
              ${
                isDeceased
                  ? "border-deceased-frame grayscale contrast-[115%] sepia-[8%]"
                  : "border-living-glow shadow-[0_0_16px_rgba(217,139,62,0.3)]"
              }
            `}
          >
            <svg viewBox="0 0 112 112" className="w-full h-full opacity-60">
              <circle cx="56" cy="40" r="22" fill={isDeceased ? "#5C564C" : "#D98B3E"} />
              <ellipse cx="56" cy="96" rx="36" ry="28" fill={isDeceased ? "#5C564C" : "#D98B3E"} />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <h2 className="font-display text-2xl font-semibold text-parchment text-center">
            {person.fullName}
          </h2>

          <p className="text-center font-display text-sm text-parchment-dim mt-1 italic">
            {person.birthYear} – {person.deathYear ?? "present"}
          </p>

          <div className="my-4 border-t border-thread-gold-dim/30" />

          <div className="space-y-3">
            <DetailRow label="Born" value={`${person.birthYear} · ${person.birthPlace}`} />
            {person.deathYear && (
              <DetailRow label="Died" value={`${person.deathYear}`} />
            )}
            <DetailRow label="Profession" value={person.profession} />
          </div>

          <div className="my-4 border-t border-thread-gold-dim/30" />

          <h3 className="font-display text-xs uppercase tracking-wider text-thread-gold mb-2">
            Biography
          </h3>
          <p className="font-body text-sm text-parchment-dim leading-relaxed">
            {person.bio}
          </p>
        </div>
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="font-body text-xs text-thread-gold-dim uppercase tracking-wider min-w-[70px]">
        {label}
      </span>
      <span className="font-body text-sm text-parchment">{value}</span>
    </div>
  );
}
