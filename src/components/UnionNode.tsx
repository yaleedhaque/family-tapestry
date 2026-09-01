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

      {/* Diamond glyph + corner handles.
          The diamond is a 32px square rotated 45°, so its four corners sit at the
          N/E/S/W compass points of the element. Handles are absolutely positioned
          right on those corners so partner lines land exactly on the corners
          (never above them), and each corner is offered as its own target handle
          so runLayout can pick left/right per partner to keep routes shortest. */}
      <div className="relative w-8 h-8 mt-1">
        <div
          className={`absolute inset-0 rotate-45 border ${
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

        {/* Left corner moonshot: target lands on the diamond's WEST corner */}
        <Handle type="target" position={Position.Left} id="partner-left" className="!bg-thread-gold" style={{ left: -4, top: 12 }} />
        {/* Right corner: diamond's EAST corner */}
        <Handle type="target" position={Position.Right} id="partner-right" className="!bg-thread-gold" style={{ right: -4, top: 12 }} />
        {/* Offspring: diamond's SOUTH corner */}
        <Handle type="source" position={Position.Bottom} id="child" className="!bg-thread-gold" style={{ left: 12, bottom: -4 }} />
      </div>
    </div>
  );
}

export default memo(UnionNode);
