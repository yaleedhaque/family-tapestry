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
  const isCollapsed = (data.isCollapsed as boolean | undefined) ?? false;
  // Per-partner marriage-corner local Y offsets (relative to this 150px node's top),
  // set by the diamond-anchor effect so each marriage line enters horizontally at its
  // own partner's card bottom even when the two cards differ in height. Falls back to
  // 75 (vertically centred) before the anchor pass runs.
  const corners = (data.partnerCorners as { a?: number; b?: number } | undefined) ?? {};
  const cornerA = typeof corners.a === "number" ? corners.a : 75;
  const cornerB = typeof corners.b === "number" ? corners.b : 75;
  // Centre the diamond vertically between the two marriage-corner heights so the two
  // horizontal lines converge into it naturally.
  const diamondCentre = (cornerA + cornerB) / 2;
  const descendantCount = (data.descendantCount as number | undefined) ?? 0;
  const onToggleCollapse = (data.onToggleCollapse as ((id: string) => void) | undefined) ?? (() => {});
  const onAddChildDiamond = data.onAddChildDiamond as ((unionId: string) => void) | undefined;
  const collapsible = descendantCount > 0;

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

      {/* Diamond. Its vertical position is set so that the two partner corner handles
          (which receive each partner's marriage line at that partner's card-bottom
          height) sit near the diamond's left/right corners, and the child handle at
          its south corner. Left/right handles are per-partner offsets so both
          marriage lines stay perfectly horizontal regardless of the cards' heights. */}
      <div
        className="absolute inset-x-0 flex items-center justify-center cursor-pointer"
        style={{ top: diamondCentre - 16, height: 32 }}
        onClick={(e) => {
          e.stopPropagation();
          if (onAddChildDiamond) onAddChildDiamond(union.id);
        }}
      >
        <div className="relative w-8 h-8">
          <div
            className={`absolute inset-0 rotate-45 border ${
              isDivorced
                ? "border-divorce-red"
                : isCollapsed
                  ? "border-[var(--accent-emerald)]"
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
            // Positioned at this partner's card-bottom height so its marriage line
            // enters perfectly horizontal, independent of the partner cards' heights.
            style={{ left: -6.6, top: cornerA - diamondCentre + 16 }}
          />
          <Handle
            type="target"
            position={Position.Right}
            id="partner-right"
            className="!bg-thread-gold"
            style={{ right: -6.6, top: cornerB - diamondCentre + 16 }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="child"
            className="!bg-thread-gold"
            style={{ left: 16, top: 32 + 6.6 }}
          />
        </div>
      </div>

      {/* Collapse toggle — appears when this union has descendants. Badge shows the
          hidden count when collapsed. */}
      {collapsible && (
        <button
          type="button"
          aria-label={
            isCollapsed
              ? `Expand ${descendantCount} people`
              : `Collapse ${descendantCount} people`
          }
          title={isCollapsed ? "Expand branch" : "Collapse branch"}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse(union.id);
          }}
          className={`
            absolute bottom-0 left-1/2 -translate-x-1/2 z-10
            flex items-center gap-1 cursor-pointer select-none
            rounded-full border px-2.5 py-1.5 min-h-[30px]
            transition-colors
            ${
              isCollapsed
                ? "border-[var(--accent-emerald)] bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/25"
                : "border-[var(--thread-gold)]/60 bg-[var(--tapestry-bg-alt)] text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/15"
            }
          `}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            className="w-4 h-4"
          >
            {isCollapsed ? (
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            ) : (
              <path d="M5 12h14" strokeLinecap="round" />
            )}
          </svg>
          <span className="font-body text-[10px] leading-none">
            {isCollapsed ? descendantCount : ""}
          </span>
        </button>
      )}
    </div>
  );
}

export default memo(UnionNode);
