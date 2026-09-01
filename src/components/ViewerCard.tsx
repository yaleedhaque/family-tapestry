"use client";

import type { PresencePayload } from "@/lib/types";

interface ViewerCardProps {
  viewer: PresencePayload;
  isFollowing: boolean;
  onFollow: () => void;
  onClose: () => void;
}

export default function ViewerCard({ viewer, isFollowing, onFollow, onClose }: ViewerCardProps) {
  const statusLabel = viewer.editing
    ? `Editing ${viewer.editing}`
    : viewer.viewing
    ? `Viewing ${viewer.viewing}`
    : "Online";
  const inactive = Date.now() - new Date(viewer.online_at).getTime() > 5 * 60 * 1000;

  return (
    <div
      className="absolute bottom-full mb-2 z-[60] w-60 rounded-xl border border-[var(--thread-gold-dim)]/30 bg-[var(--tapestry-bg-alt)]/98 backdrop-blur-md shadow-[var(--shadow-xl)] overflow-hidden"
      role="dialog"
      aria-label={`${viewer.userName} presence`}
    >
      <div className="px-4 py-3 border-b border-[var(--thread-gold-dim)]/15 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full border-2 border-[var(--thread-gold)] bg-[var(--tapestry-bg)] flex items-center justify-center text-[11px] text-[var(--thread-gold)] font-body font-semibold select-none">
          {viewer.userName.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--parchment)] font-body font-medium truncate">{viewer.userName}</p>
          <p className="text-[10px] text-[var(--parchment-dim)] font-body flex items-center gap-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${inactive ? "bg-[var(--parchment-dim)]/40" : "bg-[var(--living-glow)]"}`}
            />
            {inactive ? "Away" : statusLabel}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close viewer card"
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors text-sm"
        >
          ✕
        </button>
      </div>

      <div className="px-4 py-3 space-y-2">
        <button
          onClick={onFollow}
          aria-pressed={isFollowing}
          className={`w-full py-2 text-xs rounded-lg font-body font-medium transition-colors border ${
            isFollowing
              ? "bg-[var(--thread-gold)]/20 border-[var(--thread-gold)] text-[var(--thread-gold)]"
              : "bg-[var(--thread-gold)] text-[var(--tapestry-bg)] border-transparent hover:opacity-90"
          }`}
        >
          {isFollowing ? "✓ Following — stop" : "Follow " + viewer.userName.split(" ")[0]}
        </button>

        {viewer.email ? (
          <a
            href={`mailto:${viewer.email}`}
            className="w-full py-2 text-xs rounded-lg font-body text-center border border-[var(--thread-gold-dim)]/30 text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:border-[var(--thread-gold-dim)]/60 transition-colors block"
          >
            📧 Contact
          </a>
        ) : (
          <p className="text-[10px] text-[var(--parchment-dim)]/60 font-body text-center">
            No contact info shared
          </p>
        )}

        {isFollowing && (
          <p className="text-[10px] text-[var(--parchment-dim)] font-body text-center">
            Watching {viewer.userName.split(" ")[0]}&apos;s view — move to stop
          </p>
        )}
      </div>
    </div>
  );
}
