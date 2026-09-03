"use client";

import { BaseEdge } from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { pathWithHops, type HopPoint } from "@/lib/edgeGeometry";

// Genogram-style child connector. Replaces the default smoothstep child edge with a
// clean orthogonal path that reads as a STRAIGHT drop into the child's card:
//
//   source (union diamond bottom) ─┐  (short trunk + one horizontal jog)
//                                  ├─ targetX  (directly above the child)
//                                  │
//                                  └── straight vertical drop into the child's top
//
// Key idea: the long vertical drop is positioned EXACTLY at the child's top-handle X,
// so the line comes straight down into the card regardless of how far the diamond's
// child-corner is horizontally from the child (e.g. a married-in spouse seated by a
// different couple). The horizontal connector is a short fixed-down jog (TRUNK) that
// sits right under the diamond, so the visible span above the child is one clean
// vertical line rather than a mid-gap Z-bend.
//
// Because React Flow passes living sourceX/sourceY/targetX/targetY every render, the
// path stays attached and follows the cards when they are dragged, exactly like the
// default smoothstep edges did.
const TRUNK = 14;

interface ChildData {
  adopted?: boolean;
  step?: boolean;
  color?: string;
  // Optional line-hop points (world coords) computed over ALL child edges after layout
  // settles. Each hop splices a small semicircular arc so two unavoidable crossing
  // child lines read as independent bridges rather than intersecting. Empty/absent =
  // this edge does not yield (drawn straight), which is also the zero-change default.
  hops?: HopPoint[];
}

function FamilyChildEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  data,
}: EdgeProps & { data?: ChildData }) {
  const isAdopted = data?.adopted ?? false;
  const isStep = data?.step ?? false;
  const color = isAdopted ? "var(--edge-adopted)" : isStep ? "var(--edge-step)" : (data?.color ?? "var(--edge-child)");
  // Short vertical trunk straight down from the source (diamond), then a horizontal
  // jog to the child's X, then a LONG straight vertical drop into the child's top.
  const path = data?.hops?.length
    ? pathWithHops(sourceX, sourceY, targetX, targetY, data.hops)
    : `M ${sourceX},${sourceY} L ${sourceX},${sourceY + TRUNK} L ${targetX},${sourceY + TRUNK} L ${targetX},${targetY}`;
  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        stroke: color,
        strokeWidth: isAdopted ? 2.5 : 2,
        opacity: 1,
        strokeDasharray: isAdopted ? "6 4" : undefined,
      }}
    />
  );
}

export default FamilyChildEdge;