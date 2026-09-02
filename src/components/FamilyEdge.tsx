"use client";

import { memo } from "react";
import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

export type FamilyEdgeData = {
  // SVG path (absolute, React Flow node coords) computed by the deterministic
  // layout so every line is exactly where we want and never overlaps another node.
  path: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
  opacity?: number;
  label?: string;
  labelColor?: string;
  animated?: boolean;
  arrow?: boolean;
};

function pathMidpoint(d: string): { x: number; y: number } {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const x0 = nums[0] ?? 0, y0 = nums[1] ?? 0;
  if (nums.length >= 4) {
    const x1 = nums[nums.length - 2], y1 = nums[nums.length - 1];
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  }
  return { x: x0, y: y0 };
}

// A small arrowhead at the very end of the path, oriented along the final segment.
function arrowHead(d: string): string | null {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 4) return null;
  const x1 = nums[nums.length - 2], y1 = nums[nums.length - 1];
  const x0 = nums[nums.length - 4], y0 = nums[nums.length - 3];
  let dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;
  const size = 9;
  const bx = x1 - dx * size, by = y1 - dy * size;
  const px = -dy * (size * 0.55), py = dx * (size * 0.55);
  return `M ${x1},${y1} L ${bx + px},${by + py} L ${bx - px},${by - py} Z`;
}

// Fully-authored edge: draws the exact `data.path` with a crisp end. No React Flow
// auto-routing, no handle-offset fragility, no long diagonals slicing cards.
// Optionally renders an inline label, a small arrowhead and a flowing dash.
function FamilyEdge({ data }: EdgeProps) {
  const d = (data ?? {}) as FamilyEdgeData;
  const stroke = d.stroke ?? "var(--thread-gold)";
  const dash = d.dash;
  const mid = pathMidpoint(d.path);
  const animatedStyle = d.animated
    ? { strokeDashoffset: 0, animation: "dashflow 1.2s linear infinite" }
    : undefined;
  const head = d.arrow === false ? null : arrowHead(d.path);

  return (
    <>
      <path
        className="react-flow__edge-path"
        d={d.path}
        fill="none"
        stroke={stroke}
        strokeWidth={d.strokeWidth ?? 2}
        strokeDasharray={dash}
        strokeLinecap="round"
        style={{ opacity: d.opacity ?? 0.9, ...animatedStyle }}
      />
      {head && <path d={head} fill={stroke} />}
      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${mid.x}px, ${mid.y}px)`,
              color: d.labelColor ?? stroke,
              fontSize: 10,
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              background: "var(--tapestry-bg)",
              padding: "1px 5px",
              borderRadius: 6,
              lineHeight: 1,
              whiteSpace: "nowrap",
            }}
            className="react-flow__edge-label nocursor z-20"
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(FamilyEdge);