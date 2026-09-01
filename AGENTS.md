# family-tapestry — dev rules (keep this light)

## Build/deploy
- ALWAYS run `npm run build` before deploying to Vercel. Local `tsc --noEmit` and `vitest` do NOT catch
  ESLint errors that fail `next build` on Vercel (e.g. `no-unused-vars`).
- Verify locally first (build + `npx vitest run` = 25 tests), then commit + push + `vercel --prod` as one unit.
- `vercel --prod` occasionally returns transient "Not authorized" — retry; it self-heals.

## Data/roles
- 4 roles: admin > editor > user > viewer. "user" edits only self + parents + partner (relationship fields only) + children, via graph-walk `is_self_or_circle` with a `created_by` edge guard. See `docs/roles-4tier-spec` if present.
- Writes go through server `/api` routes (service-role). RLS reads = approved-members-only.

## Env quirks (not app bugs)
- Vercel Security Checkpoint (403) blocks headless-Chrome tests of the live site.
- Local `next start` tree may stick on "Unfolding the tapestry…" spinner (Supabase unreachable in sandbox).
- Untracked files to keep (don't lose): `admin-safety-net.sql`, `docs/`, `rls-policies-backup.txt`.
