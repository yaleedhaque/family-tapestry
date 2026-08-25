import { createClient } from "@/lib/supabase/client";
import type { DbPerson, DbUnion, DbParentEdge } from "@/lib/types";

export interface FamilyData {
  persons: DbPerson[];
  unions: DbUnion[];
  parentEdges: DbParentEdge[];
}

export async function fetchFamilyData(): Promise<FamilyData> {
  const supabase = createClient();

  const [personsRes, unionsRes, edgesRes] = await Promise.all([
    supabase.from("persons").select("*"),
    supabase.from("unions").select("*"),
    supabase.from("parent_edges").select("*"),
  ]);

  if (personsRes.error) throw personsRes.error;
  if (unionsRes.error) throw unionsRes.error;
  if (edgesRes.error) throw edgesRes.error;

  return {
    persons: personsRes.data ?? [],
    unions: unionsRes.data ?? [],
    parentEdges: edgesRes.data ?? [],
  };
}
