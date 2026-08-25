"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

import PersonNode from "@/components/PersonNode";
import UnionNode from "@/components/UnionNode";
import InfoPanel from "@/components/InfoPanel";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import BrickBackground from "@/components/BrickBackground";
import TapestryBanner from "@/components/TapestryBanner";
import SearchBar from "@/components/SearchBar";
import TreeToolbar from "@/components/TreeToolbar";
import GedcomImport from "@/components/GedcomImport";
import KeyboardHelp from "@/components/KeyboardHelp";
import AddPersonModal from "@/components/AddPersonModal";
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
    email: "",
    phone: "",
    address: "",
    website: "",
    lat: null,
    lng: null,
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
    labelBgStyle: isDivorced ? { fill: "var(--tapestry-bg)", fillOpacity: 0.9 } : undefined,
    labelBgPadding: isDivorced ? ([6, 3] as [number, number]) : undefined,
  };
}

function makeChildEdge(source: string, target: string): Edge {
  return {
    id: `${source}-${target}-child`,
    source,
    target,
    type: "smoothstep",
    style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 10, height: 10 },
  };
}

const ANIM_DURATION = 1200;
const PERSON_NODE_W = 160;
const PERSON_NODE_H = 130;
const UNION_NODE_W = 80;
const UNION_NODE_H = 80;

