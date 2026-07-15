# Dream Compiler Worktree Prompt

Implement the assigned DreamSpec/OpenAI work items from `.ai-bridge/current-plan.md`.

Read:

- `AGENTS.md`
- `.ai-bridge/contracts.md`
- `docs/02_DREAMSPEC_DSL.md`
- `docs/06_RUNTIME_MODEL_PIPELINE.md`
- `docs/10_SECURITY_AND_RELIABILITY.md`
- `schemas/eval-cases.json`

## Ownership

You own only:

- `src/dream/**`
- `src/server/**`
- `api/**`
- Compiler/server-scoped tests

Do not edit root dependencies/configs, app entry points, engine, EntityKit, gameplay, or UI without explicit permission.

## Required order

1. Zod source-of-truth DreamSpec v1
2. Example fixtures and structural tests
3. Cross-reference validator and budget sanitizer
4. Safe spawn/objective repair
5. Trusted terrain/structure descriptors
6. Deterministic mock-local and fallback provider
7. Server-side `single-sol` structured generation
8. Timeouts, abort, one bounded retry, typed errors
9. Feature-flagged director-parallel provider
10. Eval instrumentation

## Security rules

- No arbitrary generated code
- No browser API key
- No user-selected model/system prompt
- No model-provided URLs/HTML/shaders
- Hard caps on every costly dimension
- Safe logs without raw secrets

## Acceptance

- Mock-local works without an API key
- Malformed fixtures are rejected/repaired safely
- Server route cannot leak the key into client bundle
- Live response passes the same validation as cached/local specs
- API disabled/timeout produces local fallback metadata
- Focused tests pass

Return the worker report template with proposed shared imports/dependencies rather than editing root files silently.
