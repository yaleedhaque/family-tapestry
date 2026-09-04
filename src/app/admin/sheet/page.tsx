"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import AdminSheet from "@/components/AdminSheet";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

export default function AdminSheetPage() {
  const { loading: authLoading, canAdmin } = useAuth();
  const router = useRouter();
  const [persons, setPersons] = useState<PersonLike[]>([]);
  const [unions, setUnions] = useState<UnionLike[]>([]);
  const [edges, setEdges] = useState<EdgeLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !canAdmin) router.replace("/");
  }, [authLoading, canAdmin, router]);

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch("/api/tree");
      if (res.ok) {
        const data = await res.json();
        setPersons(data.persons ?? []);
        setUnions(data.unions ?? []);
        setEdges(data.edges ?? []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAdmin) fetchTree();
  }, [canAdmin, fetchTree]);

  const handleSavePerson = useCallback(
    async (person: PersonLike) => {
      setSaving(true);
      try {
        await fetch("/api/tree/persons", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: person.id,
            fullName: person.fullName,
            nameNative: person.nameNative,
            gender: person.gender,
            birthYear: person.birthYear,
            deathYear: person.deathYear,
            isAlive: person.isAlive,
            birthPlace: person.birthPlace,
            profession: person.profession,
            bio: person.bio,
            email: person.email,
            phone: person.phone,
            address: person.address,
            website: person.website,
            photoUrl: person.photoUrl,
          }),
        });
        // Update local state
        setPersons((prev) => prev.map((p) => (p.id === person.id ? person : p)));
      } catch {
        /* ignore */
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const handleImportTree = useCallback(
    async (newPersons: PersonLike[], newUnions: UnionLike[], newEdges: EdgeLike[]) => {
      setSaving(true);
      try {
        const res = await fetch("/api/tree", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persons: newPersons, unions: newUnions, edges: newEdges }),
        });
        if (res.ok) {
          setPersons(newPersons);
          setUnions(newUnions);
          setEdges(newEdges);
        }
      } catch {
        /* ignore */
      } finally {
        setSaving(false);
      }
    },
    []
  );

  if (authLoading || !canAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tapestry-bg)]">
        <p className="text-[var(--parchment-dim)] font-body text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tapestry-bg)] px-4 py-6 max-md:px-3">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between max-md:flex-col max-md:gap-3">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-2xl text-[var(--thread-gold)] max-md:text-xl">
              Data Sheet
            </h1>
            {saving && (
              <span className="text-xs font-body text-[var(--thread-gold)] animate-pulse">
                Saving...
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="text-xs font-body text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors"
            >
              Admin Dashboard
            </a>
            <span className="text-[var(--parchment-dim)]/30">|</span>
            <a
              href="/"
              className="text-xs font-body text-[var(--parchment-dim)] hover:text-[var(--parchment)] transition-colors"
            >
              Back to Tree
            </a>
          </div>
        </div>

        {loading ? (
          <p className="text-sm font-body text-[var(--parchment-dim)]">Loading tree data...</p>
        ) : (
          <AdminSheet
            persons={persons}
            unions={unions}
            edges={edges}
            onSavePerson={handleSavePerson}
            onImportTree={handleImportTree}
          />
        )}
      </div>
    </div>
  );
}
