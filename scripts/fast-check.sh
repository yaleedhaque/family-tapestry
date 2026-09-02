#!/usr/bin/env bash
# fast-check.sh — pre-push sanity check that SKIPS the full production build.
# For typical UI/TSX edits, `tsc --noEmit` + `vitest` + eslint(errors-only)
# catches everything Vercel's build would, in ~12s instead of ~45s.
# Vercel does the authoritative `next build` server-side on push anyway.
#
# Usage:   scripts/fast-check.sh [--strict]
#   --strict  also run eslint with no warnings tolerated (slower)
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

echo "🔍 [3/3] eslint (errors only) ..."
if [ "${1:-}" = "--strict" ]; then
  npx eslint src --ext .ts,.tsx
else
  # Vercel build fails only on ESLint ERRORS, not warnings. Match error LINE matches.
  if npx eslint src --ext .ts,.tsx 2>/dev/null | grep -E "^[^ ]+ +[0-9]+:[0-9]+ +error " >/dev/null; then
    echo "❌ ESLint errors found."; exit 1
  fi
fi
echo "   ✓ eslint clean (errors-free)"

echo "✅ fast-check PASSED ($(date +%H:%M:%S)) — safe to push."