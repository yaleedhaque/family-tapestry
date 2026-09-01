"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Union } from "@/data/family";
import type { PersonLike } from "@/components/InfoPanel";

function UnionNode({ data }: NodeProps) {
  const union = data.union as Union;
  const persons = (data.persons as PersonLike[] | undefined) ?? [];
  const partnerA = persons.find((p) => p.id === union.partnerA);
  const partnerB = persons.find((p) => p.id === union.partnerB);
  const isDivorced = union.type === "divorced";

  return (
    <div className="relative flex flex-col items-center">
      {/* Labels (above the diamond) */}
      <div className="mb-1.5 flex flex-col items-center gap-0.5">
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
            isDivorced ? "text-divorce-red" : "text-thread-gold-dim"
          }`}
        >
          {union.startYear} – {union.endYear ?? "present"}
        </span>
        {isDivorced && (
          <span className="font-body text-[7px] text-divorce-red uppercase tracking-wider">
            divorced
          </span>
        )}
      </div>

      {/* Diamond glyph */}
      <div
        className={`relative w-8 h-8 rotate-45 border ${
          isDivorced
            ? "border-divorce-red"
            : "border-thread-gold"
        } bg-tapestry-bg-alt`}
      >
        <div
          className={`absolute inset-1 border ${
            isDivorced ? "border-divorce-red/50" : "border-thread-gold-dim"
          }`}
        />
        {isDivorced && (
          <div className="absolute inset-0 flex items-center justify-center -rotate-45">
            <span className="text-divorce-red text-[8px] font-bold">✕</span>
          </div>
        )}
      </div>

      {/* Partners connect at the left and right corners */}
      <Handle type="target" position={Position.Left} id="partner-a" className="!bg-thread-gold !w-2 !h-2" />
      <Handle type="target" position={Position.Right} id="partner-b" className="!bg-thread-gold !w-2 !h-2" />

      {/* Offspring connect from the bottom corner */}
      <Handle type="source" position={Position.Bottom} className="!bg-thread-gold !w-2 !h-2" />
    </div>
  );
}

export default memo(UnionNode);
