# QA and Release Worktree Prompt

Audit the integrated DreamCraft application against `.ai-bridge/current-plan.md` and `docs/09_TEST_AND_EVAL_PLAN.md`.

Start by discovering the real commands and running the app. Do not trust status documents without reproducing behavior.

## Ownership

Prefer tests/evals/release documentation. Make only small targeted product fixes when explicitly permitted. Route architectural issues to the root Sol thread.

## Required coverage

- Fresh install/build
- Typecheck/lint/unit tests
- Mock-local full completion
- Live generation if key/environment is available
- API disabled/timeout/malformed result fallback
- All-air/all-solid/invalid spawn fixtures
- Duplicate/missing references and budget overload
- Dream reload/disposal
- Pointer lock and controls
- Mobile viewport/reduced quality
- Console/network errors
- Performance metrics
- Production preview/deployment smoke

## Output

1. Severity-ranked findings
2. Reproduction steps
3. Exact commands/results
4. Performance evidence
5. Release-gate matrix
6. Minimal fixes made
7. Remaining external blockers

Do not lower thresholds to declare success.
