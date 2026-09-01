"use client";

import { memo } from "react";
import { type EdgeProps } from "@xyflow/react";

export type FamilyEdgeData = {
  // SVG path (absolute, React Flow node coords) computed by the deterministic
  // layout so every line is exactly straight and never overlaps another node.
  path: string;
  stroke?: string;
  strokeWidth?: number;
  dash?: string;
  opacity?: number;
};

// Fully-authored edge: draws the exact `data.path`. Professional, non-overlapping
// lines (horizontal marriage bars + straight vertical child drops) without relying
// on React Flow auto-routing or handle offsets.
function FamilyEdge({ data }: EdgeProps) {
  const d = (data ?? {}) as FamilyEdgeData;
  const stroke = d.stroke ?? "var(--thread-gold)";
  return (
    <path
      className="react-flow__edge-path"
      d={d.path}
      fill="none"
      stroke={stroke}
      strokeWidth={d.strokeWidth ?? 2}
      strokeDasharray={d.dash}
      strokeLinecap="round"
      style={{ opacity: d.opacity ?? 0.85 }}
    />
  );
}

export default memo(FamilyEdge);