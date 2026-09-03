"use client";

import { BaseEdge } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";

// Marriage connector (partner card bottom -> union diamond partner-corner).
//
// Drawn as ONE perfectly horizontal line at the SOURCE Y (the person card's bottom
// edge). The default `straight` edge connects handle-to-handle, which inherits any
// small vertical gap between the person's bottom handle and the diamond's corner
// handle -> visibly sloped. Here we snap the target Y to the source Y so the line
// is level REGARDLESS of those offsets. Because both partners of a couple sit level
// (same row), both marriage lines render at the same Y, reading as a single flat
// horizontal line through the diamond — the bend/slope problem is gone for every
// couple, now and future, with no per-diamond tuning.
//
// sourceX/sourceY/targetX/targetY are the living handle coords React Flow passes
// every render, so the line stays attached and follows cards when dragged, exactly
// like any default edge.
interface MarriageData {
  color?: string;
  width?: number;
  opacity?: number;
  dash?: string;
  label?: string;
  labelStyle?: React.CSSProperties;
  labelBgStyle?: React.CSSProperties;
  labelBgPadding?: [number, number];
}

function FamilyMarriageEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  data,
}: EdgeProps & { data?: MarriageData }) {
  // Perfectly horizontal: the line runs at the source (card-bottom) height across to
  // the diamond's X. Ignore targetY entirely so no handle offset can slope it.
  const path = `M ${sourceX},${sourceY} L ${targetX},${sourceY}`;
  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      label={data?.label ?? label}
      labelStyle={data?.labelStyle ?? labelStyle}
      labelBgStyle={data?.labelBgStyle ?? labelBgStyle}
      labelBgPadding={data?.labelBgPadding ?? labelBgPadding}
      style={{
        stroke: data?.color ?? "var(--edge-marriage)",
        strokeWidth: data?.width ?? 2.5,
        opacity: data?.opacity ?? 1,
        strokeDasharray: data?.dash,
      }}
    />
  );
}

export default FamilyMarriageEdge;