function nextUnionId(unions: UnionLike[]) {
  const maxN = unions.reduce((max, u) => {
    const m = u.id.match(/u(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `u${maxN + 1}`;
}

function nextPersonId(persons: PersonLike[]) {
  const maxN = persons.reduce((max, p) => {
    const m = p.id.match(/p(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `p${maxN + 1}`;
}

export default function TapestryCanvas() {
  const { fitView } = useReactFlow();
  const [rawPersons, setRawPersons] = useState<PersonLike[]>([]);
  const [rawUnions, setRawUnions] = useState<UnionLike[]>([]);
  const [rawEdges, setRawEdges] = useState<EdgeLike[]>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonLike | null>(null);
  const [animPhase, setAnimPhase] = useState<"idle" | "running" | "done">("idle");
  const [showEdges, setShowEdges] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchHighlightId, setSearchHighlightId] = useState<string | null>(null);
  const [showGedcomImport, setShowGedcomImport] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const layoutVersionRef = useRef(0);
  const initialLoadDone = useRef(false);
  const isInitialLoad = useRef(true);

  // ── Build graph + run ELK ──
  const runLayout = useCallback(
    async (persons: PersonLike[], unions: UnionLike[], parentEdges: EdgeLike[], animate: boolean) => {
      const version = ++layoutVersionRef.current;

      const graphNodes: Node[] = [];
      const graphEdges: Edge[] = [];

      for (const person of persons) {
        graphNodes.push({ id: person.id, type: "personNode", data: { person }, position: { x: 0, y: 0 } });
      }
      for (const union of unions) {
        graphNodes.push({ id: union.id, type: "unionNode", data: { union }, position: { x: 0, y: 0 } });
        graphEdges.push(makeMarriageEdge(union.partnerA, union.id, union.type));
        if (union.partnerB) {
          graphEdges.push(makeMarriageEdge(union.partnerB, union.id, union.type));
        }
      }
      for (const edge of parentEdges) {
        graphEdges.push(makeChildEdge(edge.unionId, edge.childId));
      }

      const elkGraph = {
        id: "root",
        children: graphNodes.map((n) => ({
          id: n.id,
          width: n.type === "unionNode" ? UNION_NODE_W : PERSON_NODE_W,
          height: n.type === "unionNode" ? UNION_NODE_H : PERSON_NODE_H,
        })),
        edges: graphEdges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
      };

      const layout = await elk.layout(elkGraph, { layoutOptions: ELK_OPTIONS });
      if (version !== layoutVersionRef.current) return;

      const positions = new Map<string, { x: number; y: number }>();
      for (const c of layout.children ?? []) {
        if (c.x !== undefined && c.y !== undefined) positions.set(c.id, { x: c.x, y: c.y });
      }

      const positioned = graphNodes.map((n) => ({ ...n, position: positions.get(n.id) ?? { x: 0, y: 0 } }));

      if (animate && !initialLoadDone.current) {
        initialLoadDone.current = true;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        positions.forEach((p) => {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        });
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;

        setNodes(positioned.map((n) => ({ ...n, position: { x: cx, y: cy } })));
        setFlowEdges(graphEdges);
        requestAnimationFrame(() => {
          setTimeout(() => {
            setAnimPhase("running");
            setNodes(positioned);
            setTimeout(() => setShowEdges(true), ANIM_DURATION * 0.5);
            setTimeout(() => setAnimPhase("done"), ANIM_DURATION + 100);
          }, 400);
        });
      } else {
        setShowEdges(true);
        setNodes(positioned);
        setFlowEdges(graphEdges);
      }
    },
    [setNodes, setFlowEdges]
  );

  // ── Initial load ──
  useEffect(() => {
    (async () => {
      const STORAGE_KEY = "family-tapestry-data";
      let persons: PersonLike[];
      let unions: UnionLike[];
      let parentEdges: EdgeLike[];

      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          persons = parsed.persons ?? staticPersons;
          unions = (parsed.unions ?? staticUnions).map(toUnionLike);
          parentEdges = parsed.edges ?? staticEdges;
        } catch {
          persons = staticPersons;
          unions = staticUnions.map(toUnionLike);
          parentEdges = staticEdges;
        }
      } else {
        const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
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
      }
      setRawPersons(persons);
      setRawUnions(unions);
      setRawEdges(parentEdges);
      await runLayout(persons, unions, parentEdges, true);
    })();
  }, [runLayout]);

  // ── Persist to localStorage on every change ──
  useEffect(() => {
    if (isInitialLoad.current) {
      if (rawPersons.length > 0) isInitialLoad.current = false;
      return;
    }
    const STORAGE_KEY = "family-tapestry-data";
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ persons: rawPersons, unions: rawUnions, edges: rawEdges }));
  }, [rawPersons, rawUnions, rawEdges]);

  // ── Re-layout whenever raw data changes (after first load) ──
  const prevDataSig = useRef("");
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const sig = `${rawPersons.length}|${rawUnions.length}|${rawEdges.length}`;
    if (sig === prevDataSig.current) return;
    prevDataSig.current = sig;
    runLayout(rawPersons, rawUnions, rawEdges, false);
  }, [rawPersons, rawUnions, rawEdges, runLayout]);

  // ── Keep selectedPerson live ──
  useEffect(() => {
    if (selectedPerson) {
      const live = rawPersons.find((p) => p.id === selectedPerson.id);
      if (live && live !== selectedPerson) setSelectedPerson(live);
    }
  }, [rawPersons, selectedPerson]);

  // ── Node click ──
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "personNode") {
        const p = node.data.person as PersonLike;
        setSelectedPerson(rawPersons.find((pp) => pp.id === p.id) ?? p);
      }
    },
    [rawPersons]
  );

  // ── Find the union that makes someone a parent ──
  const findParentUnion = useCallback(
    (personId: string): UnionLike | undefined =>
      rawUnions.find((u) => u.partnerA === personId || u.partnerB === personId),
    [rawUnions]
  );

  // ── CRUD: Update person ──
  const handleUpdatePerson = useCallback((updated: PersonLike) => {
    setRawPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedPerson(updated);
  }, []);

  // ── CRUD: Delete person ──
  const handleDeletePerson = useCallback((personId: string) => {
    setRawPersons((prev) => prev.filter((p) => p.id !== personId));
    setRawUnions((prev) => prev.filter((u) => u.partnerA !== personId && u.partnerB !== personId));
    setRawEdges((prev) => prev.filter((e) => e.childId !== personId));
    setSelectedPerson(null);
  }, []);

  // ── CRUD: Add partner (existing person) ──
  const handleAddPartner = useCallback(
    (personId: string, partnerId: string, unionType: string, startYear: number | null) => {
      setRawUnions((prev) => [
        ...prev,
        { id: nextUnionId(prev), partnerA: personId, partnerB: partnerId, type: unionType, startYear, endYear: null },
      ]);
    },
    []
  );

  // ── CRUD: Add child (existing person) ──
  const handleAddChild = useCallback(
    (parentId: string, childId: string) => {
      const union = findParentUnion(parentId);
      if (union) {
        setRawEdges((prev) => {
          if (prev.some((e) => e.unionId === union.id && e.childId === childId)) return prev;
          return [...prev, { unionId: union.id, childId }];
        });
      } else {
        const newId = nextUnionId(rawUnions);
        setRawUnions((prev) => [...prev, { id: newId, partnerA: parentId, partnerB: "", type: "marriage", startYear: null, endYear: null }]);
        setRawEdges((prev) => [...prev, { unionId: newId, childId }]);
      }
    },
    [findParentUnion, rawUnions]
  );

  // ── CRUD: Add parent (existing person) ──
  const handleAddParent = useCallback(
    (childId: string, parentId: string) => {
      const union = findParentUnion(parentId);
      if (union) {
        setRawEdges((prev) => {
          if (prev.some((e) => e.unionId === union.id && e.childId === childId)) return prev;
          return [...prev, { unionId: union.id, childId }];
        });
      } else {
        const newId = nextUnionId(rawUnions);
        setRawUnions((prev) => [...prev, { id: newId, partnerA: parentId, partnerB: "", type: "marriage", startYear: null, endYear: null }]);
        setRawEdges((prev) => [...prev, { unionId: newId, childId }]);
      }
    },
    [findParentUnion, rawUnions]
  );

  // ── CRUD: Create new person + link ──
  const handleCreatePersonAndLink = useCallback(
    (
      newPerson: PersonLike,
      linkType: "partner" | "child" | "parent",
      relatedToId: string,
      unionType?: string,
      startYear?: number | null
    ) => {
      if (!newPerson.fullName.trim()) return;
      if (newPerson.id === relatedToId) return;

      setRawPersons((prev) => [...prev, newPerson]);

      if (linkType === "partner") {
        setRawUnions((prev) => [
          ...prev,
          { id: nextUnionId(prev), partnerA: relatedToId, partnerB: newPerson.id, type: unionType ?? "marriage", startYear: startYear ?? null, endYear: null },
        ]);
      } else if (linkType === "child") {
        const union = findParentUnion(relatedToId);
        if (union) {
          setRawEdges((prev) => [...prev, { unionId: union.id, childId: newPerson.id }]);
        } else {
          const newId = nextUnionId(rawUnions);
          setRawUnions((prev) => [...prev, { id: newId, partnerA: relatedToId, partnerB: "", type: "marriage", startYear: null, endYear: null }]);
          setRawEdges((prev) => [...prev, { unionId: newId, childId: newPerson.id }]);
        }
      } else {
        // "parent": create union for new parent, link child edge to relatedToId
        const newId = nextUnionId(rawUnions);
        setRawUnions((prev) => [...prev, { id: newId, partnerA: newPerson.id, partnerB: "", type: "marriage", startYear: null, endYear: null }]);
        setRawEdges((prev) => [...prev, { unionId: newId, childId: relatedToId }]);
      }
    },
    [findParentUnion, rawUnions]
  );

  // ── CRUD: Remove link ──
  const handleRemoveLink = useCallback(
    (linkType: "partner" | "child", fromId: string, toId: string) => {
      if (linkType === "partner") {
        setRawUnions((prev) =>
          prev.filter((u) => !((u.partnerA === fromId && u.partnerB === toId) || (u.partnerA === toId && u.partnerB === fromId)))
        );
      } else {
        const edge = rawEdges.find((e) => e.childId === toId);
        if (edge) {
          const union = rawUnions.find((u) => u.id === edge.unionId);
          if (union && (union.partnerA === fromId || union.partnerB === fromId)) {
            setRawEdges((prev) => prev.filter((e) => !(e.unionId === edge.unionId && e.childId === toId)));
          }
        }
      }
    },
    [rawEdges, rawUnions]
  );

  // ── CRUD: Standalone add person (no link) ──
  const handleAddStandalonePerson = useCallback(
    (newPerson: PersonLike) => {
      if (!newPerson.fullName.trim()) return;
      setRawPersons((prev) => [...prev, newPerson]);
      setSelectedPerson(newPerson);
      setShowAddPerson(false);
    },
    []
  );

  // ── Navigate to person: select + fitView ──
  const handleNavigatePerson = useCallback(
    (personId: string) => {
      const p = rawPersons.find((pp) => pp.id === personId);
      if (p) {
        setSelectedPerson(p);
        setTimeout(() => fitView({ nodes: [{ id: personId }], padding: 0.3, duration: 400 }), 50);
      }
    },
    [rawPersons, fitView]
  );

  // ── Hover highlighting: find connected nodes ──
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const ids = new Set<string>([hoveredNodeId]);

    for (const u of rawUnions) {
      if (u.partnerA === hoveredNodeId || u.partnerB === hoveredNodeId) {
        ids.add(u.id);
        if (u.partnerA) ids.add(u.partnerA);
        if (u.partnerB) ids.add(u.partnerB);
      }
    }
    for (const e of rawEdges) {
      if (e.childId === hoveredNodeId) {
        ids.add(e.unionId);
        const union = rawUnions.find((u) => u.id === e.unionId);
        if (union) {
          if (union.partnerA) ids.add(union.partnerA);
          if (union.partnerB) ids.add(union.partnerB);
        }
      }
      if (e.unionId === hoveredNodeId) {
        ids.add(e.childId);
      }
    }
    return ids;
  }, [hoveredNodeId, rawUnions, rawEdges]);

  // ── Apply highlight/dim data to nodes ──
  useEffect(() => {
    if (!connectedNodeIds && !searchHighlightId) {
      setNodes((prev) => prev.map((n) => {
        if (n.data.highlighted || n.data.dimmed) {
          return { ...n, data: { ...n.data, highlighted: false, dimmed: false } };
        }
        return n;
      }));
      return;
    }

    setNodes((prev) => prev.map((n) => {
      const isActive = searchHighlightId
        ? n.id === searchHighlightId
        : connectedNodeIds?.has(n.id) ?? false;
      return { ...n, data: { ...n.data, highlighted: n.id === (searchHighlightId ?? hoveredNodeId), dimmed: !isActive } };
    }));
  }, [connectedNodeIds, searchHighlightId, hoveredNodeId, setNodes]);

  // ── Search select handler ──
  const handleSearchSelect = useCallback(
    (person: PersonLike) => {
      setSelectedPerson(person);
      setSearchHighlightId(person.id);
      setTimeout(() => setSearchHighlightId(null), 2500);
    },
    []
  );

  // ── GEDCOM export (client-side from current data) ──
  const handleExportGedcom = useCallback(() => {
    const lines: string[] = [
      "0 HEAD",
      "1 SOUR FamilyTapestry",
      "2 VERS 1.0",
      "1 DEST GEDCOM",
      "1 DATE " + new Date().toISOString().split("T")[0],
      "1 GEDC",
      "2 VERS 5.5.1",
      "2 FORM LINEAGE-LINKED",
      "1 CHAR UTF-8",
    ];

    for (const p of rawPersons) {
      const id = p.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      lines.push(`0 @${id}@ INDI`);
      lines.push(`1 NAME ${p.fullName}`);
      if (p.birthYear) lines.push(`1 BIRT`, `2 DATE ${p.birthYear}`);
      if (p.deathYear) lines.push(`1 DEAT`, `2 DATE ${p.deathYear}`);
      if (p.profession) lines.push(`1 OCCU ${p.profession}`);
      if (p.birthPlace) lines.push(`1 BIRT`, `2 PLAC ${p.birthPlace}`);
      if (p.bio) lines.push(`1 NOTE ${p.bio.replace(/\n/g, "\\n")}`);
    }

    for (const u of rawUnions) {
      const id = u.id.replace(/-/g, "").slice(0, 8).toUpperCase();
      const aId = u.partnerA.replace(/-/g, "").slice(0, 8).toUpperCase();
      const bId = u.partnerB ? u.partnerB.replace(/-/g, "").slice(0, 8).toUpperCase() : "";
      lines.push(`0 @${id}@ FAM`);
      if (aId) lines.push(`1 HUSB @${aId}@`);
      if (bId) lines.push(`1 WIFE @${bId}@`);
      if (u.startYear) lines.push(`1 MARR`, `2 DATE ${u.startYear}`);
      for (const e of rawEdges.filter((e) => e.unionId === u.id)) {
        const cId = e.childId.replace(/-/g, "").slice(0, 8).toUpperCase();
        lines.push(`1 CHIL @${cId}@`);
      }
    }

    lines.push("0 TRLR");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-tapestry.ged";
    a.click();
    URL.revokeObjectURL(url);
  }, [rawPersons, rawUnions, rawEdges]);

  // ── GEDCOM import handler ──
  const handleGedcomImport = useCallback(
    (persons: PersonLike[], unions: UnionLike[], edges: EdgeLike[]) => {
      setRawPersons(persons);
      setRawUnions(unions);
      setRawEdges(edges);
      layoutVersionRef.current++;
      initialLoadDone.current = false;
      runLayout(persons, unions, edges, true);
    },
    [runLayout]
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        setSelectedPerson(null);
        setHoveredNodeId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <style>{`
        .react-flow__node {
          ${animPhase === "running" ? `transition: transform ${ANIM_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${ANIM_DURATION}ms ease-out;` : ""}
          opacity: ${animPhase === "idle" ? 0 : 1};
        }
        .react-flow__edge {
          opacity: ${showEdges ? 1 : 0};
          transition: opacity 300ms ease-in;
        }
        .tapestry-hovering .react-flow__edge {
          opacity: ${showEdges ? 0.12 : 0} !important;
          transition: opacity 200ms ease;
        }
        .tapestry-hovering .react-flow__edge.highlighted {
          opacity: 1 !important;
        }
        .tapestry-search-pulse .react-flow__node[data-highlighted="true"] {
          animation: searchPulse 2.5s ease-out;
        }
        @keyframes searchPulse {
          0% { box-shadow: 0 0 0 0 rgba(201,162,75,0.6); }
          50% { box-shadow: 0 0 24px 8px rgba(201,162,75,0.3); }
          100% { box-shadow: 0 0 0 0 rgba(201,162,75,0); }
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

      <div className={`w-full h-screen relative overflow-hidden ${hoveredNodeId ? "tapestry-hovering" : ""} ${searchHighlightId ? "tapestry-search-pulse" : ""}`}>
        <BrickBackground />

        <TapestryBanner />

        <TreeToolbar
          persons={rawPersons}
          unions={rawUnions}
          parentEdges={rawEdges}
          onExportGedcom={handleExportGedcom}
          onImportGedcom={() => setShowGedcomImport(true)}
        />

        <div className="absolute inset-0 z-10">
          <ReactFlow
            nodes={nodes}
            edges={flowEdges.map((e) => {
              if (!hoveredNodeId) return e;
              const isConnected = e.source === hoveredNodeId || e.target === hoveredNodeId ||
                connectedNodeIds?.has(e.source) || connectedNodeIds?.has(e.target);
              return { ...e, className: isConnected ? "highlighted" : "" };
            })}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
            onNodeMouseLeave={() => setHoveredNodeId(null)}
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

        <SearchBar persons={rawPersons} onSelect={handleSearchSelect} />

        {rawPersons.length === 0 && !showAddPerson && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="text-center pointer-events-auto space-y-4">
              <div className="space-y-1">
                <h2 className="font-display text-2xl text-[var(--parchment)]">Your Family Tapestry Awaits</h2>
                <p className="text-sm text-[var(--parchment-dim)] font-body">Add the first person to begin building your tree.</p>
              </div>
              <button onClick={() => setShowAddPerson(true)} className="px-6 py-2.5 rounded-lg bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body text-sm hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(201,162,75,0.3)]">
                + Add First Person
              </button>
            </div>
          </div>
        )}

        {rawPersons.length > 0 && (
          <button
            onClick={() => setShowAddPerson(true)}
            className="fixed bottom-20 right-6 z-30 w-12 h-12 rounded-full bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body text-xl shadow-[0_0_20px_rgba(201,162,75,0.4)] hover:opacity-90 transition-opacity flex items-center justify-center"
            title="Add Person"
          >
            +
          </button>
        )}

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
          onAddParent={handleAddParent}
          onCreatePersonAndLink={handleCreatePersonAndLink}
          onRemoveLink={handleRemoveLink}
          nextPersonId={() => nextPersonId(rawPersons)}
          onNavigate={handleNavigatePerson}
        />
      </div>

      {/* Navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex justify-center pb-3 pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-[#0E0B0A]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 rounded-full shadow-[0_-2px_16px_rgba(0,0,0,0.4)] pointer-events-auto">
          <a href="/" className="px-3 py-1.5 text-xs rounded-full bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] font-body">Tree</a>
          <a href="/timeline" className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body">Timeline</a>
          <a href="/map" className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body">Map</a>
          <button
            onClick={() => setShowGedcomImport(true)}
            className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body"
          >
            Import
          </button>
          <button
            onClick={() => {}}  // triggers KeyboardHelp via ?
            className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body"
            title="Press ? for keyboard shortcuts"
          >
            ?
          </button>
        </div>
      </nav>

      {showGedcomImport && (
        <GedcomImport onImport={handleGedcomImport} onClose={() => setShowGedcomImport(false)} />
      )}

      {showAddPerson && (
        <AddPersonModal
          persons={rawPersons}
          nextId={() => nextPersonId(rawPersons)}
          onAdd={handleAddStandalonePerson}
          onClose={() => setShowAddPerson(false)}
        />
      )}

      <KeyboardHelp />
    </>
  );
}
