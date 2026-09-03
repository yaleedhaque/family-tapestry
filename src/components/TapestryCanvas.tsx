"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStoreApi,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { manualFamilyLayout } from "@/lib/familyLayout";
import {
  visibleSubset,
  sampleDescendantNames,
  descendantCounts,
} from "@/lib/collapse";

import PersonNode from "@/components/PersonNode";
import UnionNode from "@/components/UnionNode";
import CollapsedNode from "@/components/CollapsedNode";
import FamilyChildEdge from "@/components/FamilyChildEdge";
import InfoPanel from "@/components/InfoPanel";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import {
  toPersonLike,
  toUnionLike,
  toEdgeLike,
  toUnionRow,
  toEdgeRow,
} from "@/lib/convert";
import BrickBackground from "@/components/BrickBackground";
import TapestryBanner from "@/components/TapestryBanner";
import SearchBar from "@/components/SearchBar";
import TreeToolbar from "@/components/TreeToolbar";
import GedcomImport from "@/components/GedcomImport";
import KeyboardHelp from "@/components/KeyboardHelp";
import HelpModal from "@/components/HelpModal";
import AddPersonModal from "@/components/AddPersonModal";
import AddChildModal from "@/components/AddChildModal";
import MobileNav from "@/components/MobileNav";
import Legend from "@/components/Legend";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";
import { useIsMobile } from "@/lib/mobile";
import { computeGenerationMap, personRingStatus, STATUS_RING_COLORS } from "@/lib/generation";
import { persons as staticPersons, unions as staticUnions, parentEdges as staticEdges } from "@/data/family";
import type { Source } from "@/data/family";
import { fetchFamilyData } from "@/lib/data";
import type { TreeChange } from "@/lib/types";
import { useRealtimeTree, useTreePresence, usePresenceFollow } from "@/lib/supabase/realtime";
import type { PresencePayload } from "@/lib/types";
import ViewerCard from "@/components/ViewerCard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useUserCircle } from "@/lib/useUserCircle";
import { consolidateSingleParentBiologicalUnions, type Gender } from "@/lib/parentRules";
import { computeHops, buildChildPath, type ChildEdgeMeta, type HopPoint } from "@/lib/edgeGeometry";
import { useTreeCrud, nextPersonId } from "@/hooks/useTreeCrud";
import { useTreeManagement } from "@/hooks/useTreeManagement";
import { downloadGedcom } from "@/lib/gedcom";

const nodeTypes = { personNode: PersonNode, unionNode: UnionNode, collapsedNode: CollapsedNode };
const edgeTypes = { familychild: FamilyChildEdge };

function makeMarriageEdge(source: string, target: string, unionType: string, targetHandle?: string): Edge {
  const isDivorced = unionType === "divorced";
  return {
    id: `${source}-${target}-marriage`,
    source,
    target,
    targetHandle,
    type: "straight",
    style: {
      stroke: isDivorced ? "var(--divorce-red)" : "var(--edge-marriage)",
      strokeWidth: 2.5,
      opacity: isDivorced ? 0.85 : 1,
      strokeDasharray: isDivorced ? "6 4" : undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: isDivorced ? "var(--divorce-red)" : "var(--edge-marriage-dim)",
      width: 14,
      height: 14,
    },
    label: isDivorced ? "divorced" : undefined,
    labelStyle: isDivorced
      ? { fill: "var(--ember-red)", fontSize: 10, fontFamily: "var(--font-body)" }
      : undefined,
    labelBgStyle: isDivorced ? { fill: "var(--tapestry-bg)", fillOpacity: 0.9 } : undefined,
    labelBgPadding: isDivorced ? ([6, 3] as [number, number]) : undefined,
  };
}

