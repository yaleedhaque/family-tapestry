"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Person } from "@/data/family";

function PersonNode({ data }: NodeProps) {
  const person = data.person as Person;
  const isDeceased = !person.isAlive;

  return (
    <div
      className={`
        relative flex flex-col items-center gap-1.5 rounded-lg
        border px-4 py-3 min-w-[140px] transition-all duration-300
        ${
          isDeceased
            ? "border-deceased-frame bg-tapestry-bg-alt"
            : "border-living-glow bg-tapestry-bg-alt shadow-[0_0_12px_rgba(217,139,62,0.15)]"
        }
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-thread-gold !w-2 !h-2" />

      {/* Portrait placeholder */}
      <div
        className={`
          w-16 h-16 rounded-full border-2 overflow-hidden flex items-center justify-center
          ${
            isDeceased
              ? "border-deceased-frame grayscale contrast-[115%] sepia-[8%]"
              : "border-living-glow shadow-[0_0_8px_rgba(217,139,62,0.25)]"
          }
        `}
      >
        <svg
          viewBox="0 0 64 64"
          className={`w-full h-full ${isDeceased ? "opacity-50" : "opacity-70"}`}
        >
          <circle cx="32" cy="24" r="12" fill={isDeceased ? "#5C564C" : "#D98B3E"} />
          <ellipse cx="32" cy="56" rx="20" ry="16" fill={isDeceased ? "#5C564C" : "#D98B3E"} />
        </svg>
      </div>

      {/* Name */}
      <span
        className={`
          font-display text-sm font-medium text-center leading-tight
          ${isDeceased ? "text-parchment-dim" : "text-parchment"}
        `}
      >
        {person.fullName}
      </span>

      {/* Dates */}
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
