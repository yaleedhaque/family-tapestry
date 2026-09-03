#!/usr/bin/env bash
# fast-check.sh — pre-push sanity check for family-tapestry.
#
# family-tapestry runs Next.js 16 + Turbopack, and `next build` picks up the
# deepest static errors (type-check + page generation that would fail on
# Vercel). We run the full triple here because the build is now only ~11s with
# Turbopack (vs 45-77s on webpack) — the "skip the build" optimisation from the
# older webpack days is no longer needed.
#
# NOTE: Next 16 does NOT run ESLint during build (confirmed), so ESLint is NOT
# part of this check. `npm run build` is the authoritative local gate.
#
# Usage:   scripts/fast-check.sh
set -uo pipefail
cd "$(dirname "$0")/.."   # project root

echo "🔍 [1/3] tsc --noEmit ..."
if ! npx tsc --noEmit; then
  echo "❌ TypeScript errors — fix before pushing."; exit 1
fi
echo "   ✓ tsc clean"

echo "🔍 [2/3] vitest run ..."
if ! npx vitest run; then
  echo "❌ Test failures — fix before pushing."; exit 1
fi
echo "   ✓ tests green"

echo "🔍 [3/3] npm run build ..."
if ! npm run build; then
  echo "❌ Production build failed — fix before pushing."; exit 1
fi
echo "   ✓ build clean"

echo "✅ fast-check PASSED ($(date +%H:%M:%S)) — safe to push."
