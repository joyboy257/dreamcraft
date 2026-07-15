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

while IFS= read -r -d '' path; do
  [[ "$path" == "scripts/validate-pack.sh" ]] && continue
  grep -Iq . "$ROOT/$path" || continue
  if awk '
    /OPENAI_API_KEY=/ {
      value = $0
      sub(/^.*OPENAI_API_KEY=/, "", value)
      if (value !~ /^([[:space:]]*|replace_me[[:space:]]*)$/) found = 1
    }
    END { exit found ? 0 : 1 }
  ' "$ROOT/$path"; then
    echo "Possible embedded API key value found in $path (value suppressed)." >&2
    failed=1
  fi
done < <(git -C "$ROOT" ls-files --cached --others --exclude-standard -z)

if [[ $failed -ne 0 ]]; then
  exit 1
fi

printf 'DreamCraft Codex pack validation passed.\n'
