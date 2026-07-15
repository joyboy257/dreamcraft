# DreamCraft Repository Instructions

## Mission

Build DreamCraft 3D: a browser-first experience that turns a user's dream description into a recognizable, playable, first-person voxel world in seconds.

A successful dream must contain dream-specific terrain or structures, a readable procedural entity, atmosphere/physics derived from the description, a short interactive story, and a completable ending.

## Governing documents

Read these before changing architecture:

1. `.ai-bridge/current-plan.md`
2. `.ai-bridge/decisions.md`
3. `.ai-bridge/contracts.md`
4. `docs/00_PRODUCT_NORTH_STAR.md`
5. `docs/01_SYSTEM_ARCHITECTURE.md`
6. The subsystem document for the area being changed

When documents conflict, use this precedence:

`AGENTS.md` → `.ai-bridge/decisions.md` → `.ai-bridge/current-plan.md` → subsystem docs.

Record intentional architecture changes in `.ai-bridge/decisions.md` rather than silently diverging.

## Non-negotiable architecture

- Web-first. PWA support is in scope; native iOS is a stretch after the web release gate.
- TypeScript strict mode.
- Three.js-based shell with chunked voxel rendering.
- Do not create one Three.js Mesh per block.
- GPT-5.6 returns a declarative validated DreamSpec. Never execute model-generated JavaScript.
- No `eval`, `new Function`, generated imports, generated shaders, or model-provided URLs.
- OpenAI credentials remain server-side.
- World generation must be deterministic from the manifest seed.
- Central chunks become playable before outer chunks finish.
- A local fallback must produce a playable world without the API.
- User/model text must not be inserted with `innerHTML`.

## Delivery strategy

Build and preserve a runnable vertical slice before expanding breadth:

1. Flat chunked world.
2. First-person movement, collision, jump, break/place.
3. Dummy DreamSpec injection.
4. One readable procedural entity and dialogue.
5. One objective and ending.
6. Live GPT-5.6 structured generation.
7. Reliability, performance, polish, deployment.

Never trade the working vertical slice for a speculative rewrite.

## Subagent policy

The root Sol thread owns architecture, shared contracts, integration, and final verification.

Delegate bounded work to Terra/Luna agents. Prefer parallel read-heavy work. Parallel writers must receive disjoint file ownership. The root thread owns shared integration files including root configuration, `package.json`, application composition, cross-module contracts, and merge resolution.

Workers must not broaden scope. Each worker returns:

- What changed
- Exact files changed
- Commands/tests run and results
- Remaining risks or blockers
- Contract changes proposed

Do not accept a worker claim without inspecting its diff and rerunning the relevant checks.

## File ownership lanes

Default lanes unless the orchestrator explicitly changes them:

- Engine: `src/engine/**`, engine tests
- Dream compiler/API: `src/dream/**`, `src/server/**`, `api/**`, compiler tests
- Entity/gameplay/audio: `src/entitykit/**`, `src/gameplay/**`, `src/audio/**`
- Product UI/PWA: `src/app/**`, `src/ui/**`, `public/**`
- QA/evals: `tests/**`, `evals/**`, Playwright/Vitest test files
- Integration/root: `src/main.ts`, `src/App.tsx`, `package.json`, lockfile, root configs

A worker must not edit outside its lane without explicit permission.

## Code quality

- Prefer small modules with explicit interfaces.
- Validate all external and model-generated data at boundaries.
- Bound all arrays, coordinates, geometry counts, timers, strings, and physics values.
- Avoid hidden global mutable state.
- Use deterministic seeded random helpers, never ambient `Math.random()` for world generation.
- Dispose Three.js geometry, materials, textures, render targets, and event listeners.
- Keep frame-loop allocations near zero.
- Keep gameplay model-independent after generation; no model call is required to complete a dream.
- Keep error messages user-safe and diagnostic logs developer-useful.

## Performance budgets

Treat `docs/08_PERFORMANCE_BUDGETS.md` as a release contract. At minimum:

- First playable central area within the product latency target.
- Desktop target around 60 FPS on the demo machine.
- Mobile target at least 30 FPS in the reduced quality profile.
- No unbounded entity, particle, geometry, or physics allocation.
- Chunk generation and meshing must not freeze the main thread.

## Security and privacy

- Never commit secrets.
- Do not log full API keys, authorization headers, or raw sensitive user data.
- Limit dream input length.
- Use server-side request validation, timeouts, and rate-limit hooks.
- Apply a restrictive Content Security Policy where hosting permits.
- Treat generated content as untrusted even after structured output parsing.
- Do not add analytics, trackers, remote assets, or new external services without an explicit decision.

## Required checks

As scripts become available, run the smallest relevant checks during development and the full release set before completion:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm eval:dreams
pnpm build
```

Use `npm run ...` if pnpm is unavailable. Update this file and the README when the actual command names stabilize.

For visual changes, run the app and verify in a browser. Check console errors, loading/failure paths, pointer lock, keyboard controls, resize behavior, and at least one mobile viewport.

## Completion behavior

Do not stop after producing a plan. Continue implementing, validating, integrating, and documenting until the active milestone's acceptance criteria pass.

Do not ask the user for routine implementation choices already resolved in the governing documents. Ask only when blocked by credentials, legal approval, destructive external action, or a truly irreversible product decision. When an external blocker exists, complete all unblocked work and document the exact remaining action.
