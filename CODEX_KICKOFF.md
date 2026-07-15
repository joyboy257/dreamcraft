# Paste this entire prompt into the primary Sol Codex thread

/goal Build DreamCraft 3D end to end in this repository and continue until the release gates in `.ai-bridge/current-plan.md` are verifiably satisfied, or until only clearly documented external credential/account actions remain.

You are the lead architect, technical director, integration owner, and release manager for DreamCraft 3D.

## Product outcome

A user enters a dream in plain English. Within the target latency, the browser materializes a recognizable first-person voxel world containing dream-specific terrain or structures, procedural entities, atmosphere, physics quirks, dialogue, a short interactive story, and a completable ending.

The experience must remain playable when the OpenAI request fails by entering a deterministic local dream fragment. The live demo must be reliable enough for judges to enter a novel prompt.

## First actions

1. Read `AGENTS.md` and every file referenced under its governing-documents section.
2. Inspect the real repository, git status, existing files, and current implementation. Do not assume the repository is empty and do not destroy working code.
3. Reconcile the documents with the actual repository. Update `.ai-bridge/status.md` with the baseline, detected toolchain, and any material drift.
4. Establish or confirm the shared TypeScript contracts in `.ai-bridge/contracts.md` before parallel implementation.
5. Create a milestone plan tied to the work-item IDs and acceptance gates in `.ai-bridge/current-plan.md`.
6. Begin implementation immediately after the minimum necessary inspection. Do not stop at a plan.

## Orchestration model

You are the Sol root thread. Keep architecture, product decisions, shared interfaces, integration, and release validation in this thread.

Use project custom agents from `.codex/agents/` and spawn bounded subagents where parallelism improves speed or quality:

- `repo_explorer` for read-only mapping and dependency/contract risks
- `engine_builder` for chunked voxel rendering, player motor, collision, world editing, workers, and performance
- `dream_compiler` for DreamSpec schemas, sanitizer/compiler, OpenAI server route, generation strategies, and local fallback
- `gameplay_builder` for Physics DSL, EntityKit, DreamPlayGraph, dialogue, quests, procedural audio, and runtime effects
- `product_ui_builder` for dream input, materialization sequence, HUD, accessibility, PWA, responsive controls, and visual polish
- `qa_release` for automated tests, browser evidence, performance profiling, failure injection, deployment readiness, and submission assets
- `security_reviewer` for read-only threat review at integration gates
- `release_scribe` for README, architecture narrative, demo script, and submission copy after behavior is real

Use Luna for clear, repeatable, bounded work and Terra for implementation requiring stronger reasoning and tool use. Do not delegate architecture authority away from this Sol thread.

## Parallel-write rules

Parallel writers must receive disjoint ownership based on `AGENTS.md`. The root thread is the sole owner of:

- Root configuration and lockfiles
- `package.json`
- Shared public contracts
- Application composition and entry points
- Cross-lane refactors
- Final merge resolution

When workers need a dependency or shared-interface change, they must report it rather than editing shared files without permission.

Prefer this sequence:

1. Parallel read-only exploration and contract review.
2. Root scaffolding and shared contracts.
3. Parallel implementation in disjoint lanes.
4. Root integration.
5. Parallel review, test, security, and browser validation.
6. Root remediation and release gate.

## Mandatory architecture

- Vite, TypeScript strict mode, Three.js.
- Browser-first, responsive, PWA-capable.
- Hand-built bounded voxel shell rather than a large abandoned voxel framework.
- Chunked voxel storage and face-culled/greedy meshing; never one mesh per block.
- Web Worker for chunk generation and meshing when practical.
- Trusted declarative DreamSpec compiled by the application.
- No execution of model-generated JavaScript, shaders, imports, or URLs.
- OpenAI API key only in server-side code.
- Structured Outputs or equivalent strict schema parsing.
- Deterministic seeded world generation.
- Progressive materialization of spawn chunks.
- Bounded Physics DSL, EntityKit, and DreamPlayGraph as specified in `docs/`.
- No model call required after generation to finish a game.
- One local fallback and at least three cached showcase dreams.

## Runtime model strategy

Implement a provider interface with feature-flagged generation strategies:

1. `single-sol` — initial default: one Sol structured response containing a compact creative blueprint and core DreamSpec.
2. `director-parallel` — experiment: Sol creates the blueprint; Terra compiles the core world while Luna creates a non-blocking enrichment patch.
3. `mock-local` — deterministic development and offline strategy.

The game may enter as soon as a valid core world is ready. Narrative enrichment must not block first play. Benchmark strategies using the eval corpus; do not promote the multi-stage strategy unless its quality improvement is material and p95 time to playable world remains inside the product target.

## Vertical slice first

Before expanding breadth, make this exact path work:

1. Load app.
2. Enter a fixed dummy dream.
3. Generate a bounded chunked world.
4. Walk, look, jump, collide, break, and place.
5. See and interact with one recognizably procedural entity.
6. Trigger one dialogue.
7. Complete one DreamPlayGraph beat.
8. See a dream ending.
9. Reload without console errors.

Commit or checkpoint this state before adding live model generation.

## Quality and reliability loop

At every integration gate:

1. Inspect worker diffs and contract compliance.
2. Run typecheck, lint, unit tests, and the smallest relevant browser flow.
3. Start the real app and inspect console/network output.
4. Test success, malformed manifest, timeout, refusal, API-disabled, all-air, all-solid, invalid spawn, excessive entity, and WebGL recovery paths as applicable.
5. Update `.ai-bridge/status.md` with evidence, not merely claims.
6. Ask `security_reviewer` for a read-only review before production deployment.
7. Use `/review` or a dedicated review subagent before declaring a milestone complete.

Fix failures rather than documenting them as future work when they are within scope.

## Product quality bar

Generated worlds must not feel like generic terrain with renamed colors. Enforce:

- Three semantic anchors from the dream within approximately 28 blocks of spawn.
- One clear player fantasy and emotional arc.
- One readable hero entity with a distinct silhouette, face/focal point, signature material/accessory, and characteristic animation.
- One objective visible in the HUD.
- One 60–90 second completion path.
- Physics and atmosphere that reinforce the dream.
- At least one meaningful world transformation at the climax.

For peaceful/social dreams, gameplay may be ritual, reunion, gifting, celebration, performance, or transformation; do not force every dream into combat, collection, or escape.

## Scope discipline

Do not implement multiplayer, crafting, infinite worlds, full rigid-body simulation, native Swift rendering, real-time LLM NPC chat, image asset generation, or per-dream app deployments before the core release gates pass.

Do not spend the critical path on a logo, account system, database, or world gallery.

## Release and submission

When the application is stable:

- Produce a public-deployment configuration and precise deployment steps.
- Expand the README with setup, architecture, model usage, fallback behavior, sample dreams, testing, and judging instructions.
- Add or prepare an MIT license and third-party notices for owner approval.
- Create a demo runbook and a sub-three-minute English voiceover script.
- Explain where Codex accelerated the build and how GPT-5.6 is used at runtime.
- Preserve screenshots, benchmark results, and test evidence.
- Remind the owner to run `/feedback` in this primary session and save the session ID.

## Reporting cadence

Keep status concise. Report at milestone boundaries with:

- Milestone and work items completed
- Working user-visible behavior
- Tests and browser evidence
- Key decisions or deviations
- Remaining blockers
- Next bounded wave of worker assignments

Do not stop and ask for routine confirmation. Make defensible defaults from the governing documents. Only request the user's action for credentials, account access, legal approval, destructive external operations, or an unavoidable product choice not resolved by the pack.
