# G3 engineering evidence

## Result

Status: **engineering-complete / live-proof-pending**.

The implementation includes a server-only OpenAI Responses adapter, strict per-stage JSON Schemas, normalized server inputs, one shared retry budget, an overall deadline, request cancellation, safe metadata, rate-limit hook, deterministic fallback, validated NDJSON progress frames, a bounded memory-only last-known-good cache, three bundled sample cache entries, and a feature-flagged director pipeline.

## Mocked failure matrix

Automated tests cover:

- structured success;
- transient server/network retry and retry exhaustion;
- elapsed timeout and provider timeout;
- user cancellation without retry or fallback;
- refusal and content filtering;
- malformed or invalid structured output;
- rate limit, authentication, and quota;
- API-disabled zero-call fallback;
- invalid optional enrichment discard;
- shared retry budget across parallel branches;
- strict route/body/field/rate-limit boundaries;
- progressive core before enrichment completion;
- exact validated cache recovery and corrupted-storage safety;
- server-only secret sentinel production build scan.

## Mocked strategy benchmark

The ten-prompt corpus passed `10/10` for both `single-sol` and `director-parallel` using injected deterministic responses. Every result compiled with a safe spawn, at least three semantic anchors, a readable hero, a beat, and an ending.

This is engineering evidence, not a model-quality claim. Both strategies received the same mocked content, while `director-parallel` required three model stages and more tokens. It therefore remains feature-flagged; `single-sol` stays the default pending live and human-scored evidence.

## Local certification commands

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm eval
corepack pnpm build
corepack pnpm e2e
corepack pnpm audit --prod --audit-level high
bash scripts/validate-pack.sh
```

Observed on 2026-07-15: 133/133 tests, 4/4 evals, 1/1 Chromium E2E, build pass, zero high production advisories, pack validation pass, and no secret sentinel in `dist/`.
