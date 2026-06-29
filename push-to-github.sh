#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="/home/runner/workspace"
MIRROR="$WORKSPACE/.github-mirror"
GITHUB_REPO="https://github.com/muratozlem/Stok-Kontrol.git"

if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN environment variable is not set." >&2
  exit 1
fi

PUSH_URL="https://${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/muratozlem/Stok-Kontrol.git"

# Reinitialize the bare mirror repo if it is missing or not a valid git repo.
if ! git -C "$MIRROR" rev-parse --git-dir > /dev/null 2>&1; then
  echo "==> Mirror directory missing or not a git repo — initializing bare repo at $MIRROR..."
  rm -rf "$MIRROR"
  git init --bare "$MIRROR"
  echo "    Mirror initialized."
fi

echo "==> Exporting current history from Replit workspace..."
git -C "$WORKSPACE" fast-export --use-done-feature HEAD \
  | git -C "$MIRROR" fast-import --force

echo "==> Force-pushing to GitHub..."
git -C "$MIRROR" push "$PUSH_URL" main --force

echo ""
echo "Done. GitHub now mirrors Replit history."
echo "  GitHub: https://github.com/muratozlem/Stok-Kontrol"
