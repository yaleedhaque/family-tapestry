"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

import PersonNode from "@/components/PersonNode";
import UnionNode from "@/components/UnionNode";
import DetailDrawer from "@/components/DetailDrawer";
import BrickBackground from "@/components/BrickBackground";
import { persons as staticPersons, unions as staticUnions, parentEdges as staticEdges, type Person } from "@/data/family";
import { fetchFamilyData } from "@/lib/data";
import type { DbPerson } from "@/lib/types";

const nodeTypes = { personNode: PersonNode, unionNode: UnionNode };

const elk = new ELK();
const ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "120",
  "elk.layered.spacing.nodeNode": "60",
  "elk.spacing.nodeNode": "60",
  "elk.spacing.componentComponent": "60",
  "elk.padding": "[top=60,left=60,bottom=60,right=60]",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
};

type PersonLike = {
  id: string;
  fullName: string;
  birthYear: number | null;
  deathYear: number | null;
  isAlive: boolean;
  bio: string;
  birthPlace: string;
  profession: string;
};

type UnionLike = {
  id: string;
  partnerA: string;
  partnerB: string;
  type: string;
  startYear: number | null;
  endYear: number | null;
};

type EdgeLike = {
  unionId: string;
  childId: string;
};

function toPersonLike(p: Person | DbPerson): PersonLike {
  if ("fullName" in p) return p;
  return {
    id: p.id,
    fullName: p.full_name,
    birthYear: p.birth_year,
    deathYear: p.death_year,
    isAlive: p.is_alive,
    bio: p.bio ?? "",
    birthPlace: p.birth_place ?? "",
    profession: p.profession ?? "",
  };
}

function toUnionLike(raw: {
  id: string;
  partnerA?: string;
  partner_a?: string;
  partnerB?: string;
  partner_b?: string;
  type?: string;
  union_type?: string;
  startYear?: number | null;
  start_year?: number | null;
  endYear?: number | null;
  end_year?: number | null;
}): UnionLike {
  return {
    id: raw.id,
    partnerA: raw.partnerA ?? raw.partner_a ?? "",
    partnerB: raw.partnerB ?? raw.partner_b ?? "",
    type: raw.type ?? raw.union_type ?? "marriage",
    startYear: raw.startYear ?? raw.start_year ?? null,
    endYear: raw.endYear ?? raw.end_year ?? null,
  };
}

function toEdgeLike(e: {
  unionId?: string;
  union_id?: string;
  childId?: string;
  child_id?: string;
}): EdgeLike {
  return {
    unionId: e.unionId ?? e.union_id ?? "",
    childId: e.childId ?? e.child_id ?? "",
  };
}

function makeMarriageEdge(source: string, target: string, unionType: string): Edge {
  const isDivorced = unionType === "divorced";
  return {
    id: `${source}-${target}-marriage`,
    source,
    target,
    type: "smoothstep",
    style: {
      stroke: isDivorced ? "var(--ember-red)" : "var(--thread-gold)",
      strokeWidth: 2,
      opacity: isDivorced ? 0.7 : 0.8,
      strokeDasharray: isDivorced ? "6 4" : undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isDivorced ? "var(--ember-red)" : "var(--thread-gold-dim)",
      width: 12,
      height: 12,
    },
    label: isDivorced ? "divorced" : undefined,
    labelStyle: isDivorced
      ? { fill: "var(--ember-red)", fontSize: 10, fontFamily: "var(--font-body)" }
      : undefined,
    labelBgStyle: isDivorced
      ? { fill: "var(--tapestry-bg)", fillOpacity: 0.9 }
      : undefined,
    labelBgPadding: isDivorced ? ([6, 3] as [number, number]) : undefined,
  };
}

function makeChildEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}-child`,
    source,
    target,
    type: "smoothstep",
    style: {
      stroke: "var(--thread-gold)",
      strokeWidth: 1.5,
      opacity: 0.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "var(--thread-gold-dim)",
      width: 10,
      height: 10,
    },
  };
}

const ANIM_DURATION = 1200;

export default function TapestryCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonLike | null>(null);
  const [showEdges, setShowEdges] = useState(false);
  const [animStarted, setAnimStarted] = useState(false);
  const finalPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    const buildGraph = async () => {
      const hasSupabase = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      let rawPersons: PersonLike[];
      let rawUnions: UnionLike[];
      let rawEdges: EdgeLike[];

      if (hasSupabase) {
        try {
          const data = await fetchFamilyData();
          rawPersons = data.persons.map(toPersonLike);
          rawUnions = data.unions.map(toUnionLike);
          rawEdges = data.parentEdges.map(toEdgeLike);
        } catch (err) {
          console.error("Supabase fetch failed, falling back to static data:", err);
          rawPersons = staticPersons;
          rawUnions = staticUnions.map(toUnionLike);
          rawEdges = staticEdges;
        }
      } else {
        rawPersons = staticPersons;
        rawUnions = staticUnions.map(toUnionLike);
        rawEdges = staticEdges;
      }

      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];

      for (const person of rawPersons) {
        flowNodes.push({
          id: person.id,
          type: "personNode",
          data: { person },
          position: { x: 0, y: 0 },
        });
      }

      for (const union of rawUnions) {
        flowNodes.push({
          id: union.id,
          type: "unionNode",
          data: { union },
          position: { x: 0, y: 0 },
        });

        flowEdges.push(makeMarriageEdge(union.partnerA, union.id, union.type));
        if (union.partnerB) {
          flowEdges.push(makeMarriageEdge(union.partnerB, union.id, union.type));
        }
      }

      for (const edge of rawEdges) {
        flowEdges.push(makeChildEdge(edge.unionId, edge.childId));
      }

      const PERSON_NODE_W = 160;
      const PERSON_NODE_H = 130;
      const UNION_NODE_W = 80;
      const UNION_NODE_H = 80;

      const elkGraph = {
        id: "root",
        children: flowNodes.map((n) => ({
          id: n.id,
          width: n.type === "unionNode" ? UNION_NODE_W : PERSON_NODE_W,
          height: n.type === "unionNode" ? UNION_NODE_H : PERSON_NODE_H,
        })),
        edges: flowEdges.map((e) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      const layout = await elk.layout(elkGraph, { layoutOptions: ELK_OPTIONS });

      const positions = new Map<string, { x: number; y: number }>();
      if (layout.children) {
        for (const elkNode of layout.children) {
          if (elkNode.x !== undefined && elkNode.y !== undefined) {
            positions.set(elkNode.id, { x: elkNode.x, y: elkNode.y });
          }
        }
      }
      finalPositionsRef.current = positions;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      positions.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const stagedNodes: Node[] = flowNodes.map((n) => ({
        ...n,
        position: { x: centerX, y: centerY },
      }));

      setNodes([...stagedNodes]);
      setEdges([...flowEdges]);

      requestAnimationFrame(() => {
        setTimeout(() => {
          setAnimStarted(true);

          const finalNodes: Node[] = flowNodes.map((n) => {
            const pos = positions.get(n.id) ?? { x: 0, y: 0 };
            return {
              ...n,
              position: pos,
            };
          });

          setNodes([...finalNodes]);
          setTimeout(() => setShowEdges(true), ANIM_DURATION * 0.5);
        }, 400);
      });
    };

    buildGraph();
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "personNode") {
        setSelectedPerson(node.data.person as PersonLike);
      }
    },
    []
  );

  return (
    <>
      <style>{`
        .react-flow__node {
          transition: transform ${ANIM_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      opacity ${ANIM_DURATION}ms ease-out;
          opacity: ${animStarted ? 1 : 0};
        }
        .react-flow__edge {
          opacity: ${showEdges ? 1 : 0};
          transition: opacity 800ms ease-in;
        }
        .react-flow__minimap {
          background: rgba(20,17,14,0.85) !important;
          border: 1px solid var(--thread-gold-dim) !important;
          border-radius: 8px !important;
        }
        .react-flow__controls {
          background: rgba(20,17,14,0.85) !important;
          border: 1px solid var(--thread-gold-dim) !important;
          border-radius: 8px !important;
        }
        .react-flow__controls button {
          color: var(--parchment) !important;
          border-bottom-color: var(--thread-gold-dim) !important;
        }
        .react-flow__controls button:hover {
          background: rgba(201,162,75,0.15) !important;
        }
      `}</style>

      <div className="w-full h-screen relative overflow-hidden">
        <BrickBackground />

        <div className="absolute inset-0 z-10">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
            fitView
            fitViewOptions={{ padding: 0.3 }}
          >
            <Controls showInteractive={false} />
            <MiniMap
              nodeStrokeColor="var(--thread-gold)"
              nodeColor="rgba(201,162,75,0.2)"
              maskColor="rgba(14,11,10,0.7)"
              pannable
              zoomable
            />
          </ReactFlow>
        </div>

        <DetailDrawer person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      </div>
    </>
  );
}
