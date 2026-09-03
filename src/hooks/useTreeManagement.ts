import { useCallback } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import type { Source } from "@/data/family";
import { toUnionLike } from "@/lib/convert";
import { persons as staticPersons, unions as staticUnions, parentEdges as staticEdges } from "@/data/family";

const STORAGE_KEY = "family-tapestry-trees";

interface UseTreeManagementParams {
  user: { id: string } | null;
  toast: (msg: string, type?: "error" | "success" | "info") => void;

  rawPersons: PersonLike[];
  rawUnions: UnionLike[];
  rawEdges: EdgeLike[];
  rawSources: Source[];

  rawPersonsRef: React.RefObject<PersonLike[]>;
  rawUnionsRef: React.RefObject<UnionLike[]>;
  rawEdgesRef: React.RefObject<EdgeLike[]>;
  rawSourcesRef: React.RefObject<Source[]>;

  setRawPersons: React.Dispatch<React.SetStateAction<PersonLike[]>>;
  setRawUnions: React.Dispatch<React.SetStateAction<UnionLike[]>>;
  setRawEdges: React.Dispatch<React.SetStateAction<EdgeLike[]>>;
  setRawSources: React.Dispatch<React.SetStateAction<Source[]>>;

  activeTreeId: string;
  setActiveTreeId: React.Dispatch<React.SetStateAction<string>>;
  treeNames: Record<string, string>;
  setTreeNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setSelectedPerson: React.Dispatch<React.SetStateAction<PersonLike | null>>;

  initialLoadDone: React.RefObject<boolean>;
  layoutVersionRef: React.RefObject<number>;
  runLayout: (
    persons: PersonLike[],
    unions: UnionLike[],
    parentEdges: EdgeLike[],
    animate: boolean,
    genMap?: Record<string, number>
  ) => Promise<void>;
}

interface UseTreeManagementReturn {
  switchTree: (newTreeId: string) => void;
  createTree: () => void;
  deleteTree: () => void;
  renameTree: () => void;
  handleGedcomImport: (
    persons: PersonLike[],
    unions: UnionLike[],
    edges: EdgeLike[]
  ) => void;
}

function loadTrees(): {
  trees: Record<string, { persons: PersonLike[]; unions: UnionLike[]; edges: EdgeLike[]; sources?: Source[] }>;
  names: Record<string, string>;
} {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { trees: {}, names: {} };
  try {
    const p = JSON.parse(saved);
    return { trees: p.trees ?? {}, names: p.names ?? {} };
  } catch {
    return { trees: {}, names: {} };
  }
}

