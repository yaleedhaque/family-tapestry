#!/usr/bin/env bash
# ship-and-verify.sh — push + poll Vercel deploy until Ready.
#
# Because local `next dev` cannot be detached from this sandbox, the fastest
# reliable end-to-end verify is: fast-check locally (~12s) → push (Vercel
# GitHub App builds server-side) → poll `vercel ls` until a fresh Production
# deploy is Ready → print the alias for a Playwright check.
#
# Usage: scripts/ship-and-verify.sh "commit message" [--no-verify]
#   --no-verify  skip the local fast-check (use after a trivial repro push)
set -uo pipefail
cd "$(dirname "$0")/.."

MSG="${1:?usage: ship-and-verify.sh \"commit message\" [--no-verify]}"
SKIP_VERIFY="${2:-}"

if [ "$SKIP_VERIFY" != "--no-verify" ]; then
  echo "🛡️  Running local fast-check first..."
  ./scripts/fast-check.sh || { echo "❌ fast-check failed — nothing pushed."; exit 1; }
fi

PREV_HEAD=$(git rev-parse HEAD)
git add -A && git commit -m "$MSG" || { echo "❌ commit failed"; exit 1; }
git push || { echo "❌ push failed"; exit 1; }
echo "⬆️  pushed. Head: $(git rev-parse --short HEAD)"

DEPLOY_URL=""
echo "⏳ Waiting for Vercel Production deploy to reach Ready..."
for i in $(seq 1 60); do
  sleep 5
  # row format: Age Project DeploymentURL ● Status Env ... → URL is $3, STATUS is $5
  read -r URL STATUS < <(vercel ls --limit 8 2>/dev/null | awk 'NR>3 && /https:\/\/family-tapestry-/ {print $3, $5; exit}')
  if [ -n "$URL" ]; then
    DEPLOY_URL="$URL"
    echo "   [$i] newest: $STATUS $URL"
    case "$STATUS" in
      Ready) echo "✅ Deploy Ready: $URL"; echo "→ aliased as https://family-tapestry-nine.vercel.app"; exit 0 ;;
      Error|Cancelled) echo "❌ Deploy $STATUS — check Vercel"; exit 1 ;;
      Building|Queued|Initializing) : ;;  # keep polling
      *) : ;;
    esac
  else
    echo "   [$i] no deployment row yet..."
  fi
done
echo "⏰ Timed out waiting for deploy. Check: vercel ls"
exit 1