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
    // Fixed 150px tall (matches UNION_H in familyLayout). In the layout the diamond
    // node is placed BELOW the partner cards (DIAMOND_OFFSET in familyLayout.ts),
    // centred horizontally between the partners. The diamond graphic is vertically
    // centred here; its left/right corner handles receive the two partners' marriage
    // edges (left partner -> left corner, right partner -> right corner, assigned by
    // real position in TapestryCanvas), and its south corner drops to children.
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

          <Handle
            type="target"
            position={Position.Left}
            id="partner-left"
            className="!bg-thread-gold"
            // Diamond tips sit at ±16√2 ≈ ±22.63px from the box centre (the 32px
            // square is rotate-45, so its corners point N/E/S/W beyond the box).
            // Box centre = (16,16); left tip = (16-22.63, 16) = (-6.63, 16).
            // A 6px handle centred on that tip -> left = -9.63, top = 13.
            style={{ left: -9.6, top: 13 }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="partner-right"
            className="!bg-thread-gold"
            style={{ right: -9.6, top: 13 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="child"
            className="!bg-thread-gold"
            style={{ left: 13, bottom: -9.6 }}
          />
        </div>
      </div>
    </div>
  );
}

export default memo(UnionNode);