function makeChildEdge(source: string, target: string, relationshipType?: string, sourceHandle?: string, targetHandle = "top", ringColor?: string): Edge {
  const isAdopted = relationshipType === "adopted";
  const isStep = relationshipType === "step";
  // Biological children draw their line in the child's ring (status) colour so each
  // child line reads distinctly; adopted/step use their own relationship colours.
  const color = isAdopted ? "var(--edge-adopted)" : isStep ? "var(--edge-step)" : (ringColor ?? "var(--edge-child)");
  return {
    id: `${source}-${target}-child`,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "familychild",
    data: { adopted: isAdopted, step: isStep, color },
    style: {
      stroke: color,
      strokeWidth: isAdopted ? 2.5 : 2,
      strokeDasharray: isAdopted ? "6 4" : isStep ? "4 3" : undefined,
      opacity: 0.9,
    },
    animated: isAdopted,
    label: isAdopted ? "adopted" : isStep ? "step" : undefined,
    labelStyle: {
      fill: isAdopted ? "var(--edge-adopted)" : isStep ? "var(--edge-step)" : "var(--parchment-dim)",
      fontSize: 10,
      fontFamily: "var(--font-body)",
    },
    labelBgStyle: { fill: "var(--tapestry-bg)", fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
  };
}

const ANIM_DURATION = 550;
const UNION_W = 110;
const PERSON_W = 210;
// Marriage edges are native React Flow `straight` edges, so for a perfectly horizontal
// line the diamond's partner-corner handles (at node-local y=75, i.e. dCy) must sit at
// EXACTLY the couple's card-bottom height. Any drop here would make the straight line
// slope. The child-corner (bottom of the diamond) still drops to the offspring row, so
// the diamond's vertical extent below the cards is unchanged below; keep DROP 0 for
// flat marriage lines.
const DIAMOND_DROP = 0;

export default function TapestryCanvas() {
  const { fitView, setViewport, getViewport, getNodes } = useReactFlow();
  const storeApi = useStoreApi();
  const { user, canEdit, loading: authLoading } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [rawPersons, setRawPersons] = useState<PersonLike[]>([]);
  const [rawUnions, setRawUnions] = useState<UnionLike[]>([]);
  const [rawEdges, setRawEdges] = useState<EdgeLike[]>([]);
  const [rawSources, setRawSources] = useState<Source[]>([]);

  const rawPersonsRef = useRef<PersonLike[]>(rawPersons);
  const rawUnionsRef = useRef<UnionLike[]>(rawUnions);
  const rawEdgesRef = useRef<EdgeLike[]>(rawEdges);
  const rawSourcesRef = useRef<Source[]>(rawSources);
  useEffect(() => {
    rawPersonsRef.current = rawPersons;
    rawUnionsRef.current = rawUnions;
    rawEdgesRef.current = rawEdges;
    rawSourcesRef.current = rawSources;
  }, [rawPersons, rawUnions, rawEdges, rawSources]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonLike | null>(null);
  const [animPhase, setAnimPhase] = useState<"idle" | "running" | "done">("idle");
  const [showEdges, setShowEdges] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchHighlightId, setSearchHighlightId] = useState<string | null>(null);
  const [showGedcomImport, setShowGedcomImport] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [addChildUnion, setAddChildUnion] = useState<{ unionId: string; parentAName: string; parentBName: string } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [activeTreeId, setActiveTreeId] = useState("default");
  const [treeNames, setTreeNames] = useState<Record<string, string>>({ "default": "The Haque Tapestry" });
  const [onlineUsers, setOnlineUsers] = useState<PresencePayload[]>([]);
  const [selectedViewer, setSelectedViewer] = useState<PresencePayload | null>(null);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const followingIdRef = useRef<string | null>(null);
  followingIdRef.current = followingId;
  const followCamsRef = useRef<Record<string, { x: number; y: number; z: number }>>({});
  const broadcastTimerRef = useRef<number | null>(null);
  const layoutVersionRef = useRef(0);
  const initialLoadDone = useRef(false);
  const isInitialLoad = useRef(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [showFitHint, setShowFitHint] = useState(false);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const collapsedRef = useRef<Set<string>>(collapsed);
  collapsedRef.current = collapsed;
  const toggleCollapseRef = useRef<(unionId: string) => void>(() => {});

  const gate = useUserCircle(user, rawPersons, rawUnions, rawEdges);
  const canCreate = gate.isEditorOrAdmin || gate.role === "user";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "family-tapestry-fit-hint-dismissed";
    try {
      if (!localStorage.getItem(key)) {
        setShowFitHint(true);
      }
    } catch { /* ignore */ }
  }, []);

  const generationMap = useMemo(
    () => computeGenerationMap(rawPersons, rawUnions, rawEdges),
    [rawPersons, rawUnions, rawEdges]
  );

  // ─── Find parent union (needed by both layout and CRUD hook) ───
  const findParentUnion = useCallback(
    (personId: string): UnionLike | undefined =>
      rawUnions.find((u) => u.partnerA === personId || u.partnerB === personId),
    [rawUnions]
  );

  // ─── Realtime subscription ───
  const handleRealtimeChange = useCallback((change: TreeChange) => {
    if (!user) return;
    if (change.table === "persons" && change.eventType === "UPDATE" && change.new) {
      const n = change.new as Record<string, unknown>;
      setRawPersons((prev) =>
        prev.map((p) =>
          p.id === n.id
            ? {
                ...p,
                fullName: (n.full_name as string) ?? p.fullName,
                birthYear: (n.birth_year as number) ?? p.birthYear,
                deathYear: (n.death_year as number) ?? p.deathYear,
                isAlive: (n.is_alive as boolean) ?? p.isAlive,
                bio: (n.bio as string) ?? p.bio,
                birthPlace: (n.birth_place as string) ?? p.birthPlace,
                profession: (n.profession as string) ?? p.profession,
                photoUrl: (n.photo_url as string) ?? p.photoUrl,
              }
            : p
        )
      );
    }
  }, [user]);
  useRealtimeTree(handleRealtimeChange);

  // ─── Presence ───
  const presenceUser = useMemo(() => {
    if (!user) return null;
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name = (meta?.full_name as string) ?? user.email?.split("@")[0] ?? "User";
    return { id: user.id, name, email: user.email ?? undefined };
  }, [user]);
  useTreePresence(presenceUser, setOnlineUsers);

  const { shareCamera } = usePresenceFollow(presenceUser, (fromUserId, camera) => {
    if (followingIdRef.current !== fromUserId) return;
    followCamsRef.current[fromUserId] = camera;
  });

  const onCanvasMove = useCallback(
    (_: unknown, viewport: { x: number; y: number; zoom: number }) => {
      shareCamera({ x: viewport.x, y: viewport.y, z: viewport.zoom });
      if (followingIdRef.current) {
        setFollowingId(null);
        followingIdRef.current = null;
      }
    },
    [shareCamera]
  );

  const followUser = useCallback(
    (viewer: PresencePayload) => {
      if (followingId === viewer.userId) {
        setFollowingId(null);
        followingIdRef.current = null;
        return;
      }
      setFollowingId(viewer.userId);
      followingIdRef.current = viewer.userId;
      const cam = followCamsRef.current[viewer.userId];
      if (cam) {
        setViewport({ x: cam.x, y: cam.y, zoom: cam.z }, { duration: 400 });
      }
    },
    [followingId, setViewport]
  );

  // ─── CRUD hook ───
  const {
    handleUpdatePerson,
    handleDeletePerson,
    handleAddPartner,
    handleUpdateUnion,
    handleUpdateEdgeType,
    handleAddChild,
    handleAddParent,
    handleCreatePersonAndLink,
    handleRemoveLink,
    handleSetSingleParent,
    handleAddSource,
    handleUpdateSource,
    handleDeleteSource,
    handleAddStandalonePerson,
    handleNavigatePerson,
    genderById,
    wouldConflict,
  } = useTreeCrud({
    user,
    toast,
    rawPersons,
    rawUnions,
    rawEdges,
    rawSources,
    rawPersonsRef,
    rawUnionsRef,
    rawEdgesRef,
    rawSourcesRef,
    setRawPersons,
    setRawUnions,
    setRawEdges,
    setRawSources,
    setSelectedPerson,
    setShowAddPerson,
    fitView,
    findParentUnion,
  });

  // ─── Diamond: add child ───
  const handleAddChildDiamond = useCallback(
    (unionId: string) => {
      const union = rawUnionsRef.current.find((u) => u.id === unionId);
      if (!union) return;
      const pA = rawPersonsRef.current.find((p) => p.id === union.partnerA);
      const pB = rawPersonsRef.current.find((p) => p.id === union.partnerB);
      setAddChildUnion({
        unionId,
        parentAName: pA?.fullName ?? "Unknown",
        parentBName: pB?.fullName ?? "",
      });
    },
    [rawUnionsRef, rawPersonsRef]
  );

  // ─── Layout ───
  const runLayout = useCallback(
    async (persons: PersonLike[], unions: UnionLike[], parentEdges: EdgeLike[], animate: boolean, genMap?: Record<string, number>) => {
      const version = ++layoutVersionRef.current;

      const generationMap = genMap ?? computeGenerationMap(persons, unions, parentEdges);

      const sub = visibleSubset(persons, unions, parentEdges, collapsedRef.current);

      const visiblePids = new Set(sub.persons);
      const visibleUids = new Set(sub.unions);
      const visiblePersons = persons.filter((p) => visiblePids.has(p.id));
      const visibleUnions = unions.filter((u) => visibleUids.has(u.id));
      const subEdgeKeys = new Set(sub.edges.map((e) => `${e.unionId}\u0000${e.childId}`));
      const visibleEdges = parentEdges.filter((e) =>
        subEdgeKeys.has(`${e.unionId}\u0000${e.childId}`)
      );

      const surrogates: { id: string; unionId: string; count: number; names: string[] }[] = [];
      for (const ce of sub.collapsedEdges) {
        const ids = sub.collapseSubtree.get(ce.unionId) ?? [];
        const names = sampleDescendantNames(persons, unions, parentEdges, ce.unionId, 5);
        surrogates.push({ id: ce.childId, unionId: ce.unionId, count: ids.length, names });
      }
      const hiddenCounts = descendantCounts(persons, unions, parentEdges);
      const layoutPersons = [
        ...visiblePersons.map((p) => ({ id: p.id, fullName: p.fullName })),
        ...surrogates.map((s) => ({ id: s.id, fullName: `${s.count}` })),
      ];
      const layoutEdges = [
        ...visibleEdges.map((e) => ({ unionId: e.unionId, childId: e.childId })),
        ...sub.collapsedEdges.map((ce) => ({ unionId: ce.unionId, childId: ce.childId })),
      ];

      const graphNodes: Node[] = [];
      const graphEdges: Edge[] = [];

      for (const person of visiblePersons) {
        graphNodes.push({ id: person.id, type: "personNode", data: { person, generation: generationMap[person.id] ?? 0, ringStatus: personRingStatus(person, unions) }, position: { x: 0, y: 0 } });
      }
      for (const union of visibleUnions) {
        if (!union.partnerB) continue;
        graphNodes.push({ id: union.id, type: "unionNode", data: { union, persons: visiblePersons, isCollapsed: collapsedRef.current.has(union.id), descendantCount: hiddenCounts.get(union.id) ?? 0, onToggleCollapse: (id: string) => toggleCollapseRef.current(id), onAddChildDiamond: (unionId: string) => handleAddChildDiamond(unionId) }, position: { x: 0, y: 0 } });
      }
      for (const s of surrogates) {
        graphNodes.push({
          id: s.id,
          type: "collapsedNode",
          data: { unionId: s.unionId, count: s.count, names: s.names, label: `${s.count} ${s.count === 1 ? "person" : "people"} in hidden branch — expand`, onExpand: (id: string) => toggleCollapseRef.current(id) },
          position: { x: 0, y: 0 },
        });
      }

      const { positions } = await manualFamilyLayout(layoutPersons, visibleUnions, layoutEdges, surrogates);
      if (version !== layoutVersionRef.current) return;
      const layoutPositions = new Map<string, { x: number; y: number }>(positions);

      const cxOf = (n: { x: number; y: number }, w: number) => n.x + w / 2;
      for (const union of visibleUnions) {
        if (!union.partnerB) continue;
        const uPos = layoutPositions.get(union.id);
        if (!uPos) continue;
        const dCx = cxOf(uPos, UNION_W);
        const handleFor = (pid: string) => {
          const pPos = layoutPositions.get(pid);
          if (!pPos) return "partner-left";
          return cxOf(pPos, PERSON_W) <= dCx ? "partner-left" : "partner-right";
        };
        graphEdges.push(makeMarriageEdge(union.partnerA, union.id, union.type, handleFor(union.partnerA)));
        graphEdges.push(makeMarriageEdge(union.partnerB, union.id, union.type, handleFor(union.partnerB)));
      }

      for (const edge of visibleEdges) {
        const union = visibleUnions.find((u) => u.id === edge.unionId);
        const childPerson = persons.find((p) => p.id === edge.childId);
        const ringColor = childPerson ? STATUS_RING_COLORS[personRingStatus(childPerson, unions)] : undefined;
        if (union && !union.partnerB) {
          graphEdges.push(makeChildEdge(union.partnerA, edge.childId, edge.relationshipType, "bottom", "top", ringColor));
        } else {
          graphEdges.push(makeChildEdge(edge.unionId, edge.childId, edge.relationshipType, "child", "top", ringColor));
        }
      }

      for (const s of surrogates) {
        graphEdges.push({
          id: `${s.unionId}-${s.id}-collapse`,
          source: s.unionId,
          target: s.id,
          type: "smoothstep",
          sourceHandle: "child",
          targetHandle: "top",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, strokeDasharray: "5 5", opacity: 0.8 },
          animated: true,
        });
      }

      const positioned = graphNodes.map((n) => ({ ...n, position: layoutPositions.get(n.id) ?? { x: 0, y: 0 } }));

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

  // ─── Diamond anchor fix ───
  useEffect(() => {
    if (animPhase !== "done") return;
    const all = getNodes();
    const byId = new Map(all.map((n) => [n.id, n]));
    const hasBox = (n: { position?: { x?: number; y?: number }; measured?: { width?: number; height?: number } }) =>
      !!n &&
      n.position && n.position.x != null && n.position.y != null &&
      n.measured && n.measured.width != null && n.measured.height != null;

    const adjustments: { id: string; y: number; cornerA: number; cornerB: number }[] = [];
    // Equalize partner card heights within each couple: a shorter partner card makes
    // the two diamond partner-corner handles drift off the diamond graphic's fixed
    // corners (the diamond can only have corners at ONE height), so at least one
    // marriage line ends up visibly bent. Growing the shorter card to match its partner
    // brings both bottoms level, so both corners coincide with the drawn diamond and
    // both lines run horizontally, like the straight couples.
    const minHeights = new Map<string, number>();
    for (const n of all) {
      if (n.type !== "unionNode") continue;
      const union = (n.data as { union?: { partnerA?: string; partnerB?: string } })?.union;
      const a = union?.partnerA;
      const b = union?.partnerB;
      if (!a || !b) continue;
      const at = byId.get(a);
      const bt = byId.get(b);
      const ah = at?.measured?.height;
      const bh = bt?.measured?.height;
      if (!at || !bt || ah == null || bh == null) continue;
      const partnerHeight = Math.max(ah, bh);
      const rowTop = Math.min(at.position.y, bt.position.y);
      const aBottom = at.position.y + ah;
      const bBottom = bt.position.y + bh;
      // If the two partner cards are on the same row but differ in height, grow the
      // shorter one so the couple's card bottoms line up (straight diamond lines).
      if (Math.abs(aBottom - bBottom) <= 120) {
        if (ah < partnerHeight) minHeights.set(a, partnerHeight);
        if (bh < partnerHeight) minHeights.set(b, partnerHeight);
      }
      // Use equalized card bottoms for the diamond geometry (both partners level).
      const aBottomEff = rowTop + partnerHeight;
      const bBottomEff = rowTop + partnerHeight;
      // A couple whose two partners sit on different rows (remarriage / multi-couple
      // person) has partner bottoms far apart; a single diamond cannot meet both with
      // straight lines without landing on the unrelated cards between them. Fall back
      // to the legacy layout anchor (centered corners) for those.
      if (Math.abs(aBottom - bBottom) > 120) {
        adjustments.push({
          id: n.id,
          y: n.position.y,
          cornerA: 75,
          cornerB: 75,
        });
        continue;
      }
      const ux = n.position.x;
      // The diamond graphic is always drawn such that its two partner corners sit at
      // each partner's card-bottom height, so both marriage lines enter horizontally.
      // Its vertical centre is therefore the (now level) partner-bottom height, pushed
      // DIAMOND_DROP farther DOWN so the corners hang a little below the cards — that
      // lengthens each marriage line's straight horizontal run and removes the visible
      // left/right bend at the corner entry.
      let dCy = (aBottomEff + bBottomEff) / 2 + DIAMOND_DROP;
      // Never let the diamond rise above the couple's own cards (the taller one).
      const dTopLimit = rowTop + partnerHeight;
      if (dCy - 16 < dTopLimit) dCy = dTopLimit + 16;
      // Box top: the 150px node spans 74px either side of the diamond centre so the
      // label/collapse affordances wrap the diamond.
      const baseY = dCy - 75;
      // Collision-guard the DIAMOND footprint (its true visual box, ~110 wide × 68 tall
      // covering the two partner corners) against every non-partner card.
      const partners = new Set<string>();
      if (union.partnerA) partners.add(union.partnerA);
      if (union.partnerB) partners.add(union.partnerB);
      const collides = (dpTop: number) => {
        const dpBottom = dpTop + 150;
        for (const nn of all) {
          if (nn.id === n.id || partners.has(nn.id)) continue;
          if (!hasBox(nn)) continue;
          const bx = nn.position.x, bw = nn.measured!.width!;
          const by = nn.position.y, bh = nn.measured!.height!;
          // Horizontal overlap uses the diamond's x (≈ union x).
          if (ux < bx + bw && ux + UNION_W > bx) {
            if (dpTop < by + bh && dpBottom > by) return true;
          }
        }
        return false;
      };
      let boxY = baseY;
      if (collides(baseY)) {
        let raised = baseY;
        for (let y = baseY - 1; y >= n.position.y - 1; y -= 1) {
          if (!collides(y)) { raised = y; break; }
        }
        boxY = raised;
      }
      // Corner handles (local offsets relative to the union node TOP) must sit at each
      // partner's card-bottom height so both marriage lines enter horizontally.
      const cornerA = aBottomEff - boxY;
      const cornerB = bBottomEff - boxY;
      if (boxY >= 0 && Math.abs(boxY - n.position.y) > 1.5) {
        adjustments.push({ id: n.id, y: boxY, cornerA, cornerB });
      } else {
        // Diamond box already where it should be; still sync the corner heights.
        adjustments.push({ id: n.id, y: n.position.y, cornerA: aBottomEff - n.position.y, cornerB: bBottomEff - n.position.y });
      }
    }
    setNodes((nds) => nds.map((nd) => {
      const adj = adjustments.find((x) => x.id === nd.id);
      const mh = nd.type === "personNode" ? minHeights.get(nd.id) : undefined;
      if (!adj && mh == null) return nd;
      return {
        ...nd,
        position: adj ? { ...nd.position, y: adj.y } : nd.position,
        data: adj ? { ...nd.data, partnerCorners: { a: adj.cornerA, b: adj.cornerB } } : nd.data,
        style: mh != null ? { ...(nd.style ?? {}), minHeight: mh } : nd.style,
      };
    }));
  }, [animPhase, getNodes, setNodes]);

  // ─── Line-hop pass (Group D) ───
  // AFTER layout settles and edges have rendered (diamond-anchor effect above has
  // moved union boxes), read React Flow's authoritative per-edge endpoints and compute
  // line hops for genuinely-unavoidable child-line crossings. Each hop is a small
  // semicircular bridge (via FamilyChildEdge.pathWithHops) so crossing lines read as
  // independent rather than intersecting. Scheduled on requestAnimationFrame so it runs
  // AFTER the diamond-anchor setNodes has committed and the store reflects the final
  // node positions; runs once per layout.
  const hopVersionRef = useRef(-1);
  useEffect(() => {
    if (animPhase !== "done") return;
    const version = ++hopVersionRef.current;
    const raf = requestAnimationFrame(() => {
      if (version !== hopVersionRef.current) return;
      const edges = storeApi.getState().edgeLookup;
      if (!edges) return;
      // Build the metadata for every child edge from its RENDERED endpoints. The
      // store's edgeLookup carries the computed handle coords (sourceX/…/targetY) that
      // only exist at render time, so we read them off the internal objects.
      const metas: ChildEdgeMeta[] = [];
      for (const e of Array.from(edges.values())) {
        if (e.type !== "familychild") continue;
        const rt = e as Edge & { sourceX?: number; sourceY?: number; targetX?: number; targetY?: number };
        const d = (e.data ?? {}) as { adopted?: boolean; step?: boolean; color?: string };
        const sx = rt.sourceX, sy = rt.sourceY, tx = rt.targetX, ty = rt.targetY;
        if (sx == null || sy == null || tx == null || ty == null) continue;
        metas.push({
          id: e.id,
          generation: 0,
          isAdopted: d.adopted,
          isStep: d.step,
          path: buildChildPath(sx, sy, tx, ty),
        });
      }
      if (metas.length < 2) return; // nothing can cross
      const hops = computeHops(metas);
      if (hops.size === 0) return;
      // Attach hops to the matching edges (in case the store edges changed since read).
      setFlowEdges((prev) =>
        prev.map((f) => {
          const pts: HopPoint[] | undefined = hops.get(f.id);
          if (!pts || !pts.length) return f;
          return { ...f, data: { ...(f.data ?? {}), hops: pts } };
        })
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [animPhase, setFlowEdges, storeApi]);

  // ─── Initial load ───
  useEffect(() => {
    (async () => {
      const STORAGE_KEY = "family-tapestry-trees";
      let persons: PersonLike[];
      let unions: UnionLike[];
      let parentEdges: EdgeLike[];
      let sources: Source[] = [];
      let treeId = "default";
      let names: Record<string, string> = { "default": "The Haque Tapestry" };

      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          treeId = parsed.activeTree ?? "default";
          names = parsed.names ?? { "default": "The Haque Tapestry" };
          const tree = parsed.trees?.[treeId];
          if (tree) {
            persons = tree.persons ?? staticPersons;
            unions = (tree.unions ?? staticUnions).map(toUnionLike);
            parentEdges = tree.edges ?? staticEdges;
            sources = tree.sources ?? [];
          } else {
            persons = staticPersons;
            unions = staticUnions.map(toUnionLike);
            parentEdges = staticEdges;
          }
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

      if (user) {
        try {
          const res = await fetch("/api/tree");
          if (res.ok) {
            const db = await res.json();
            if (db.persons?.length > 0) {
              persons = db.persons.map(toPersonLike);
              unions = db.unions.map(toUnionLike);
              parentEdges = db.edges.map(toEdgeLike);
              sources = db.sources?.map((s: Record<string, unknown>) => ({
                id: s.id as string, personId: s.person_id as string, type: s.type as Source["type"],
                title: s.title as string, url: s.url as string, notes: s.notes as string,
                dateAdded: s.date_added as string,
              })) ?? [];
            }
          }
        } catch { /* fall back to localStorage data */ }
      } else if (!saved) {
        const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
        if (hasSupabase) {
          const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
          try {
            const data = await Promise.race([fetchFamilyData(), timeout]);
            if (data && data.persons.length > 0) {
              persons = data.persons.map(toPersonLike);
              unions = data.unions.map(toUnionLike);
              parentEdges = data.parentEdges.map(toEdgeLike);
            }
          } catch {
            /* keep static demo data as fallback */
          }
        }
      }

      setActiveTreeId(treeId);
      setTreeNames(names);
      {
        const genders = new Map<string, Gender>(
          persons.map((p) => [p.id, (p.gender as Gender) ?? ""])
        );
        const cons = consolidateSingleParentBiologicalUnions(
          unions.map(toUnionRow),
          parentEdges.map(toEdgeRow),
          genders
        );
        unions = cons.unions.map(toUnionLike);
        parentEdges = cons.edges.map(toEdgeLike);
      }
      setRawPersons(persons);
      setRawUnions(unions);
      setRawEdges(parentEdges);
      setRawSources(sources);
      await runLayout(persons, unions, parentEdges, true);
      setDataLoading(false);
    })();
  }, [runLayout, user]);

  // ─── Persist to localStorage ───
  useEffect(() => {
    if (isInitialLoad.current) {
      if (rawPersons.length > 0) isInitialLoad.current = false;
      return;
    }
    const STORAGE_KEY = "family-tapestry-trees";
    const saved = localStorage.getItem(STORAGE_KEY);
    let trees: Record<string, { persons: PersonLike[]; unions: UnionLike[]; edges: EdgeLike[]; sources?: Source[] }> = {};
    let names: Record<string, string> = treeNames;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        trees = parsed.trees ?? {};
        names = { ...names, ...parsed.names };
      } catch { /* use defaults */ }
    }
    trees[activeTreeId] = { persons: rawPersons, unions: rawUnions, edges: rawEdges, sources: rawSources };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trees, names, activeTree: activeTreeId }));
  }, [rawPersons, rawUnions, rawEdges, rawSources, activeTreeId, treeNames]);

  // ─── Re-layout on data change ───
  const prevDataSig = useRef("");
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const sig = `${rawPersons.length}|${rawUnions.length}|${rawEdges.length}`;
    if (sig === prevDataSig.current) return;
    prevDataSig.current = sig;
    runLayout(rawPersons, rawUnions, rawEdges, false, generationMap);
  }, [rawPersons, rawUnions, rawEdges, runLayout, generationMap]);

  // ─── Collapse ───
  const collapseKey = `family-tapestry-collapsed-${activeTreeId}`;
  const loadCollapsed = useCallback((): Set<string> => {
    try {
      const raw = localStorage.getItem(collapseKey);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    } catch { /* ignore corrupt */ }
    return new Set();
  }, [collapseKey]);

  useEffect(() => {
    setCollapsed(loadCollapsed());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTreeId]);

  const toggleCollapse = useCallback((unionId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(unionId)) next.delete(unionId);
      else next.add(unionId);
      try {
        localStorage.setItem(collapseKey, JSON.stringify(Array.from(next)));
      } catch { /* non-fatal */ }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapseKey]);
  toggleCollapseRef.current = toggleCollapse;

  useEffect(() => {
    if (!initialLoadDone.current) return;
    runLayout(rawPersons, rawUnions, rawEdges, false, generationMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, runLayout]);

  // ─── Keep selectedPerson live ───
  useEffect(() => {
    if (selectedPerson) {
      const live = rawPersons.find((p) => p.id === selectedPerson.id);
      if (live && live !== selectedPerson) setSelectedPerson(live);
    }
  }, [selectedPerson, rawPersons]);

  // ─── Node click ───
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "personNode") {
        const p = node.data.person as PersonLike;
        setSelectedPerson(rawPersons.find((pp) => pp.id === p.id) ?? p);
      }
    },
    [rawPersons]
  );

  // ─── Tree management hook ───
  const {
    switchTree,
    createTree,
    deleteTree,
    renameTree,
    handleGedcomImport,
  } = useTreeManagement({
    user,
    toast,
    rawPersons,
    rawUnions,
    rawEdges,
    rawSources,
    rawPersonsRef,
    rawUnionsRef,
    rawEdgesRef,
    rawSourcesRef,
    setRawPersons,
    setRawUnions,
    setRawEdges,
    setRawSources,
    activeTreeId,
    setActiveTreeId,
    treeNames,
    setTreeNames,
    setSelectedPerson,
    initialLoadDone,
    layoutVersionRef,
    runLayout,
  });

  // ─── Hover highlighting ───
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

  // ─── Search ───
  const handleSearchSelect = useCallback(
    (person: PersonLike) => {
      setSelectedPerson(person);
      setSearchHighlightId(person.id);
      setTimeout(() => setSearchHighlightId(null), 2500);
    },
    []
  );

  // ─── Full-tree export ───
  const exportFullTree = useCallback(
    async (format: "png" | "pdf") => {
      const flowEl = viewportRef.current?.querySelector(".react-flow");
      if (!flowEl) return;
      const prev = getViewport();
      const x0 = prev.x, y0 = prev.y, z0 = prev.zoom;

      const { exportToPNG, exportToPDF } = await import("@/lib/export");

      const restore = () => setViewport({ x: x0, y: y0, zoom: z0 }, { duration: 0 });
      try {
        fitView({ padding: 0.08, duration: 400, maxZoom: 3 });
        await new Promise((r) => setTimeout(r, 700));
        const current = getViewport();
        if (format === "png") await exportToPNG(flowEl as HTMLDivElement, current.zoom);
        else await exportToPDF(flowEl as HTMLDivElement, current.zoom);
      } catch (err) {
        console.error("Full-tree export failed:", err);
        toast("Could not export full tree", "error");
      } finally {
        restore();
      }
    },
    [fitView, getViewport, setViewport, toast]
  );

  // ─── GEDCOM export ───
  const handleExportGedcom = useCallback(() => {
    downloadGedcom(rawPersons, rawUnions, rawEdges);
  }, [rawPersons, rawUnions, rawEdges]);

  // ─── Keyboard shortcuts ───
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        setSelectedPerson(null);
        setHoveredNodeId(null);
        setShowHelp(false);
      } else if (e.key === "?") {
        setShowHelp(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Recenter ───
  const handleRecenter = useCallback(() => {
    const root = getComputedStyle(document.documentElement);
    const top = parseFloat(root.getPropertyValue("--chrome-top")) || 0;
    const bottom = parseFloat(root.getPropertyValue("--chrome-bottom")) || 0;
    const pad = Math.min(0.5, Math.max(0.05, (top + bottom) / window.innerHeight + 0.04));
    fitView({ padding: pad, duration: 450, maxZoom: 1.5 });
  }, [fitView]);

  return (
    <>
      <style>{`
        .react-flow__node {
          ${animPhase === "running" ? `transition: transform ${ANIM_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity ${ANIM_DURATION}ms ease-out;` : ""}
          opacity: ${animPhase === "idle" ? 0 : 1};
        }
        .react-flow__edge {
          opacity: ${showEdges ? 1 : 0};
        }
        .tapestry-hovering .react-flow__edge {
          opacity: ${showEdges ? 0.12 : 0} !important;
        }
      `}</style>
      <div ref={viewportRef} className={`w-full h-screen relative overflow-hidden ${hoveredNodeId ? "tapestry-hovering" : ""} ${searchHighlightId ? "tapestry-search-pulse" : ""}`}>
        <BrickBackground />

        <TapestryBanner title={treeNames[activeTreeId] ?? "Family Tapestry"} />

        <TreeToolbar
          persons={rawPersons}
          unions={rawUnions}
          parentEdges={rawEdges}
          onExportGedcom={handleExportGedcom}
          onImportGedcom={() => setShowGedcomImport(true)}
          onExportImage={exportFullTree}
        />

        <Legend />

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
            onMove={onCanvasMove}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            proOptions={{ hideAttribution: true }}
            minZoom={0.1}
            maxZoom={isMobile ? 2 : 3}
            defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
            fitView
            fitViewOptions={{ padding: 0.3, maxZoom: isMobile ? 1.2 : 1.5 }}
            panOnDrag
            zoomOnPinch
            zoomOnScroll={!isMobile}
            zoomOnDoubleClick={false}
            preventScrolling
          >
            <Controls
              showInteractive={false}
              className="!right-auto !left-3 !bottom-[9.7rem] md:!bottom-3"
            />
            {!isMobile && (
              <MiniMap
                nodeStrokeColor="var(--thread-gold)"
                nodeColor={(n) =>
                  STATUS_RING_COLORS[(n.data?.ringStatus as keyof typeof STATUS_RING_COLORS | undefined) ?? "living"]
                }
                maskColor="rgba(22,19,15,0.7)"
                pannable
                zoomable
              />
            )}
          </ReactFlow>
        </div>

        {!showHelp && <SearchBar persons={rawPersons} onSelect={handleSearchSelect} />}

        {dataLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full border-[3px] border-[var(--thread-gold-dim)]/30 border-t-[var(--thread-gold)] animate-spin" />
              <p className="text-sm text-[var(--parchment-dim)] font-body">Unfolding the tapestry…</p>
            </div>
          </div>
        )}

        {rawPersons.length === 0 && !showAddPerson && canCreate && !dataLoading && (
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

        {rawPersons.length > 0 && canCreate && (
          <button
            onClick={() => setShowAddPerson(true)}
            aria-label="Add person"
            className="fixed bottom-24 md:bottom-20 right-6 z-30 w-12 h-12 rounded-full bg-[var(--thread-gold)] text-[var(--tapestry-bg)] font-body text-2xl leading-none shadow-[0_0_20px_rgba(201,162,75,0.4)] hover:opacity-90 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="Add Person"
          >
            +
          </button>
        )}

        {rawPersons.length > 0 && (
          <button
            onClick={handleRecenter}
            aria-label="Recenter tree"
            title="Recenter"
            className="fixed bottom-24 left-4 z-30 md:hidden w-11 h-11 rounded-full bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/40 text-[var(--parchment-dim)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex items-center justify-center"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
            </svg>
          </button>
        )}

        {showFitHint && (
          <button
            onClick={() => {
              handleRecenter();
              setShowFitHint(false);
              try { localStorage.setItem("family-tapestry-fit-hint-dismissed", "1"); } catch { /* ignore */ }
            }}
            aria-label="Fit tree to screen"
            className="fixed bottom-32 md:bottom-24 right-6 z-30 hidden md:flex items-center gap-1.5 px-3 py-2 text-xs rounded-full bg-[var(--tapestry-bg-alt)]/95 backdrop-blur-md border border-[var(--thread-gold-dim)]/40 text-[var(--thread-gold)] hover:border-[var(--thread-gold)] transition-colors shadow-[var(--shadow-lg)]"
          >
            <span aria-hidden="true">⤢</span> Fit to screen
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
          onUpdateUnion={handleUpdateUnion}
          onAddChild={handleAddChild}
          onAddParent={handleAddParent}
          onUpdateEdgeType={handleUpdateEdgeType}
          onCreatePersonAndLink={handleCreatePersonAndLink}
          onRemoveLink={handleRemoveLink}
          onSetSingleParent={handleSetSingleParent}
          nextPersonId={() => nextPersonId(rawPersons)}
          onNavigate={handleNavigatePerson}
          canEdit={selectedPerson ? gate.canEditPerson(selectedPerson.id) : false}
          canEditPrivate={selectedPerson ? gate.canEditPrivate(selectedPerson.id) : false}
          canDelete={gate.canDelete}
          locked={selectedPerson ? gate.locked(selectedPerson.id) : false}
          sources={rawSources.filter((s) => s.personId === selectedPerson?.id)}
          onAddSource={handleAddSource}
          onUpdateSource={handleUpdateSource}
          onDeleteSource={handleDeleteSource}
          nextSourceId={() => `src-${Date.now().toString(36)}`}
        />
      </div>

      {/* Tree selector */}
      <div className="fixed top-4 left-4 z-30 flex items-center gap-2 flex-wrap max-md:max-w-[calc(100vw-8rem)]"><LanguageSwitcher />
        <select
          value={activeTreeId}
          onChange={(e) => switchTree(e.target.value)}
          className="max-w-[52vw] px-3 py-2 text-xs rounded-lg bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 text-[var(--parchment)] font-body appearance-none cursor-pointer pr-6 focus:outline-none focus:border-[var(--thread-gold)] truncate"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A24B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
          title="Switch tree"
        >
          {Object.entries(treeNames).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        {canEdit && (
          <button
            onClick={createTree}
            className="px-2.5 py-2 text-xs rounded-lg bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)] transition-colors font-body"
            title="Create new tree"
          >
            + Tree
          </button>
        )}
        {canEdit && (
          <button
            onClick={renameTree}
            className="px-2.5 py-2 text-xs rounded-lg bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--thread-gold-dim)]/30 text-[var(--thread-gold-dim)] hover:text-[var(--thread-gold)] hover:border-[var(--thread-gold)] transition-colors font-body"
            title="Rename this tree"
            aria-label="Rename this tree"
          >
            ✏️
          </button>
        )}
        {!authLoading && user && user.role === "admin" && (
          <button
            onClick={() => {
              if (window.confirm("Delete this tree forever? All its people, couples and notes will be removed. This cannot be undone.")) {
                deleteTree();
              }
            }}
            className="px-2.5 py-2 text-xs rounded-lg bg-[var(--tapestry-bg)]/85 backdrop-blur-sm border border-[var(--ember-red)]/40 text-[var(--ember-red)] hover:bg-[var(--ember-red)]/10 hover:border-[var(--ember-red)] transition-colors font-body"
            title="Delete this tree (admin only)"
            aria-label="Delete this tree"
          >
            🗑
          </button>
        )}
      </div>

      {/* Navigation bar — desktop only */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 hidden md:flex justify-center pb-3 pointer-events-none">
        <div className="flex items-center gap-1 px-2 py-1.5 bg-[var(--tapestry-bg)]/95 backdrop-blur-md border border-[var(--thread-gold-dim)]/30 rounded-full shadow-[0_-2px_16px_rgba(0,0,0,0.4)] pointer-events-auto">
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
            onClick={() => setShowHelp(true)}
            className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body"
            title="Keyboard shortcuts (?)"
            aria-label="Help & keyboard shortcuts"
          >
            ?
          </button>
          <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
          <a href="/privacy" className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body" title="Privacy Policy" aria-label="Privacy Policy">
            🔒
          </a>
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 text-xs rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          {!authLoading && (
            user ? (
              <div className="flex items-center gap-1.5 pl-1 border-l border-[var(--thread-gold-dim)]/20 ml-1">
                <span className="px-2 py-1 text-[10px] rounded-full bg-[var(--thread-gold)]/15 text-[var(--thread-gold)] font-body">{user.role ?? "editor"}</span>
                {user.role === "admin" && (
                  <a href="/admin" className="px-2 py-1 text-[10px] rounded-full text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors font-body">
                    Admin
                  </a>
                )}
                <button
                  onClick={async () => {
                    const { createClient } = await import("@/lib/supabase/client");
                    await createClient().auth.signOut();
                    window.location.reload();
                  }}
                  className="px-2 py-1 text-[10px] rounded-full text-[var(--parchment-dim)] hover:text-[var(--parchment)] hover:bg-white/5 transition-colors font-body"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a href="/auth/login" className="px-3 py-1.5 text-xs rounded-full text-[var(--thread-gold)] hover:bg-[var(--thread-gold)]/10 transition-colors font-body border border-[var(--thread-gold)]/30 ml-1">
                Sign In
              </a>
            )
          )}
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

      {addChildUnion && (
        <AddChildModal
          parentAName={addChildUnion.parentAName}
          parentBName={addChildUnion.parentBName}
          persons={rawPersons}
          onAdd={(person, relType) => {
            const union = rawUnionsRef.current.find((u) => u.id === addChildUnion.unionId);
            if (!union) return;
            const parentId = union.partnerA || union.partnerB;
            if (!parentId) return;
            handleCreatePersonAndLink(person, "child", parentId, undefined, undefined, relType);
            setAddChildUnion(null);
          }}
          onClose={() => setAddChildUnion(null)}
        />
      )}

      <KeyboardHelp />
      <MobileNav hidden={!!selectedPerson} />

      {selectedViewer && (
        <div className="fixed bottom-16 left-16 z-40 hidden md:block">
          <ViewerCard
            viewer={selectedViewer}
            isFollowing={followingId === selectedViewer.userId}
            onFollow={() => followUser(selectedViewer)}
            onClose={() => setSelectedViewer(null)}
          />
        </div>
      )}
      {onlineUsers.length > 0 && (
        <div className="fixed bottom-3 left-16 z-30 hidden md:flex items-center gap-1.5">
          {onlineUsers.slice(0, 5).map((u) => {
            const active = selectedViewer?.userId === u.userId;
            const isF = followingId === u.userId;
            return (
              <button
                key={u.userId}
                type="button"
                onClick={() => setSelectedViewer(active ? null : u)}
                aria-label={`${u.userName} presence`}
                aria-expanded={active}
                title={`${u.userName}${u.editing ? " — editing" : u.viewing ? " — viewing" : " — online"}${isF ? " — being followed" : ""}`}
                className={`relative group w-7 h-7 rounded-full backdrop-blur-sm border flex items-center justify-center text-[9px] font-body font-medium select-none shadow-[0_2px_8px_rgba(0,0,0,0.3)] transition-colors ${
                  isF
                    ? "bg-[var(--thread-gold)] text-[var(--tapestry-bg)] border-[var(--thread-gold)]"
                    : "bg-[var(--tapestry-bg)]/90 border-[var(--thread-gold-dim)]/40 text-[var(--thread-gold)] hover:border-[var(--thread-gold)]"
                }`}
              >
                {u.userName.slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[var(--living-glow)] border border-[var(--tapestry-bg)]" />
              </button>
            );
          })}
          {onlineUsers.length > 5 && (
            <div className="w-7 h-7 rounded-full bg-[var(--tapestry-bg)]/90 backdrop-blur-sm border border-[var(--thread-gold-dim)]/40 flex items-center justify-center text-[9px] text-[var(--parchment-dim)] font-body">
              +{onlineUsers.length - 5}
            </div>
          )}
        </div>
      )}
    </>
  );
}
