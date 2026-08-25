"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Union } from "@/data/family";
import { getPerson } from "@/data/family";

function UnionNode({ data }: NodeProps) {
  const union = data.union as Union;
  const partnerA = getPerson(union.partnerA);
  const partnerB = getPerson(union.partnerB);
  const isDivorced = union.type === "divorced";

  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!bg-thread-gold !w-2 !h-2" />

      {/* Diamond glyph */}
      <div
        className={`relative w-8 h-8 rotate-45 border ${
          isDivorced
            ? "border-ember-red"
            : "border-thread-gold"
        } bg-tapestry-bg-alt`}
      >
        <div
          className={`absolute inset-1 border ${
            isDivorced ? "border-ember-red/50" : "border-thread-gold-dim"
          }`}
        />
        {isDivorced && (
          <div className="absolute inset-0 flex items-center justify-center -rotate-45">
            <span className="text-ember-red text-[8px] font-bold">✕</span>
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="mt-1.5 flex flex-col items-center gap-0.5">
        {partnerA && (
          <span className="font-body text-[9px] text-parchment-dim">
            {partnerA.fullName.split(" ")[0]}
          </span>
        )}
        {partnerB && (
          <span className="font-body text-[9px] text-parchment-dim">
            {partnerB.fullName.split(" ")[0]}
          </span>
        )}
        <span
          className={`font-body text-[8px] italic ${
            isDivorced ? "text-ember-red" : "text-thread-gold-dim"
          }`}
        >
          {union.startYear} – {union.endYear ?? "present"}
        </span>
        {isDivorced && (
          <span className="font-body text-[7px] text-ember-red uppercase tracking-wider">
            divorced
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-thread-gold !w-2 !h-2" />
    </div>
  );
}

export default memo(UnionNode);
