-- ============================================================
-- Digital Family Tapestry — Permissions & Privacy (Section 5)
-- ============================================================

-- Family roles table
CREATE TABLE family_roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('super_admin', 'branch_admin', 'direct_descendant', 'extended_relative', 'guest')),
  scoped_person_id UUID REFERENCES persons(id),  -- NULL = global scope (super_admin)
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role, scoped_person_id)
);

-- ============================================================
-- Helper: Check if a user is an admin for a given person
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin_for_person(_user_id UUID, _person_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_roles fr
    WHERE fr.user_id = _user_id
      AND fr.role IN ('super_admin', 'branch_admin')
      AND (fr.scoped_person_id IS NULL  -- super_admin (global)
           OR fr.scoped_person_id = _person_id
           OR fr.scoped_person_id IN (
             SELECT ancestor_id FROM descendant_closure
             WHERE descendant_id = _person_id
           ))
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Helper: Check if a user is a direct descendant (depth <= 2)
-- with a non-step relationship
-- ============================================================
CREATE OR REPLACE FUNCTION is_direct_descendant(_user_id UUID, _person_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM descendant_closure dc
    JOIN persons p ON p.id = dc.ancestor_id
    JOIN family_roles fr ON fr.user_id = _user_id
    WHERE dc.descendant_id = _person_id
      AND dc.depth <= 2
      AND NOT EXISTS (
        SELECT 1 FROM parent_edges pe
        WHERE pe.child_id = _person_id
          AND pe.relationship_type = 'step'
      )
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- Helper: Check if user is the person themselves
-- ============================================================
CREATE OR REPLACE FUNCTION is_self(_user_id UUID, _person_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_roles fr
    WHERE fr.user_id = _user_id
      AND fr.scoped_person_id = _person_id
      AND fr.role = 'direct_descendant'
  );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- RLS: Enable on all tables
-- ============================================================
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE unions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE descendant_closure ENABLE ROW LEVEL SECURITY;
ALTER TABLE edit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: persons
-- ============================================================

-- SELECT: Authenticated users see family-level persons; guests see only public
CREATE POLICY "persons_select_family" ON persons
  FOR SELECT
  TO authenticated
  USING (
    privacy_level = 'public'
    OR privacy_level = 'family'
    OR (is_alive = false)  -- deceased always visible to authenticated family
  );

-- SELECT: Guests/public links see only public persons and deceased
CREATE POLICY "persons_select_guest" ON persons
  FOR SELECT
  TO anon
  USING (
    privacy_level = 'public'
    OR (is_alive = false AND privacy_level != 'private')
  );

-- INSERT: Only admins and direct descendants
CREATE POLICY "persons_insert" ON persons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin_for_person(auth.uid(), id)
    OR is_direct_descendant(auth.uid(), id)
  );

-- UPDATE: Admins can update anyone; direct descendants can update within depth 2
CREATE POLICY "persons_update" ON persons
  FOR UPDATE
  TO authenticated
  USING (
    is_admin_for_person(auth.uid(), id)
    OR is_direct_descendant(auth.uid(), id)
  );

-- DELETE: Only super_admins
CREATE POLICY "persons_delete" ON persons
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid()
        AND fr.role = 'super_admin'
        AND fr.scoped_person_id IS NULL
    )
  );

-- ============================================================
-- RLS: unions
-- ============================================================
CREATE POLICY "unions_select" ON unions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "unions_select_guest" ON unions
  FOR SELECT TO anon USING (true);

CREATE POLICY "unions_insert" ON unions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin_for_person(auth.uid(), partner_a)
    OR is_admin_for_person(auth.uid(), partner_b)
  );

CREATE POLICY "unions_update" ON unions
  FOR UPDATE TO authenticated
  USING (
    is_admin_for_person(auth.uid(), partner_a)
    OR is_admin_for_person(auth.uid(), partner_b)
  );

CREATE POLICY "unions_delete" ON unions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid() AND fr.role = 'super_admin'
    )
  );

-- ============================================================
-- RLS: parent_edges
-- ============================================================
CREATE POLICY "parent_edges_select" ON parent_edges
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "parent_edges_select_guest" ON parent_edges
  FOR SELECT TO anon USING (true);

CREATE POLICY "parent_edges_insert" ON parent_edges
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid() AND fr.role IN ('super_admin', 'branch_admin')
    )
  );

CREATE POLICY "parent_edges_update" ON parent_edges
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid() AND fr.role IN ('super_admin', 'branch_admin')
    )
  );

CREATE POLICY "parent_edges_delete" ON parent_edges
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid() AND fr.role = 'super_admin'
    )
  );

-- ============================================================
-- RLS: descendant_closure (read-only for all, write via trigger only)
-- ============================================================
CREATE POLICY "descendant_closure_select" ON descendant_closure
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "descendant_closure_select_guest" ON descendant_closure
  FOR SELECT TO anon USING (true);

-- No INSERT/UPDATE/DELETE policies — only the trigger writes here

-- ============================================================
-- RLS: edit_log (read for admins, insert for all authenticated)
-- ============================================================
CREATE POLICY "edit_log_select" ON edit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid() AND fr.role IN ('super_admin', 'branch_admin')
    )
  );

CREATE POLICY "edit_log_insert" ON edit_log
  FOR INSERT TO authenticated
  WITH CHECK (editor_id = auth.uid());

-- No UPDATE/DELETE — append-only

-- ============================================================
-- RLS: family_roles
-- ============================================================
CREATE POLICY "family_roles_select" ON family_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "family_roles_manage" ON family_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM family_roles fr
      WHERE fr.user_id = auth.uid() AND fr.role = 'super_admin'
    )
  );
