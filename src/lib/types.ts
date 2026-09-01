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
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  name_native: string | null;
  lat: number | null;
  lng: number | null;
  links: unknown[];
  metadata: Record<string, unknown>;
  privacy_level: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  version?: number;
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

export interface DbLifeEvent {
  id: string;
  person_id: string;
  year: number;
  month: number | null;
  day: number | null;
  event_type: string;
  title: string;
  description: string | null;
  place: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LifeEvent {
  id: string;
  personId: string;
  year: number;
  month?: number;
  day?: number;
  type: "birth" | "death" | "marriage" | "divorce" | "career" | "education" | "migration" | "achievement" | "military" | "other";
  title: string;
  description?: string;
  place?: string;
}

export interface PresencePayload {
  userId: string;
  userName: string;
  viewing: string | null;
  editing: string | null;
  online_at: string;
  email?: string;
  camera?: { x: number; y: number; z: number };
}

export type TreeChange = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};