export function useTreeManagement({
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
}: UseTreeManagementParams): UseTreeManagementReturn {
  // ─── Switch active tree ───

  const switchTree = useCallback(
    (newTreeId: string) => {
      if (newTreeId === activeTreeId) return;
      const { trees, names } = loadTrees();
      trees[activeTreeId] = {
        persons: rawPersonsRef.current,
        unions: rawUnionsRef.current,
        edges: rawEdgesRef.current,
        sources: rawSourcesRef.current,
      };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ trees, names, activeTree: newTreeId })
      );

      const tree = trees[newTreeId];
      if (tree) {
        setRawPersons(tree.persons);
        setRawUnions(tree.unions);
        setRawEdges(tree.edges);
        setRawSources(tree.sources ?? []);
      } else {
        setRawPersons(staticPersons);
        setRawUnions(staticUnions.map(toUnionLike));
        setRawEdges(staticEdges);
        setRawSources([]);
      }
      setActiveTreeId(newTreeId);
      setSelectedPerson(null);
      initialLoadDone.current = false;
      layoutVersionRef.current++;
    },
    [
      activeTreeId,
      rawPersonsRef,
      rawUnionsRef,
      rawEdgesRef,
      rawSourcesRef,
      setRawPersons,
      setRawUnions,
      setRawEdges,
      setRawSources,
      setActiveTreeId,
      setSelectedPerson,
      initialLoadDone,
      layoutVersionRef,
    ]
  );

  // ─── Create new tree ───

  const createTree = useCallback(() => {
    const name = prompt("Tree name:");
    if (!name?.trim()) return;
    const id = `tree-${Date.now().toString(36)}`;
    setTreeNames((prev) => ({ ...prev, [id]: name.trim() }));
    switchTree(id);
  }, [setTreeNames, switchTree]);

  // ─── Delete the ACTIVE tree (admin only) ───

  const deleteTree = useCallback(() => {
    const { trees, names } = loadTrees();

    trees[activeTreeId] = {
      persons: rawPersonsRef.current,
      unions: rawUnionsRef.current,
      edges: rawEdgesRef.current,
      sources: rawSourcesRef.current,
    };
    delete trees[activeTreeId];
    delete names[activeTreeId];

    const remaining = Object.keys(trees);
    const nextActive = remaining.length ? remaining[0] : "default";
    const nextNames = remaining.length
      ? names
      : { default: "The Haque Tapestry" };

    const t = trees[nextActive];
    if (t) {
      setRawPersons(t.persons);
      setRawUnions(t.unions);
      setRawEdges(t.edges);
      setRawSources(t.sources ?? []);
    } else {
      setRawPersons(staticPersons);
      setRawUnions(staticUnions.map(toUnionLike));
      setRawEdges(staticEdges);
      setRawSources([]);
    }
    setTreeNames(nextNames);
    setActiveTreeId(nextActive);
    setSelectedPerson(null);
    initialLoadDone.current = false;
    layoutVersionRef.current++;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        trees: remaining.length ? trees : {},
        names: nextNames,
        activeTree: nextActive,
      })
    );
  }, [
    activeTreeId,
    rawPersonsRef,
    rawUnionsRef,
    rawEdgesRef,
    rawSourcesRef,
    treeNames,
    setRawPersons,
    setRawUnions,
    setRawEdges,
    setRawSources,
    setTreeNames,
    setActiveTreeId,
    setSelectedPerson,
    initialLoadDone,
    layoutVersionRef,
  ]);

  // ─── Rename the ACTIVE tree's title ───

  const renameTree = useCallback(() => {
    const current = treeNames[activeTreeId] ?? "";
    const name = window.prompt("Tree name:", current);
    if (!name || !name.trim() || name.trim() === current) return;
    const trimmed = name.trim();
    setTreeNames((prev) => {
      const next = { ...prev, [activeTreeId]: trimmed };
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const p = JSON.parse(saved);
          const updatedNames = { ...p.names, [activeTreeId]: trimmed };
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...p, names: updatedNames })
          );
        } catch { /* ok */ }
      }
      return next;
    });
  }, [activeTreeId, treeNames, setTreeNames]);

  // ─── GEDCOM import → creates a brand-new tree ───

  const handleGedcomImport = useCallback(
    (persons: PersonLike[], unions: UnionLike[], edges: EdgeLike[]) => {
      const name = `Imported Tree ${new Date().toLocaleDateString("en-GB")}`;
      const id = `tree-${Date.now().toString(36)}`;
      const { trees, names } = loadTrees();
      trees[activeTreeId] = {
        persons: rawPersonsRef.current,
        unions: rawUnionsRef.current,
        edges: rawEdgesRef.current,
        sources: rawSourcesRef.current,
      };
      names[id] = name;
      trees[id] = { persons, unions, edges, sources: [] };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ trees, names, activeTree: id })
      );

      setTreeNames(names);
      setActiveTreeId(id);
      setRawPersons(persons);
      setRawUnions(unions);
      setRawEdges(edges);
      setRawSources([]);
      setSelectedPerson(null);
      layoutVersionRef.current++;
      initialLoadDone.current = false;
      runLayout(persons, unions, edges, true);
      toast(`Created new tree: ${name}`, "success");
    },
    [
      activeTreeId,
      rawPersonsRef,
      rawUnionsRef,
      rawEdgesRef,
      rawSourcesRef,
      treeNames,
      runLayout,
      toast,
      setTreeNames,
      setActiveTreeId,
      setRawPersons,
      setRawUnions,
      setRawEdges,
      setRawSources,
      setSelectedPerson,
      initialLoadDone,
      layoutVersionRef,
    ]
  );

  return {
    switchTree,
    createTree,
    deleteTree,
    renameTree,
    handleGedcomImport,
  };
}
