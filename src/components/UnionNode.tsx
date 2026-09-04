"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Union } from "@/data/family";

function UnionNode({ data }: NodeProps) {
  const union = data.union as Union;
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
      {/* Divider / marriage year (replaces the redundant partner-name + date-range
          mini-label, which repeated data already shown on both flanking cards). */}
      <div className="absolute top-0 inset-x-0 flex flex-col items-center gap-0.5">
        <span
          className={`font-body text-[10px] leading-none ${
            isDivorced ? "text-divorce-red" : "text-parchment-dim"
          }`}
        >
          {isDivorced
            ? union.startYear
              ? `divorced ${union.startYear}`
              : "divorced"
            : union.startYear
              ? `m. ${union.startYear}`
              : ""}
        </span>
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

      {/* Collapse toggle — appears when this union has descendants. The visible
          control is a 20px circle; the invisible hit-area is 44×44 (centred on the
          circle, same technique as the enlarged React Flow handle hit-areas in
          globals.css). Badge shows the hidden count when collapsed. */}
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
          className="group absolute bottom-0 left-1/2 -translate-x-1/2 z-10 w-11 h-11 flex items-center justify-center cursor-pointer"
        >
          <span
            className={`relative flex items-center justify-center w-5 h-5 rounded-full transition-transform group-hover:scale-[1.08]
              border-2 ${
                isCollapsed
                  ? "border-[var(--accent-emerald)] text-[var(--accent-emerald)]"
                  : "border-[var(--thread-gold-dim)] text-[var(--thread-gold)]"
              } bg-[var(--tapestry-bg)]`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              className="w-3 h-3"
            >
              {isCollapsed ? (
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              ) : (
                <path d="M5 12h14" strokeLinecap="round" />
              )}
            </svg>
          </span>
          {isCollapsed && descendantCount > 0 && (
            <span className="absolute -top-1 -right-3 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-[var(--accent-emerald)] text-[var(--tapestry-bg)] font-body text-[9px] leading-none font-semibold">
              {descendantCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

export default memo(UnionNode);
