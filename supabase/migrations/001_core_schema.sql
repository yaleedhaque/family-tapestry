-- ============================================================
-- Digital Family Tapestry — Core Schema (Section 4.3)
-- Run this as a SQL migration in your Supabase SQL Editor.
-- ============================================================

-- Persons
CREATE TABLE persons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   TEXT NOT NULL,
  birth_year  INT,
  death_year  INT,
  is_alive    BOOLEAN NOT NULL DEFAULT true,
  birth_place TEXT,
  death_place TEXT,
  profession  TEXT,
  bio         TEXT,
  photo_url   TEXT,
  links       JSONB DEFAULT '[]',
  metadata    JSONB DEFAULT '{}',
  privacy_level TEXT DEFAULT 'family',  -- public | family | private
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Unions (marriages/partnerships) as first-class nodes
CREATE TABLE unions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_a   UUID REFERENCES persons(id),
  partner_b   UUID REFERENCES persons(id),
  union_type  TEXT DEFAULT 'marriage',  -- marriage | partnership | divorced
  start_year  INT,
  end_year    INT
);

-- Parent-child edges, always pointing FROM a union TO a child
CREATE TABLE parent_edges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  union_id          UUID REFERENCES unions(id),
  child_id          UUID REFERENCES persons(id),
  relationship_type TEXT DEFAULT 'biological'  -- biological | adopted | step
);

-- Precomputed closure table for fast permission checks
CREATE TABLE descendant_closure (
  ancestor_id   UUID REFERENCES persons(id),
  descendant_id UUID REFERENCES persons(id),
  depth         INT NOT NULL,
  PRIMARY KEY (ancestor_id, descendant_id)
);

-- Append-only audit log
CREATE TABLE edit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id   UUID REFERENCES persons(id),
  editor_id   UUID REFERENCES auth.users(id),
  field       TEXT,
  old_value   JSONB,
  new_value   JSONB,
  edited_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_persons_is_alive ON persons(is_alive);
CREATE INDEX idx_persons_privacy ON persons(privacy_level);
CREATE INDEX idx_parent_edges_union ON parent_edges(union_id);
CREATE INDEX idx_parent_edges_child ON parent_edges(child_id);
CREATE INDEX idx_unions_partner_a ON unions(partner_a);
CREATE INDEX idx_unions_partner_b ON unions(partner_b);
CREATE INDEX idx_descendant_ancestor ON descendant_closure(ancestor_id);
CREATE INDEX idx_descendant_descendant ON descendant_closure(descendant_id);
CREATE INDEX idx_edit_log_person ON edit_log(person_id);

-- ============================================================
-- Trigger: Recompute descendant_closure on tree changes
-- ============================================================
CREATE OR REPLACE FUNCTION recompute_descendant_closure()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete old closure rows for affected subtree
  DELETE FROM descendant_closure
  WHERE ancestor_id IN (
    SELECT DISTINCT u.partner_a FROM unions u
    WHERE u.id = COALESCE(NEW.union_id, OLD.union_id)
    UNION
    SELECT DISTINCT u.partner_b FROM unions u
    WHERE u.id = COALESCE(NEW.union_id, OLD.union_id)
  );

  -- Rebuild closure using recursive CTE
  WITH RECURSIVE tree AS (
    -- Start from union partners
    SELECT DISTINCT
      u.partner_a AS ancestor_id,
      pe.child_id AS descendant_id,
      1 AS depth
    FROM unions u
    JOIN parent_edges pe ON pe.union_id = u.id
    WHERE u.id = COALESCE(NEW.union_id, OLD.union_id)

    UNION ALL

    -- Recurse down
    SELECT
      t.ancestor_id,
      pe.child_id,
      t.depth + 1
    FROM tree t
    JOIN parent_edges pe ON pe.union_id IN (
      SELECT u2.id FROM unions u2
      WHERE u2.partner_a = t.descendant_id OR u2.partner_b = t.descendant_id
    )
    WHERE t.depth < 20  -- safety limit
  )
  INSERT INTO descendant_closure (ancestor_id, descendant_id, depth)
  SELECT ancestor_id, descendant_id, depth
  FROM tree
  ON CONFLICT DO NOTHING;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_closure_on_parent_edge
  AFTER INSERT OR UPDATE OR DELETE ON parent_edges
  FOR EACH ROW EXECUTE FUNCTION recompute_descendant_closure();

CREATE TRIGGER trg_recompute_closure_on_union
  AFTER INSERT OR UPDATE OR DELETE ON unions
  FOR EACH ROW EXECUTE FUNCTION recompute_descendant_closure();
