#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

required=(
  "README.md"
  "START_HERE.md"
  "AGENTS.md"
  "CODEX_KICKOFF.md"
  ".codex/config.toml"
  ".ai-bridge/current-plan.md"
  ".ai-bridge/contracts.md"
  "docs/00_PRODUCT_NORTH_STAR.md"
  "docs/01_SYSTEM_ARCHITECTURE.md"
  "docs/02_DREAMSPEC_DSL.md"
  "docs/03_PHYSICS_DSL.md"
  "docs/04_ENTITYKIT.md"
  "docs/05_DREAMPLAYGRAPH.md"
  "docs/06_RUNTIME_MODEL_PIPELINE.md"
  "docs/09_TEST_AND_EVAL_PLAN.md"
  "docs/10_SECURITY_AND_RELIABILITY.md"
  "schemas/eval-cases.json"
  "schemas/dream-spec-v1.example.json"
)

failed=0
for path in "${required[@]}"; do
  if [[ ! -s "$ROOT/$path" ]]; then
    echo "Missing or empty: $path" >&2
    failed=1
  fi
done

python3 -m json.tool "$ROOT/schemas/eval-cases.json" >/dev/null
python3 -m json.tool "$ROOT/schemas/dream-spec-v1.example.json" >/dev/null

if grep -R --exclude='validate-pack.sh' -nE 'OPENAI_API_KEY=[^[:space:]]+' "$ROOT" | grep -v 'OPENAI_API_KEY=replace_me' | grep -v 'OPENAI_API_KEY=$'; then
  echo "Possible embedded API key value found." >&2
  failed=1
fi

if [[ $failed -ne 0 ]]; then
  exit 1
fi

printf 'DreamCraft Codex pack validation passed.\n'
