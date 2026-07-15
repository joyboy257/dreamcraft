#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 /path/to/dreamcraft-repository" >&2
  exit 2
fi

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="$(cd "$1" && pwd)"

if [[ ! -d "$TARGET_DIR/.git" ]]; then
  echo "Target is not a Git repository: $TARGET_DIR" >&2
  exit 1
fi

mkdir -p "$TARGET_DIR/docs"
cp "$SOURCE_DIR/README.md" "$TARGET_DIR/docs/CODEX_PACK_README.md"

rsync -av \
  --exclude '.git' \
  --exclude 'README.md' \
  --exclude 'MASTER_CONTEXT.md' \
  "$SOURCE_DIR/" "$TARGET_DIR/"

echo
printf 'Installed DreamCraft Codex pack into %s\n' "$TARGET_DIR"
printf 'Preserved the repository README and copied the pack guide to docs/CODEX_PACK_README.md\n'
printf 'Review with: cd %q && git status --short\n' "$TARGET_DIR"
