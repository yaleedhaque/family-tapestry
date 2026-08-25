"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
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
import { persons as staticPersons, unions as staticUnions, parentEdges as staticEdges, type Person } from "@/data/family";
import { fetchFamilyData } from "@/lib/data";
import type { DbPerson } from "@/lib/types";

const nodeTypes = { personNode: PersonNode, unionNode: UnionNode };

const elk = new ELK();
const ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.layered.spacing.nodeNode": "60",
  "elk.spacing.nodeNode": "40",
  "elk.padding": "40",
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

function toUnionLike(u: { id: string; partnerA?: string; partner_b?: string; partner_a?: string; type?: string; union_type?: string; startYear?: number | null; start_year?: number | null; endYear?: number | null; end_year?: number | null }): UnionLike {
  return {
    id: u.id,
    partnerA: u.partnerA ?? u.partner_a ?? "",
    partnerB: u.partnerA ? "" : (u.partner_b ?? ""),
    type: u.type ?? u.union_type ?? "marriage",
    startYear: u.startYear ?? u.start_year ?? null,
    endYear: u.endYear ?? u.end_year ?? null,
  };
}

function toEdgeLike(e: { unionId?: string; union_id?: string; childId?: string; child_id?: string }): EdgeLike {
  return {
    unionId: e.unionId ?? e.union_id ?? "",
    childId: e.childId ?? e.child_id ?? "",
  };
}

export default function TapestryCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonLike | null>(null);

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

        flowEdges.push({
          id: `${union.partnerA}-${union.id}`,
          source: union.partnerA,
          target: union.id,
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 12, height: 12 },
        });

        if (union.partnerB) {
          flowEdges.push({
            id: `${union.partnerB}-${union.id}`,
            source: union.partnerB,
            target: union.id,
            type: "smoothstep",
            style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 12, height: 12 },
          });
        }
      }

      for (const edge of rawEdges) {
        flowEdges.push({
          id: `${edge.unionId}-${edge.childId}`,
          source: edge.unionId,
          target: edge.childId,
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 12, height: 12 },
        });
      }

      const elkGraph = {
        id: "root",
        children: flowNodes.map((n) => ({ id: n.id })),
        edges: flowEdges.map((e) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      const layout = await elk.layout(elkGraph, { layoutOptions: ELK_OPTIONS });

      if (layout.children) {
        for (const elkNode of layout.children) {
          const flowNode = flowNodes.find((n) => n.id === elkNode.id);
          if (flowNode && elkNode.x !== undefined && elkNode.y !== undefined) {
            flowNode.position = { x: elkNode.x, y: elkNode.y };
          }
        }
      }

      setNodes(flowNodes);
      setEdges(flowEdges);
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
    <div className="w-full h-screen relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
        }}
        className="bg-tapestry-bg"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--thread-gold-dim)"
          style={{ opacity: 0.2 }}
        />
        <Controls
          className="!bg-tapestry-bg-alt !border-thread-gold-dim !rounded-lg"
          showInteractive={false}
        />
      </ReactFlow>

      <DetailDrawer person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </div>
  );
}
