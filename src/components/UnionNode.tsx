"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Union } from "@/data/family";
import { getPerson } from "@/data/family";

function UnionNode({ data }: NodeProps) {
  const union = data.union as Union;
  const partnerA = getPerson(union.partnerA);
  const partnerB = getPerson(union.partnerB);

  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!bg-thread-gold !w-2 !h-2" />

      {/* Diamond glyph */}
      <div className="relative w-8 h-8 rotate-45 border border-thread-gold bg-tapestry-bg-alt">
        <div className="absolute inset-1 border border-thread-gold-dim" />
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
        <span className="font-body text-[8px] text-thread-gold-dim italic">
          {union.startYear} – {union.endYear ?? "present"}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-thread-gold !w-2 !h-2" />
    </div>
  );
}

export default memo(UnionNode);
