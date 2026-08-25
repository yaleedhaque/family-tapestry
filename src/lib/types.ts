export interface DbPerson {
  id: string;
  full_name: string;
  birth_year: number | null;
  death_year: number | null;
  is_alive: boolean;
  birth_place: string | null;
  death_place: string | null;
  profession: string | null;
  bio: string | null;
  photo_url: string | null;
  links: unknown[];
  metadata: Record<string, unknown>;
  privacy_level: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUnion {
  id: string;
  partner_a: string;
  partner_b: string;
  union_type: string;
  start_year: number | null;
  end_year: number | null;
}

export interface DbParentEdge {
  id: string;
  union_id: string;
  child_id: string;
  relationship_type: string;
}

export interface DbDescendantClosure {
  ancestor_id: string;
  descendant_id: string;
  depth: number;
}

export interface DbEditLog {
  id: string;
  person_id: string;
  editor_id: string;
  field: string;
  old_value: unknown;
  new_value: unknown;
  edited_at: string;
}
