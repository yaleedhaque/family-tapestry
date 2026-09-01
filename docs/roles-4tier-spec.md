# 4-Tier Roles & Permission Spec

Applied in commit (this work) and enforced **server-side** in the `/api` routes
(the authoritative boundary) with **client-side UI gating** in `TapestryCanvas`
for UX. RLS remains approved-members-only for reads (see `rls-policies-backup.txt`).

## Roles (ranked)

| Role | Meaning |
|------|---------|
| `admin` | Full control incl. user management |
| `editor` | Full tree edit incl. private fields, deletion, GEDCOM |
| `user`  | Edits only **self + direct parents/partner/children** (circles) |
| `viewer`| Read-only |

New signups default to `user` via the `handle_new_user` DB trigger
(`supabase/migration-v4.sql`).

## User "circle" (rule 4) — exactly one hop, never transitive

A `user` may edit a person only if that person is one of:
- **Self** — `person.created_by === user.id`
- **Direct parent / partner / child** of the user

The circle is computed with `computeCircle` in `src/lib/permissions.ts` from the
relationship graph (`unions` + `parent_edges`).

### Edge trust guard (rule 5.1)
An edge (union or parent_edge) only "counts" toward a user's circle if its
`created_by` is the user themself or an **approved editor/admin**. Edge creators
that are mere `user`s do NOT grant circle access. Enforced via
`isTrustedEdge(createdBy, okCreators)` where `okCreators` = {user} ∪ approved
editor/admin ids.

### Private fields (rule 5.2)
`bio`, `photo_url`, `email`, `phone`, `address`, `website` are editable **only** by
the person themself, an editor, or an admin — never by a `user` on a
parent/partner/child. `canEditField` + `PRIVATE_FIELDS`/`GENEALOGICAL_FIELDS`.

### Deletion (rule 5.3)
Only editor/admin may delete any person. A `user` may remove their **own**
partnership edge, but never delete a person record.

## Permission matrix (`src/lib/permissions.ts` → `can()`)

| Action | viewer | user | editor | admin |
|--------|:--:|:--:|:--:|:--:|
| edit/delete any + GEDCOM | – | – | ✓ | ✓ |
| create person | – | ✓ | ✓ | ✓ |
| manage users | – | – | – | ✓ |
| edit own profile | – | ✓ | ✓ | ✓ |

## Server enforcement

- `src/app/api/tree/persons/route.ts` — POST: `user`+; PATCH: circle + field
  guard; DELETE: editor/admin only.
- `src/app/api/tree/route.ts` — `syncUserTree` (circle-guarded diff sync, no
  person deletions for `user`, sources blocked) vs `syncFullTree` (editor/admin).
- `src/app/api/gedcom/route.ts` — export editor/admin only.
- `src/app/api/admin/users/route.ts` — role must be in `ROLES`.

## UI gating (spec 9.4)

`useUserCircle` (`src/lib/useUserCircle.ts`) computes the circle client-side from
the loaded graph + approved editor/admin ids and drives `InfoPanel`:
- `canEdit` per-person (edit controls shown only in a user's circle)
- `canEditPrivate` per-person (private fields only on self for a user)
- `canDelete` (false for `user`)
- `locked` → shows a "View-only — outside your circle" note on non-circle people

The Add-Person FAB / empty-state uses `canCreate` (= user/editor/admin) so a
`user` can add persons but not link/edit outside their circle; the server still
rejects any non-compliant write.
