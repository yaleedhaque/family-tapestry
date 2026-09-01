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
    // Fixed 150px tall (matches UNION_H in familyLayout) so the diamond's vertical
    // centre lands exactly on the couple's row centre — partners on the same row have
    // the same centre Y, so with the diamond centred here their marriage edges are
    // perfectly straight horizontal runs (side handle → diamond corner), never
    // diagonal, never crossing a child.
    <div className="relative w-[110px] h-[150px]">
      {/* Labels sit above the diamond, near the top of the node. */}
      <div className="absolute top-0 inset-x-0 flex flex-col items-center gap-0.5">
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

      {/* Diamond centred so its centre = the couple's row centre. Its four corners
          sit at the N/E/S/W compass points; side corners are the partner targets,
          the south corner is the child source. */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-8 h-8">
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

          <Handle type="target" position={Position.Left} id="partner-left" className="!bg-thread-gold" style={{ left: -4, top: 13 }} />
          <Handle type="target" position={Position.Right} id="partner-right" className="!bg-thread-gold" style={{ right: -4, top: 13 }} />
          <Handle type="source" position={Position.Bottom} id="child" className="!bg-thread-gold" style={{ left: 13, bottom: -4 }} />
        </div>
      </div>
    </div>
  );
}

export default memo(UnionNode);
