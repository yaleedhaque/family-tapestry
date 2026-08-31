"use client";

import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Person } from "@/data/family";
import { GENERATION_COLORS } from "@/lib/generation";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function PersonNode({ data }: NodeProps) {
  const person = data.person as Person;
  const isDeceased = !person.isAlive;
  const isHighlighted = data.highlighted === true;
  const isDimmed = data.dimmed === true;
  const generation = (data.generation as number | undefined) ?? 0;

  const avatarColor = useMemo(
    () => GENERATION_COLORS[generation % GENERATION_COLORS.length],
    [generation]
  );
  const initials = useMemo(() => getInitials(person.fullName), [person.fullName]);

  return (
    <div
      className={`
        relative flex flex-col items-center gap-1.5 rounded-lg
        border px-4 py-3 min-w-[140px] transition-all duration-200
        ${isHighlighted ? "ring-2 ring-[var(--thread-gold)] ring-offset-2 ring-offset-[var(--tapestry-bg)] scale-105 shadow-[0_0_20px_rgba(201,162,75,0.3)]" : ""}
        ${isDimmed ? "opacity-30" : ""}
        ${
          isDeceased
            ? "border-deceased-frame bg-tapestry-bg-alt"
            : "border-living-glow bg-tapestry-bg-alt shadow-[0_0_12px_rgba(217,139,62,0.15)]"
        }
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-thread-gold !w-2 !h-2" />

      <div
        className={`
          w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center
          ${isDeceased ? "grayscale" : ""}
        `}
        style={{ borderColor: isDeceased ? "var(--deceased-frame)" : avatarColor }}
      >
        {person.photoUrl ? (
          <img src={person.photoUrl} alt={person.fullName} className="w-full h-full object-cover" />
        ) : (
          <span
            className="font-display text-lg font-bold select-none"
            style={{ color: isDeceased ? "var(--deceased-frame)" : avatarColor, opacity: isDeceased ? 0.5 : 0.85 }}
          >
            {initials}
          </span>
        )}
      </div>

      <span
        className={`
          font-display text-sm font-medium text-center leading-tight
          ${isDeceased ? "text-parchment-dim" : "text-parchment"}
        `}
      >
        {person.fullName}
      </span>

      <span className="font-body text-[10px] text-parchment-dim">
        {person.birthYear} – {person.deathYear ?? "present"}
      </span>

      {isDeceased && (
        <span className="font-display text-[9px] italic text-deceased-frame">
          {person.deathYear}
        </span>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-thread-gold !w-2 !h-2" />
    </div>
  );
}

export default memo(PersonNode);
