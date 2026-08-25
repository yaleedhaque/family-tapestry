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
import InfoPanel from "@/components/InfoPanel";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/EditPanel";
import BrickBackground from "@/components/BrickBackground";
import { persons as staticPersons, unions as staticUnions, parentEdges as staticEdges } from "@/data/family";
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

function toPersonLike(p: PersonLike | DbPerson): PersonLike {
  if ("fullName" in p && "birthPlace" in p && "bio" in p) return p as PersonLike;
  const dp = p as DbPerson;
  return {
    id: dp.id,
    fullName: dp.full_name,
    birthYear: dp.birth_year,
    deathYear: dp.death_year,
    isAlive: dp.is_alive,
    bio: dp.bio ?? "",
    birthPlace: dp.birth_place ?? "",
    profession: dp.profession ?? "",
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
const PERSON_NODE_W = 160;
const PERSON_NODE_H = 130;
const UNION_NODE_W = 80;
const UNION_NODE_H = 80;

export default function TapestryCanvas() {
  const [rawPersons, setRawPersons] = useState<PersonLike[]>([]);
  const [rawUnions, setRawUnions] = useState<UnionLike[]>([]);
  const [rawEdges, setRawEdges] = useState<EdgeLike[]>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonLike | null>(null);
  const [showEdges, setShowEdges] = useState(false);
  const [animPhase, setAnimPhase] = useState<"idle" | "running" | "done">("idle");
  const layoutVersionRef = useRef(0);
  const initialLoadDone = useRef(false);

  const runLayout = useCallback(
    async (persons: PersonLike[], unions: UnionLike[], parentEdges: EdgeLike[], animate: boolean) => {
      const version = ++layoutVersionRef.current;

      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];

      for (const person of persons) {
        flowNodes.push({
          id: person.id,
          type: "personNode",
          data: { person },
          position: { x: 0, y: 0 },
        });
      }

      for (const union of unions) {
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

      for (const edge of parentEdges) {
        flowEdges.push(makeChildEdge(edge.unionId, edge.childId));
      }

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

      if (version !== layoutVersionRef.current) return;

      const positions = new Map<string, { x: number; y: number }>();
      if (layout.children) {
        for (const elkNode of layout.children) {
          if (elkNode.x !== undefined && elkNode.y !== undefined) {
            positions.set(elkNode.id, { x: elkNode.x, y: elkNode.y });
          }
        }
      }

      if (animate && !initialLoadDone.current) {
        initialLoadDone.current = true;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        positions.forEach((p) => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        setNodes(flowNodes.map((n) => ({ ...n, position: { x: centerX, y: centerY } })));
        setEdges(flowEdges);

        requestAnimationFrame(() => {
          setTimeout(() => {
            setAnimPhase("running");
            setNodes(flowNodes.map((n) => ({ ...n, position: positions.get(n.id) ?? { x: 0, y: 0 } })));
            setTimeout(() => setShowEdges(true), ANIM_DURATION * 0.5);
            setTimeout(() => setAnimPhase("done"), ANIM_DURATION + 100);
          }, 400);
        });
      } else {
        setShowEdges(true);
        setNodes(flowNodes.map((n) => ({ ...n, position: positions.get(n.id) ?? { x: 0, y: 0 } })));
        setEdges(flowEdges);
      }
    },
    [setNodes, setEdges]
  );

  useEffect(() => {
    const init = async () => {
      const hasSupabase = !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      let persons: PersonLike[];
      let unions: UnionLike[];
      let parentEdges: EdgeLike[];

      if (hasSupabase) {
        try {
          const data = await fetchFamilyData();
          persons = data.persons.map(toPersonLike);
          unions = data.unions.map(toUnionLike);
          parentEdges = data.parentEdges.map(toEdgeLike);
        } catch {
          persons = staticPersons;
          unions = staticUnions.map(toUnionLike);
          parentEdges = staticEdges;
        }
      } else {
        persons = staticPersons;
        unions = staticUnions.map(toUnionLike);
        parentEdges = staticEdges;
      }

      setRawPersons(persons);
      setRawUnions(unions);
      setRawEdges(parentEdges);
      await runLayout(persons, unions, parentEdges, true);
    };
    init();
  }, [runLayout]);

  const refreshLayout = useCallback(
    async (animate = false) => {
      await runLayout(rawPersons, rawUnions, rawEdges, animate);
    },
    [rawPersons, rawUnions, rawEdges, runLayout]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "personNode") {
        const p = node.data.person as PersonLike;
        const live = rawPersons.find((pp) => pp.id === p.id);
        setSelectedPerson(live ?? p);
      }
    },
    [rawPersons]
  );

  const handleUpdatePerson = useCallback(
    (updated: PersonLike) => {
      setRawPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPerson(updated);
      setTimeout(() => refreshLayout(), 0);
    },
    [refreshLayout]
  );

  const handleDeletePerson = useCallback(
    (personId: string) => {
      setRawPersons((prev) => prev.filter((p) => p.id !== personId));
      setRawUnions((prev) => prev.filter((u) => u.partnerA !== personId && u.partnerB !== personId));
      setRawEdges((prev) => prev.filter((e) => e.childId !== personId));
      setSelectedPerson(null);
      setTimeout(() => refreshLayout(), 0);
    },
    [refreshLayout]
  );

  const handleAddPartner = useCallback(
    (personId: string, partnerId: string, unionType: string, startYear: number | null) => {
      const id = "u" + (rawUnions.length + 1) + "_" + Date.now();
      const newUnion: UnionLike = {
        id,
        partnerA: personId,
        partnerB: partnerId,
        type: unionType,
        startYear,
        endYear: null,
      };
      setRawUnions((prev) => [...prev, newUnion]);
      setTimeout(() => refreshLayout(), 0);
    },
    [refreshLayout]
  );

  const handleAddChild = useCallback(
    (parentId: string, childId: string) => {
      const existingUnion = rawUnions.find(
        (u) => u.partnerA === parentId || u.partnerB === parentId
      );

      if (existingUnion) {
        const alreadyLinked = rawEdges.some(
          (e) => e.unionId === existingUnion.id && e.childId === childId
        );
        if (!alreadyLinked) {
          setRawEdges((prev) => [...prev, { unionId: existingUnion.id, childId }]);
        }
      } else {
        const unionId = "u" + (rawUnions.length + 1) + "_auto_" + Date.now();
        setRawUnions((prev) => [
          ...prev,
          { id: unionId, partnerA: parentId, partnerB: "", type: "marriage", startYear: null, endYear: null },
        ]);
        setRawEdges((prev) => [...prev, { unionId, childId }]);
      }
      setTimeout(() => refreshLayout(), 0);
    },
    [rawUnions, rawEdges, refreshLayout]
  );

  const handleCreatePersonAndLink = useCallback(
    (
      newPerson: PersonLike,
      linkType: "partner" | "child" | "parent",
      relatedToId: string,
      unionType?: string,
      startYear?: number | null,
    ) => {
      setRawPersons((prev) => [...prev, newPerson]);

      if (linkType === "partner") {
        const id = "u" + (rawUnions.length + 1) + "_" + Date.now();
        setRawUnions((prev) => [
          ...prev,
          { id, partnerA: relatedToId, partnerB: newPerson.id, type: unionType ?? "marriage", startYear: startYear ?? null, endYear: null },
        ]);
      } else if (linkType === "child") {
        const existingUnion = rawUnions.find(
          (u) => u.partnerA === relatedToId || u.partnerB === relatedToId
        );
        if (existingUnion) {
          setRawEdges((prev) => [...prev, { unionId: existingUnion.id, childId: newPerson.id }]);
        } else {
          const unionId = "u" + (rawUnions.length + 1) + "_auto_" + Date.now();
          setRawUnions((prev) => [
            ...prev,
            { id: unionId, partnerA: relatedToId, partnerB: "", type: "marriage", startYear: null, endYear: null },
          ]);
          setRawEdges((prev) => [...prev, { unionId, childId: newPerson.id }]);
        }
      } else if (linkType === "parent") {
        const unionId = "u" + (rawUnions.length + 1) + "_auto_" + Date.now();
        setRawUnions((prev) => [
          ...prev,
          { id: unionId, partnerA: newPerson.id, partnerB: relatedToId, type: "marriage", startYear: null, endYear: null },
        ]);
        setRawEdges((prev) => [...prev, { unionId, childId: relatedToId }]);
      }

      setTimeout(() => refreshLayout(), 0);
    },
    [rawUnions.length, rawUnions, refreshLayout]
  );

  const handleRemoveLink = useCallback(
    (linkType: "partner" | "child", fromId: string, toId: string) => {
      if (linkType === "partner") {
        setRawUnions((prev) =>
          prev.filter((u) => !((u.partnerA === fromId && u.partnerB === toId) || (u.partnerA === toId && u.partnerB === fromId)))
        );
      } else {
        setRawEdges((prev) => {
          const target = prev.find((e) => e.childId === toId);
          if (!target) return prev;
          const union = rawUnions.find((u) => u.id === target.unionId);
          if (!union) return prev;
          if (union.partnerA === fromId || union.partnerB === fromId) {
            return prev.filter((e) => !(e.unionId === target.unionId && e.childId === toId));
          }
          return prev;
        });
      }
      setTimeout(() => refreshLayout(), 0);
    },
    [rawUnions, refreshLayout]
  );

  return (
    <>
      <style>{`
        .react-flow__node {
          ${animPhase === "running"
            ? `transition: transform ${ANIM_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                          opacity ${ANIM_DURATION}ms ease-out;`
            : ""}
          opacity: ${animPhase === "idle" ? 0 : 1};
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

        <InfoPanel
          person={selectedPerson}
          persons={rawPersons}
          unions={rawUnions}
          parentEdges={rawEdges}
          onClose={() => setSelectedPerson(null)}
          onUpdatePerson={handleUpdatePerson}
          onDeletePerson={handleDeletePerson}
          onAddPartner={handleAddPartner}
          onAddChild={handleAddChild}
          onCreatePersonAndLink={handleCreatePersonAndLink}
          onRemoveLink={handleRemoveLink}
        />
      </div>
    </>
  );
}
