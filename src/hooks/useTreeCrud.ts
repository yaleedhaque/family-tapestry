import { useCallback, useMemo } from "react";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import type { Source } from "@/data/family";
import { toDbPerson, toDbSource } from "@/lib/convert";
import {
  findDualParentConflicts,
  type Gender,
} from "@/lib/parentRules";

// ─── Pure helpers (no React) ───

function nextUnionId(unions: UnionLike[]): string {
  let max = 0;
  for (const u of unions) {
    const n = parseInt(u.id.replace(/\D/g, ""), 10);
    if (n > max) max = n;
  }
  return `u${max + 1}`;
}

export function nextPersonId(persons: PersonLike[]): string {
  let max = 0;
  for (const p of persons) {
    const n = parseInt(p.id.replace(/\D/g, ""), 10);
    if (n > max) max = n;
  }
  return `p${max + 1}`;
}

async function apiCall(
  method: string,
  path: string,
  body?: unknown,
  onError?: () => void
) {
  try {
    const res = await fetch(`/api/${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) onError?.();
  } catch {
    onError?.();
  }
}

// ─── Hook types ───

interface UseTreeCrudParams {
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

  setSelectedPerson: React.Dispatch<React.SetStateAction<PersonLike | null>>;
  setShowAddPerson: React.Dispatch<React.SetStateAction<boolean>>;
  fitView: (opts?: Record<string, unknown>) => void;

  findParentUnion: (personId: string) => UnionLike | undefined;
}

interface UseTreeCrudReturn {
  handleUpdatePerson: (updated: PersonLike) => void;
  handleDeletePerson: (personId: string) => void;
  handleAddPartner: (
    personId: string,
    partnerId: string,
    unionType: string,
    startYear: number | null
  ) => void;
  handleUpdateUnion: (updated: UnionLike) => void;
  handleUpdateEdgeType: (
    unionId: string,
    childId: string,
    relationshipType: string
  ) => void;
  handleAddChild: (
    parentId: string,
    childId: string,
    relationshipType?: string
  ) => void;
  handleAddParent: (
    childId: string,
    parentId: string,
    relationshipType?: string
  ) => void;
  handleCreatePersonAndLink: (
    newPerson: PersonLike,
    linkType: "partner" | "child" | "parent",
    relatedToId: string,
    unionType?: string,
    startYear?: number | null,
    relationshipType?: string
  ) => void;
  handleRemoveLink: (
    linkType: "partner" | "child",
    fromId: string,
    toId: string
  ) => void;
  handleSetSingleParent: (childId: string, parentId: string) => void;
  handleAddSource: (source: Source) => void;
  handleUpdateSource: (source: Source) => void;
  handleDeleteSource: (sourceId: string) => void;
  handleAddStandalonePerson: (newPerson: PersonLike) => void;
  handleNavigatePerson: (personId: string) => void;

  genderById: Map<string, Gender>;
  apiCall: (method: string, path: string, body?: unknown, onError?: () => void) => void;
  wouldConflict: (
    unionId: string,
    childId: string,
    rel?: string
  ) => boolean;
}

export function useTreeCrud({
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
}: UseTreeCrudParams): UseTreeCrudReturn {
  // ─── Derived data ───

  const genderById = useMemo(
    () =>
      new Map<string, Gender>(
        rawPersons.map((p) => [p.id, (p.gender as Gender) ?? ""])
      ),
    [rawPersons]
  );

  const wouldConflict = useCallback(
    (unionId: string, childId: string, rel?: string): boolean => {
      const newEdge = {
        unionId,
        childId,
        relationshipType: rel ?? "biological",
      };
      const finalEdges = rawEdges.some(
        (e) => e.unionId === unionId && e.childId === childId
      )
        ? rawEdges
        : [...rawEdges, newEdge];
      const conflicts = findDualParentConflicts(
        rawUnions,
        finalEdges,
        genderById
      );
      return conflicts.some((c) => c.childId === childId);
    },
    [rawUnions, rawEdges, genderById]
  );

  // ─── CRUD: Update person ───

  const handleUpdatePerson = useCallback(
    (updated: PersonLike) => {
      setRawPersons((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      );
      setSelectedPerson(updated);
      if (user)
        apiCall(
          "PATCH",
          "/tree/persons",
          toDbPerson(updated),
          () => toast("Failed to save changes", "error")
        );
    },
    [user, toast, setRawPersons, setSelectedPerson]
  );

  // ─── CRUD: Delete person ───

  const handleDeletePerson = useCallback(
    (personId: string) => {
      setRawPersons((prev) => prev.filter((p) => p.id !== personId));
      setRawUnions((prev) =>
        prev.filter(
          (u) => u.partnerA !== personId && u.partnerB !== personId
        )
      );
      setRawEdges((prev) => prev.filter((e) => e.childId !== personId));
      setSelectedPerson(null);
      if (user)
        apiCall(
          "DELETE",
          `/tree/persons?id=${personId}`,
          undefined,
          () => toast("Failed to delete person", "error")
        );
    },
    [user, toast, setRawPersons, setRawUnions, setRawEdges, setSelectedPerson]
  );

  // ─── CRUD: Add partner (existing person) ───

  const handleAddPartner = useCallback(
    (
      personId: string,
      partnerId: string,
      unionType: string,
      startYear: number | null
    ) => {
      const currentUnions = rawUnionsRef.current;
      const newUnion = {
        id: nextUnionId(currentUnions),
        partnerA: personId,
        partnerB: partnerId,
        type: unionType,
        startYear,
        endYear: null,
      };
      const nextUnions = [...currentUnions, newUnion];
      setRawUnions(nextUnions);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            unions: nextUnions,
            persons: rawPersonsRef.current,
            edges: rawEdgesRef.current,
          },
          () => toast("Failed to save relationship", "error")
        );
    },
    [user, toast, rawUnionsRef, rawPersonsRef, rawEdgesRef, setRawUnions]
  );

  // ─── CRUD: Update union ───

  const handleUpdateUnion = useCallback(
    (updated: UnionLike) => {
      const nextUnions = rawUnionsRef.current.map((u) =>
        u.id === updated.id ? updated : u
      );
      setRawUnions(nextUnions);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            persons: rawPersonsRef.current,
            unions: nextUnions,
            edges: rawEdgesRef.current,
          },
          () => toast("Failed to save relationship", "error")
        );
    },
    [user, toast, rawUnionsRef, rawPersonsRef, rawEdgesRef, setRawUnions]
  );

  // ─── CRUD: Update parent→child relationship type ───

  const handleUpdateEdgeType = useCallback(
    (unionId: string, childId: string, relationshipType: string) => {
      const rel = (
        ["biological", "adopted", "step"].includes(relationshipType)
          ? relationshipType
          : "biological"
      ) as "biological" | "adopted" | "step";
      const nextEdges = rawEdgesRef.current.map((e) =>
        e.unionId === unionId && e.childId === childId
          ? { ...e, relationshipType: rel }
          : e
      );
      setRawEdges(nextEdges);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            persons: rawPersonsRef.current,
            unions: rawUnionsRef.current,
            edges: nextEdges,
          },
          () => toast("Failed to save relationship", "error")
        );
    },
    [user, toast, rawEdgesRef, rawPersonsRef, rawUnionsRef, setRawEdges]
  );

  // ─── CRUD: Make [this] parent the child's ONLY parent (single-parent line) ───
  // Reparents a child so it connects to a single parent (single-parent union)
  // instead of a couple diamond. Removes the child from ALL its current unions
  // first, so the server-side consolidation (which merges couple+lone-parent
  // duplicates) never re-attaches the other parent.
  const handleSetSingleParent = useCallback(
    (childId: string, parentId: string) => {
      const currentUnions = rawUnionsRef.current;
      const currentEdges = rawEdgesRef.current;
      const withoutChild = currentEdges.filter((e) => e.childId !== childId);
      const existing = currentUnions.find(
        (u) => u.id !== "" && u.partnerA === parentId && !u.partnerB && withoutChild.some((e) => e.unionId === u.id)
      );
      let union = existing;
      let nextUnions = currentUnions;
      if (!union) {
        const newId = nextUnionId(currentUnions);
        union = {
          id: newId,
          partnerA: parentId,
          partnerB: "",
          type: "marriage",
          startYear: null,
          endYear: null,
        };
        nextUnions = [...currentUnions, union];
      }
      const nextEdges = [
        ...withoutChild,
        { unionId: union.id, childId, relationshipType: "biological" },
      ];
      setRawUnions(nextUnions);
      setRawEdges(nextEdges);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            persons: rawPersonsRef.current,
            unions: nextUnions,
            edges: nextEdges,
          },
          () => toast("Failed to save single-parent change", "error")
        );
    },
    [user, toast, rawUnionsRef, rawEdgesRef, rawPersonsRef, setRawEdges, setRawUnions]
  );

  // ─── CRUD: Add child (existing person) ───

  const handleAddChild = useCallback(
    (parentId: string, childId: string, relationshipType?: string) => {
      const rel = relationshipType ?? "biological";
      const currentUnions = rawUnionsRef.current;
      const currentEdges = rawEdgesRef.current;
      const union = findParentUnion(parentId);
      let nextEdges: EdgeLike[];
      let nextUnions: UnionLike[];
      if (union) {
        const newEdge = {
          unionId: union.id,
          childId,
          relationshipType: rel,
        };
        nextEdges = currentEdges.some(
          (e) => e.unionId === union.id && e.childId === childId
        )
          ? currentEdges
          : [...currentEdges, newEdge];
        nextUnions = currentUnions;
      } else {
        const newId = nextUnionId(currentUnions);
        const newUnion = {
          id: newId,
          partnerA: parentId,
          partnerB: "",
          type: "marriage",
          startYear: null,
          endYear: null,
        };
        nextUnions = [...currentUnions, newUnion];
        nextEdges = [
          ...currentEdges,
          { unionId: newId, childId, relationshipType: rel },
        ];
      }
      setRawEdges(nextEdges);
      setRawUnions(nextUnions);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            persons: rawPersonsRef.current,
            unions: nextUnions,
            edges: nextEdges,
          },
          () => toast("Failed to save relationship", "error")
        );
    },
    [user, toast, rawUnionsRef, rawEdgesRef, rawPersonsRef, findParentUnion, setRawEdges, setRawUnions]
  );

  // ─── CRUD: Add parent (existing person) ───

  const handleAddParent = useCallback(
    (childId: string, parentId: string, relationshipType?: string) => {
      const rel = relationshipType ?? "biological";
      const currentUnions = rawUnionsRef.current;
      const currentEdges = rawEdgesRef.current;
      const currentPersons = rawPersonsRef.current;

      // Prefer the child's existing biological union as the target when adding
      // a biological parent, so a second bio parent merges into the same union
      // (one diamond, one child line) instead of spawning a duplicate line.
      const childUnionId =
        rel === "biological"
          ? currentEdges.find(
              (e) => e.childId === childId && e.relationshipType === "biological"
            )?.unionId
          : undefined;
      const childUnion = childUnionId
        ? currentUnions.find((u) => u.id === childUnionId)
        : undefined;

      // A union the new parent is already a partner of (only used when the child
      // has no biological relationship yet, to avoid reusing an orphan).
      const parentUnion = currentUnions.find(
        (u) =>
          (u.partnerA === parentId || u.partnerB === parentId) && !childUnion
      );

      const targetUnion = childUnion ?? parentUnion;
      if (targetUnion) {
        if (wouldConflict(targetUnion.id, childId, rel)) {
          toast(
            rel === "biological"
              ? "This child already has a biological parent of that gender. Add the extra parent as Step or Adopted (different-coloured line)."
              : "This change was not saved.",
            "error"
          );
          return;
        }
        // If we're reusing the child's union and the new parent is NOT already a
        // partner, merge them in (single-parent → couple). Otherwise just attach.
        if (rel === "biological" && childUnion && !childUnion.partnerB) {
          const otherParentId =
            childUnion.partnerA === parentId ? null : childUnion.partnerA;
          if (otherParentId && otherParentId !== parentId) {
            const merged: UnionLike = {
              ...childUnion,
              partnerA: childUnion.partnerA,
              partnerB: otherParentId,
            };
            const updatedUnions = currentUnions.map((u) =>
              u.id === merged.id ? merged : u
            );
            const updatedEdges = currentEdges.map((e) =>
              e.childId === childId && e.unionId === childUnion.id
                ? { ...e, relationshipType: rel }
                : e
            );
            setRawUnions(updatedUnions);
            setRawEdges(updatedEdges);
            if (user)
              apiCall(
                "PUT",
                "/tree",
                {
                  persons: currentPersons,
                  unions: updatedUnions,
                  edges: updatedEdges,
                },
                () => toast("Failed to save relationship", "error")
              );
            return;
          }
        }
        const newEdge = {
          unionId: targetUnion.id,
          childId,
          relationshipType: rel,
        };
        const updatedEdges = currentEdges.some(
          (e) => e.unionId === targetUnion.id && e.childId === childId
        )
          ? currentEdges
          : [...currentEdges, newEdge];
        setRawEdges(updatedEdges);
        if (user)
          apiCall(
            "PUT",
            "/tree",
            {
              persons: currentPersons,
              unions: currentUnions,
              edges: updatedEdges,
            },
            () => toast("Failed to save relationship", "error")
          );
        return;
      }
      // No existing relationship for this child — create a fresh single-parent union.
      const newId = nextUnionId(currentUnions);
      const newUnion = {
        id: newId,
        partnerA: parentId,
        partnerB: "",
        type: "marriage",
        startYear: null,
        endYear: null,
      };
      const updatedUnions = [...currentUnions, newUnion];
      const updatedEdges = [
        ...currentEdges,
        { unionId: newId, childId, relationshipType: rel },
      ];
      setRawUnions(updatedUnions);
      setRawEdges(updatedEdges);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            persons: currentPersons,
            unions: updatedUnions,
            edges: updatedEdges,
          },
          () => toast("Failed to save relationship", "error")
        );
    },
    [wouldConflict, user, toast, rawUnionsRef, rawEdgesRef, rawPersonsRef, setRawUnions, setRawEdges]
  );

  // ─── CRUD: Create new person + link ───

  const handleCreatePersonAndLink = useCallback(
    (
      newPerson: PersonLike,
      linkType: "partner" | "child" | "parent",
      relatedToId: string,
      unionType?: string,
      startYear?: number | null,
      relationshipType?: string
    ) => {
      if (!newPerson.fullName.trim()) return;
      if (newPerson.id === relatedToId) return;

      const currentPersons = rawPersonsRef.current;
      const currentUnions = rawUnionsRef.current;
      const currentEdges = rawEdgesRef.current;

      const nextPersons = [...currentPersons, newPerson];
      let nextUnions = currentUnions;
      let nextEdges = currentEdges;

      if (linkType === "partner") {
        nextUnions = [
          ...currentUnions,
          {
            id: nextUnionId(currentUnions),
            partnerA: relatedToId,
            partnerB: newPerson.id,
            type: unionType ?? "marriage",
            startYear: startYear ?? null,
            endYear: null,
          },
        ];
      } else if (linkType === "child") {
        const union = findParentUnion(relatedToId);
        if (union) {
          nextEdges = [
            ...currentEdges,
            {
              unionId: union.id,
              childId: newPerson.id,
              relationshipType: relationshipType ?? "biological",
            },
          ];
        } else {
          const newId = nextUnionId(currentUnions);
          nextUnions = [
            ...currentUnions,
            {
              id: newId,
              partnerA: relatedToId,
              partnerB: "",
              type: "marriage",
              startYear: null,
              endYear: null,
            },
          ];
          nextEdges = [
            ...currentEdges,
            {
              unionId: newId,
              childId: newPerson.id,
              relationshipType: relationshipType ?? "biological",
            },
          ];
        }
      } else {
        const rel = relationshipType ?? "biological";
        const newU: UnionLike = {
          id: nextUnionId(currentUnions),
          partnerA: newPerson.id,
          partnerB: "",
          type: "marriage",
          startYear: null,
          endYear: null,
        };
        const prospective = [...currentUnions, { ...newU, id: newU.id }];
        const prospectiveEdges = [
          ...currentEdges,
          { unionId: newU.id, childId: relatedToId, relationshipType: rel },
        ];
        const mergedGenders = new Map<string, Gender>(genderById);
        mergedGenders.set(
          newPerson.id,
          (newPerson.gender as Gender) ?? ""
        );
        const conflict = findDualParentConflicts(
          prospective,
          prospectiveEdges,
          mergedGenders
        ).some((c) => c.childId === relatedToId);
        if (conflict) {
          toast(
            rel === "biological"
              ? "This child already has a biological parent of that gender. Add the new parent as Step or Adopted instead."
              : "This change was not saved.",
            "error"
          );
          return;
        }
        nextUnions = prospective;
        nextEdges = prospectiveEdges;
      }

      setRawPersons(nextPersons);
      setRawUnions(nextUnions);
      setRawEdges(nextEdges);
      if (user) {
        apiCall(
          "POST",
          "/tree/persons",
          toDbPerson(newPerson),
          () => toast("Failed to save new person", "error")
        );
        apiCall(
          "PUT",
          "/tree",
          { persons: nextPersons, unions: nextUnions, edges: nextEdges },
          () => toast("Failed to save relationship", "error")
        );
      }
    },
    [
      findParentUnion,
      genderById,
      user,
      toast,
      rawPersonsRef,
      rawUnionsRef,
      rawEdgesRef,
      setRawPersons,
      setRawUnions,
      setRawEdges,
    ]
  );

  // ─── CRUD: Remove link ───

  const handleRemoveLink = useCallback(
    (linkType: "partner" | "child", fromId: string, toId: string) => {
      const currentUnions = rawUnionsRef.current;
      const currentEdges = rawEdgesRef.current;
      let nextUnions = currentUnions;
      let nextEdges = currentEdges;
      if (linkType === "partner") {
        nextUnions = currentUnions.filter(
          (u) =>
            !(
              (u.partnerA === fromId && u.partnerB === toId) ||
              (u.partnerA === toId && u.partnerB === fromId)
            )
        );
      } else {
        // linkType === "child": fromId = the person (child), toId = the parent to disconnect.
        // Removing a parent should detach ONLY that parent from THIS child while keeping
        // the child on the other parent (if the child hangs on a couple union).
        const edge = currentEdges.find(
          (e) =>
            e.childId === fromId &&
            currentUnions.some(
              (u) =>
                u.id === e.unionId &&
                (u.partnerA === toId || u.partnerB === toId)
            )
        );
        if (edge) {
          const union = currentUnions.find((u) => u.id === edge.unionId);
          const other = union
            ? union.partnerA === toId
              ? union.partnerB
              : union.partnerA
            : "";
          if (union && other) {
            // Couple union: keep this child attached to the OTHER parent by reparenting
            // it to a single-parent union of that parent. The couple union stays intact
            // for any siblings.
            nextEdges = currentEdges.filter(
              (e) =>
                !(e.unionId === edge.unionId && e.childId === fromId)
            );
            const existingSingle = currentUnions.find(
              (u) =>
                u.id !== edge.unionId &&
                u.partnerA === other &&
                !u.partnerB
            );
            if (existingSingle) {
              nextEdges = [
                ...nextEdges,
                {
                  unionId: existingSingle.id,
                  childId: fromId,
                  relationshipType:
                    edge.relationshipType ?? "biological",
                },
              ];
            } else {
              const newId = nextUnionId(currentUnions);
              nextUnions = [
                ...currentUnions,
                {
                  id: newId,
                  partnerA: other,
                  partnerB: "",
                  type: "marriage",
                  startYear: null,
                  endYear: null,
                },
              ];
              nextEdges = [
                ...nextEdges,
                {
                  unionId: newId,
                  childId: fromId,
                  relationshipType:
                    edge.relationshipType ?? "biological",
                },
              ];
            }
          } else {
            // Single-parent union (other is ""): just disconnect this child.
            nextEdges = currentEdges.filter(
              (e) =>
                !(e.unionId === edge.unionId && e.childId === fromId)
            );
          }
        }
      }
      setRawUnions(nextUnions);
      setRawEdges(nextEdges);
      if (user)
        apiCall(
          "PUT",
          "/tree",
          {
            persons: rawPersonsRef.current,
            unions: nextUnions,
            edges: nextEdges,
          },
          () => toast("Failed to save changes", "error")
        );
    },
    [user, toast, rawUnionsRef, rawEdgesRef, rawPersonsRef, setRawUnions, setRawEdges]
  );

  // ─── CRUD: Sources ───

  const handleAddSource = useCallback(
    (source: Source) => {
      setRawSources((prev) => [...prev, source]);
      if (user)
        apiCall(
          "POST",
          "/sources",
          toDbSource(source),
          () => toast("Failed to save source", "error")
        );
    },
    [user, toast, setRawSources]
  );

  const handleUpdateSource = useCallback(
    (source: Source) => {
      setRawSources((prev) =>
        prev.map((s) => (s.id === source.id ? source : s))
      );
      if (user)
        apiCall(
          "PATCH",
          "/sources",
          toDbSource(source),
          () => toast("Failed to update source", "error")
        );
    },
    [user, toast, setRawSources]
  );

  const handleDeleteSource = useCallback(
    (sourceId: string) => {
      setRawSources((prev) => prev.filter((s) => s.id !== sourceId));
      if (user)
        apiCall(
          "DELETE",
          `/sources?id=${sourceId}`,
          undefined,
          () => toast("Failed to delete source", "error")
        );
    },
    [user, toast, setRawSources]
  );

  // ─── CRUD: Standalone add person (no link) ───

  const handleAddStandalonePerson = useCallback(
    (newPerson: PersonLike) => {
      if (!newPerson.fullName.trim()) return;
      setRawPersons((prev) => [...prev, newPerson]);
      setSelectedPerson(newPerson);
      setShowAddPerson(false);
      setTimeout(
        () =>
          fitView({
            nodes: [{ id: newPerson.id }],
            padding: 0.3,
            duration: 400,
          }),
        60
      );
      if (user)
        apiCall(
          "POST",
          "/tree/persons",
          toDbPerson(newPerson),
          () => toast("Failed to save new person", "error")
        );
    },
    [user, toast, setRawPersons, setSelectedPerson, setShowAddPerson, fitView]
  );

  // ─── Navigate to person: select + fitView ───

  const handleNavigatePerson = useCallback(
    (personId: string) => {
      const p = rawPersons.find((pp) => pp.id === personId);
      if (p) {
        setSelectedPerson(p);
        setTimeout(
          () =>
            fitView({
              nodes: [{ id: personId }],
              padding: 0.3,
              duration: 400,
            }),
          50
        );
      }
    },
    [rawPersons, setSelectedPerson, fitView]
  );

  return {
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
    apiCall,
    wouldConflict,
  };
}
