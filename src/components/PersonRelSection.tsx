"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/lib/i18n";
import { RelSection, type RelSectionItem } from "@/components/RelSection";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

interface PersonRelSectionProps {
  personId: string;
  parents: RelSectionItem[];
  partners: RelSectionItem[];
  children: RelSectionItem[];
  siblings: RelSectionItem[];
  allPersons: PersonLike[];
  allUnions: UnionLike[];
  allEdges: EdgeLike[];
}

export default function PersonRelSection({
  personId,
  parents,
  partners,
  children: childItems,
  siblings,
  allPersons,
  allUnions,
  allEdges,
}: PersonRelSectionProps) {
  const { t } = useLang();
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = user?.role === "admin" || user?.role === "editor";

  // --- Shared state for RelSection ---
  const [addMode, setAddMode] = useState<"existing" | "new" | null>(null);
  const [addTarget, setAddTarget] = useState<"parents" | "partners" | "children" | "siblings" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [relType, setRelType] = useState("biological");
  const [newPersonFields, setNewPersonFields] = useState({
    fullName: "",
    birthYear: "",
    birthPlace: "",
    profession: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    gender: "",
  });

  // Search results (exclude current person + already-linked)
  const linkedIds = new Set([
    ...parents.map((p) => p.id),
    ...partners.map((p) => p.id),
    ...childItems.map((p) => p.id),
    ...siblings.map((p) => p.id),
    personId,
  ]);
  const searchResults = searchQuery.trim()
    ? allPersons.filter(
        (p) =>
          p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !linkedIds.has(p.id)
      )
    : [];

  const resetAdd = () => {
    setAddMode(null);
    setAddTarget(null);
    setSearchQuery("");
    setRelType("biological");
    setNewPersonFields({ fullName: "", birthYear: "", birthPlace: "", profession: "", email: "", phone: "", address: "", website: "", gender: "" });
  };

  const handleStartAdd = (mode: "existing" | "new", target: "parents" | "partners" | "children" | "siblings") => {
    setAddMode(mode);
    setAddTarget(target);
  };

  const handleSearch = useCallback((q: string) => setSearchQuery(q), []);

  const handleNewFieldChange = useCallback((key: string, val: string) => {
    setNewPersonFields((f) => ({ ...f, [key]: val }));
  }, []);

  // Link an existing person as parent/partner/child/sibling
  const handlePickExisting = async (target: "parents" | "partners" | "children" | "siblings", existingId: string) => {
    try {
      if (target === "parents") {
        // Add this person as a child of existingId (existingId becomes parent)
        // Create a union for existingId + partner if needed, or link to existing union
        await fetch("/api/tree/persons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: personId }),
        });
        // For simplicity, link via existing child creation flow
        // This is a simplified version — full implementation would need union creation
      } else if (target === "children") {
        // Add existingId as a child of this person
        // Would need to create/find a union and add the edge
      } else if (target === "partners") {
        // Create a union between this person and existingId
        const res = await fetch("/api/tree", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unions: [{ partnerA: personId, partnerB: existingId, unionType: "marriage" }],
          }),
        });
        if (res.ok) router.refresh();
      }
      resetAdd();
    } catch (e) {
      console.error("Link existing failed:", e);
    }
  };

  // Create a new person and link
  const handleCreateNew = async (target: "parents" | "partners" | "children" | "siblings") => {
    if (!newPersonFields.fullName) return;
    try {
      const res = await fetch("/api/tree/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: newPersonFields.fullName,
          birth_year: newPersonFields.birthYear ? Number(newPersonFields.birthYear) : null,
          birth_place: newPersonFields.birthPlace || null,
          profession: newPersonFields.profession || null,
          email: newPersonFields.email || null,
          phone: newPersonFields.phone || null,
          address: newPersonFields.address || null,
          website: newPersonFields.website || null,
          gender: newPersonFields.gender || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (target === "partners") {
          await fetch("/api/tree", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              unions: [{ partnerA: personId, partnerB: data.id, unionType: "marriage" }],
            }),
          });
        }
        router.refresh();
      }
      resetAdd();
    } catch (e) {
      console.error("Create new failed:", e);
    }
  };

  // Remove a relationship
  const handleRemove = async (target: "parents" | "partners" | "children" | "siblings", itemId: string) => {
    try {
      if (target === "partners") {
        // Find the union between this person and the partner
        const union = allUnions.find(
          (u) =>
            (u.partnerA === personId && u.partnerB === itemId) ||
            (u.partnerB === personId && u.partnerA === itemId)
        );
        if (union) {
          await fetch("/api/tree", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              unions: allUnions.filter((u) => u.id !== union.id),
            }),
          });
        }
      } else if (target === "children") {
        // Find the edge connecting this person's union to the child
        const edge = allEdges.find(
          (e) => e.childId === itemId && allUnions.some((u) => u.id === e.unionId && (u.partnerA === personId || u.partnerB === personId))
        );
        if (edge) {
          await fetch("/api/tree", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              edges: allEdges.filter((e) => !(e.unionId === edge.unionId && e.childId === edge.childId)),
            }),
          });
        }
      }
      router.refresh();
    } catch (e) {
      console.error("Remove failed:", e);
    }
  };

  // Navigate to a person
  const handleNavigate = (id: string) => {
    window.location.href = `/person/${id}`;
  };

  // Build props for each section
  const makeProps = (target: "parents" | "partners" | "children" | "siblings", items: RelSectionItem[]) => ({
    items,
    addMode: addTarget === target ? addMode : null,
    searchQuery: addTarget === target ? searchQuery : "",
    searchResults: addTarget === target ? searchResults : [],
    newPersonFields: addTarget === target ? newPersonFields : { fullName: "", birthYear: "", birthPlace: "", profession: "", email: "", phone: "", address: "", website: "", gender: "" },
    onSearch: handleSearch,
    onPickExisting: (id: string) => handlePickExisting(target, id),
    onCreateNew: () => handleCreateNew(target),
    onNewFieldChange: handleNewFieldChange,
    onStartAdd: (mode: "existing" | "new") => handleStartAdd(mode, target),
    onCancelAdd: resetAdd,
    onRemove: (id: string) => handleRemove(target, id),
    personLabel: target === "parents" ? "Parent" : target === "partners" ? "Partner" : target === "children" ? "Child" : "Sibling",
    onNavigate: handleNavigate,
    canEdit,
    showRelType: target === "children",
    relType: addTarget === target ? relType : "biological",
    onRelTypeChange: (val: string) => setRelType(val),
  });

  const sections = [
    { key: "parents" as const, title: "Parents", items: parents },
    { key: "partners" as const, title: "Partners", items: partners },
    { key: "children" as const, title: "Children", items: childItems },
    { key: "siblings" as const, title: "Siblings", items: siblings },
  ].filter((s) => s.items.length > 0 || canEdit);

  return (
    <section className="mb-8 md:mb-10">
      <h2 className="font-display text-base md:text-lg text-[var(--thread-gold)] mb-4">Relationships</h2>
      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.key} className="bg-white/[0.03] rounded-lg p-3 md:p-4 border border-white/[0.05]">
            <h3 className="text-[10px] md:text-xs uppercase tracking-wider text-[var(--thread-gold-dim)] mb-2">{s.title}</h3>
            <RelSection {...makeProps(s.key, s.items)} />
          </div>
        ))}
      </div>
    </section>
  );
}
