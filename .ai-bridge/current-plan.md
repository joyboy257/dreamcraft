# DreamCraft 3D — Current Mission Plan

## Mission

Build and release a judge-ready browser experience that compiles a user's plain-English dream into a recognizable, explorable, interactive voxel game.

The root Sol Codex session owns the mission. Terra/Luna workers execute bounded work packages. This plan is the active scope contract until the root session records a deliberate revision in `.ai-bridge/decisions.md`.

## Starting boundary

At pack creation, the public repository contained a product README and no runnable application. The orchestrator must inspect the actual repository and update `.ai-bridge/status.md`; this plan must not be used to overwrite implementation that landed later.

## End-state acceptance

A release candidate passes only when all of the following are true:

1. A fresh clone installs, typechecks, tests, builds, and starts using documented commands.
2. The public app requires no account and exposes a clear dream input flow.
3. A novel dream can produce a playable core world within the target product latency.
4. Three dream-specific semantic anchors appear near spawn.
5. Player movement, camera, collision, jump, interaction, break/place, and recovery work.
6. At least one readable procedural hero entity exists and reacts to the player.
7. The generated DreamPlayGraph has a visible objective, meaningful action, world response, and ending.
8. Model output is strictly validated and never executed as arbitrary code.
9. API timeout, refusal, malformed output, network failure, and disabled API all resolve to a playable local fallback.
10. No uncaught console errors appear in the judged flow.
11. Desktop performance is stable on the demo machine; mobile reduced-quality mode remains usable.
12. README, architecture, setup, sample prompts, model usage, testing, deployment, license, notices, and judging instructions are complete.
13. A public deployment and a sub-three-minute demo runbook are ready.

## Locked scope

### In scope

- Web-first TypeScript application
- Three.js voxel shell
- Chunked storage and meshing
- First-person desktop controls and basic mobile controls
- Deterministic DreamSpec compiler
- Physics DSL
- EntityKit procedural character grammar
- DreamPlayGraph story/gameplay graph
- Dialogue, atmosphere, particles, and procedural audio primitives
- GPT-5.6 structured generation through a server-side route
- Mock/local and API-failure fallback paths
- PWA metadata and cached shell
- Automated unit, integration, browser, eval, and build checks
- Public deployment configuration
- Hackathon documentation and demo assets

### Out of scope until every release gate passes

- Multiplayer
- User accounts
- Crafting or large inventory systems
- Infinite terrain
- General-purpose rigid-body simulation
- Ragdolls, rope, cloth, fluid simulation
- Real-time model-driven NPC conversations
- Image/model asset generation
- Per-dream application deployment
- Native Swift/SceneKit/Unity client
- Public gallery and social system
- VR

## Architecture invariants

- Model output is declarative DreamSpec data.
- No `eval`, `new Function`, generated imports, shaders, or external asset URLs.
- All generation is deterministic from a seed after the model response.
- Model calls are complete before gameplay logic; game completion never depends on another model call.
- The central playable area loads before distant chunks.
- All numeric/string/array/geometry/physics values have hard runtime bounds.
- Shared contracts are owned by the root Sol thread.

---

# Milestones and work items

## M0 — Repository and toolchain foundation

### DC-WI-001: Baseline and dependency decision

**Owner:** Root + `repo_explorer`
**Dependencies:** None

Deliver:

- Actual repository map and status update
- Package manager decision
- Node version declaration
- Minimal dependency list
- Root scripts for dev, build, preview, typecheck, lint, test, e2e, and eval

Acceptance:

- No unexplained pre-existing changes are lost.
- The toolchain is documented.
- Dependencies are actively maintained and licensed compatibly.

### DC-WI-002: Application scaffold

**Owner:** Root integration

Deliver:

- Vite + strict TypeScript
- Lightweight React application shell if selected
- Three.js canvas entry point
- Error boundary and developer diagnostics
- Environment parsing and `.env.example`

Acceptance:

- App boots to a stable screen.
- `typecheck`, `lint`, and `build` pass.
- No API key is required to boot.

### Gate G0

A fresh clone can install and launch a deterministic local application.

---

## M1 — Playable voxel shell vertical slice

### DC-WI-010: Renderer and game loop

**Owner:** `engine_builder`
**Lane:** `src/engine/**`

Deliver:

- Renderer, scene, camera, resize handling
- Fixed/update-render loop with pause and disposal
- Lighting, fog, sky, quality profile
- WebGL context loss handling where practical

### DC-WI-011: World and chunk storage

Deliver:

- Chunk coordinate helpers
- Bounded voxel storage
- Deterministic generator interface
- Sparse edit deltas
- Load/unload scheduling around the player

### DC-WI-012: Chunk meshing

Deliver:

- Exposed-face culling at minimum
- One/few buffer geometries per chunk, not one mesh per block
- Worker-compatible voxel and mesh payloads
- Rebuild affected neighboring chunks after edits
- Geometry/material disposal

### DC-WI-013: Player motor and collision

Deliver:

- Pointer lock and mouse look
- WASD, sprint, jump
- Axis-separated voxel collision
- Grounding, step/slope constraints as defined
- Coyote time and jump buffering
- Respawn/recovery

### DC-WI-014: Interaction and block editing

Deliver:

- Raycast selection
- Break/place within bounded reach
- Entity-first interaction priority
- Crosshair/target contract

### DC-WI-015: Dummy runtime manifest

**Owner:** Root + engine/gameplay workers

Deliver:

- Flat or gently varied world
- One custom block palette
- One readable floating cube/entity
- One interaction, dialogue, objective, and ending

### Gate G1 — Vertical slice

From a clean page load, the player can enter, walk, look, jump, collide, edit blocks, interact with the dummy entity, complete an objective, and reach an ending with no uncaught errors.

Checkpoint this gate before model integration.

---

## M2 — DreamSpec and trusted compilers

### DC-WI-020: DreamSpec v1 contracts

**Owner:** Root + `dream_compiler`

Deliver:

- TypeScript types
- Zod source-of-truth schema
- Versioning and migration boundary
- JSON examples
- Cross-reference validation

Includes:

- Blueprint and semantic anchors
- World, blocks, terrain, structures
- Player and physics
- EntityKit specifications
- DreamPlayGraph
- Dialogue, atmosphere, audio, effects
- Budgets and metadata

### DC-WI-021: Sanitizer and budget enforcement

Deliver:

- Array/string/number/coordinate clamps
- Identifier/reference integrity checks
- Unknown enum rejection or safe replacement
- Spawn/objective repair
- Reachability approximation
- Diagnostic issue list

### DC-WI-022: Terrain and structure compiler

Deliver:

- Trusted noise/mask operations
- Layers and material mapping
- Bounded procedural structures
- Semantic-anchor placement near spawn
- Safe surface and emergency platform creation

### DC-WI-023: Physics compiler

Deliver:

- Player motor configuration
- World gravity/wind/time/drag
- Material physics
- Bounded local fields
- Story-triggered transitions
- Comfort overrides

### DC-WI-024: EntityKit compiler

Deliver:

- Body plans and named joints
- Feature attachment library
- Procedural materials
- Faces/expressions
- Animation vocabulary
- Readability checks and mesh budgets

### DC-WI-025: DreamPlayGraph compiler

Deliver:

- Variables, conditions, effects, beats, endings
- Event bus and state machine
- Dialogue integration
- Support for peaceful/social/ritual experiences
- Guaranteed completion path or safe repair

### DC-WI-026: Local fallback compiler

Deliver:

- Deterministic keyword/theme extraction
- Safe terrain/palette/entity/beacon/objective
- No network requirement
- Explicit user-facing “stable fragment” messaging

### Gate G2

Representative DreamSpec examples compile into playable worlds. Malformed or over-budget examples are rejected or safely repaired without crashing.

---

## M3 — Runtime GPT-5.6 generation

### DC-WI-030: Generation provider interface

**Owner:** `dream_compiler`

Deliver strategies:

- `mock-local`
- `single-sol`
- `director-parallel` behind a feature flag

Expose timing, strategy, validation, and fallback metadata without leaking secrets.

### DC-WI-031: Server-side OpenAI route

Deliver:

- Server-only SDK usage
- Input normalization and length limits
- Strict structured response parsing
- Timeouts and abort handling
- One bounded retry where justified
- Rate-limit hook and request identifier
- `store: false` or documented data handling choice

### DC-WI-032: Runtime prompts

Deliver:

- Sol director/core prompt
- Terra core compiler prompt for experiment
- Luna enrichment prompt
- Stable reusable prefix
- Schema-bound output
- Explicit recognizability and playability requirements

### DC-WI-033: Progressive result handling

Deliver:

- Core world may start without enrichment
- Safe enrichment patch application
- Last-known-good and sample dream cache
- User-visible timing phases

### DC-WI-034: Strategy benchmark

Run the eval corpus against available strategies and record:

- Schema success
- Playability after repair
- Semantic-anchor score
- Story coherence
- Entity readability
- Time to validated core
- Time to playable frame
- Token/cost estimate where available

Promote `director-parallel` only if it materially improves quality while staying inside latency targets.

### Gate G3

At least ten varied live prompts generate valid playable worlds, and API-disabled mode reliably falls back.

**Current status (2026-07-15):** engineering-complete / live-proof-pending.
All non-live requirements and mocked provider paths pass independent review;
the locked ten-prompt live proof remains the only outstanding G3 artifact.

---

## M4 — Dream richness and game feel

### DC-WI-040: Physics DSL breadth

Deliver the MVP vocabulary from `docs/03_PHYSICS_DSL.md`, including gravity vectors, wind, buoyancy, time scale, vortex, attract/repel, material reactions, dash/glide/flight, and transitions.

### DC-WI-041: EntityKit readability

Deliver at least the MVP body plans, feature families, materials, faces, and animations in `docs/04_ENTITYKIT.md`.

### DC-WI-042: Open-ended DreamPlayGraph

Deliver contextual verbs and story beats sufficient for:

- Exploration
- Pursuit/escape
- Guarded objective
- Flight
- Social reunion
- Celebration/ritual
- Transformation
- Performance

### DC-WI-043: Atmosphere and procedural audio

Deliver:

- Sky/fog/light transitions
- Bounded particles
- Procedural Web Audio moods and cues
- User gesture/audio mute handling
- Reduced-motion and comfort overrides

### DC-WI-044: Semantic staging

Deliver:

- Three near-spawn anchors
- Camera-facing landmark staging
- Hero entity scale and focal point
- Objective path readability
- Climax world transformation

### Gate G4

The candy-forest, flying-city, flooded-school nightmare, talking-moon teapot, lost-dog memory, and lottery-family celebration prompts feel mechanically and visually distinct rather than reskinned.

**Current status (2026-07-16):** engineering-complete / independently recertified PASS.
The deterministic six-dream eval proves unique mechanics, movement signatures,
hero silhouettes, particles, audio moods, and physics fingerprints. Typecheck,
lint, unit/integration tests, evals, production build, and Chromium E2E pass
without live API calls. Evidence: `docs/15_G4_ENGINEERING_EVIDENCE.md`.

---

## M5 — Product experience and PWA

### DC-WI-050: Dream input

**Owner:** `product_ui_builder`

Deliver:

- Clear value proposition
- Dream text area
- Sample prompts
- Submit, validation, keyboard behavior
- No-login path

### DC-WI-051: Materialization sequence

Deliver staged status messages tied to real pipeline events, progressive camera reveal, cancellation/retry behavior, and failure-to-fragment transition.

### DC-WI-052: In-game HUD

Deliver title, objective/journal, crosshair, interaction prompt, dialogue choices, controls, mute/pause, completion state, and remix/restart.

### DC-WI-053: Responsive/mobile controls

Deliver touch movement/look, jump/interact, landscape treatment, DPR/quality reduction, and safe pointer-lock alternatives.

### DC-WI-054: PWA shell

Deliver manifest, icons/placeholders, service-worker strategy, shell caching, offline fallback, and installability where supported.

### Gate G5

A new user can understand, generate, enter, complete, replay, and recover without developer guidance on desktop; mobile remains demonstrably usable.

**Current status (2026-07-16):** engineering-complete / independently certified PASS.
The no-login desktop flow covers input, real staged materialization, fallback,
entry, completion, replay, remix, cancellation, retry, and recovery. A mobile
Chromium journey verifies real touch movement, look, and interaction paths; a
production-browser check proves the cached shell reloads offline. Typecheck,
lint, 189 tests, 5 evals, production build, 4 Playwright journeys, and the PWA
offline journey pass without an OpenAI call or deployment. Real-device mobile
ergonomics remain a G7 release-verification item; automated performance
certification passed in G6. Evidence:
`docs/17_G5_ENGINEERING_EVIDENCE.md`.

---

## M6 — Reliability, performance, security, and accessibility

### DC-WI-060: Automated test suite

**Owner:** `qa_release`

Deliver unit tests, integration tests, DreamSpec fixture tests, browser smoke tests, and eval runner.

### DC-WI-061: Failure injection

Cover:

- Timeout
- Refusal/incomplete structured output
- Invalid cross-references
- All-air/all-solid terrain
- Invalid spawn
- Excessive structures/entities/mesh parts
- Worker failure
- WebGL context loss where testable
- API disabled
- Offline shell

### DC-WI-062: Performance profiling

Measure CPU frame time, draw calls, triangles, chunk latency, memory trend, entity update cost, and first playable timing. Apply desktop/mobile quality tiers.

### DC-WI-063: Security review

**Owner:** `security_reviewer` read-only; root remediates

Review arbitrary execution, XSS, secret boundaries, DoS budgets, server abuse, logging/privacy, CSP, dependencies, and deployment headers.

### DC-WI-064: Accessibility/comfort

Deliver keyboard navigability outside pointer lock, focus management, readable dialogue, contrast, captions/text for audio cues, reduced motion, camera shake/roll overrides, and pause/escape behavior.

### Gate G6

Twenty consecutive eval prompts and the hostile fixture set produce a playable world or safe fragment with no page reload and no uncaught console error. Release performance and security thresholds pass.

**Current status (2026-07-16):** engineering-complete / independently certified PASS.
The deterministic twenty-prompt single-page journey, hostile fixtures,
accessibility/comfort paths, WebGL recovery, desktop/mobile performance budgets,
security boundaries, production headers configuration, and offline PWA shell
all pass without a live OpenAI call or deployment. The serialized official
Playwright matrix passed 9/9 three consecutive times under Luna and 9/9 again
under independent Terra verification. Evidence:
`docs/18_G6_ENGINEERING_EVIDENCE.md`.

---

## M7 — Deployment and hackathon submission

### DC-WI-070: Production deployment

Deliver platform configuration, environment docs, health/smoke check, public URL, error-safe production build, and exact rollback instructions.

### DC-WI-071: Repository readiness

Deliver:

- Complete README
- MIT license prepared/approved
- Third-party notices
- Architecture diagram
- Setup and sample data/prompts
- Testing and eval instructions
- Security/privacy notes
- Judge testing guide
- Codex/GPT-5.6 implementation narrative

### DC-WI-072: Demo package

Deliver:

- Under-three-minute script
- English voiceover copy
- Shot list and backup path
- One live novel prompt plus one cached contrasting dream
- Exact fallback demonstration option
- Screenshots and short evidence clips

### DC-WI-073: Submission checklist

Prepare project description, category recommendation, repository URL placeholder, deployment URL placeholder, video URL placeholder, team credits, and reminder to capture `/feedback` session ID from the primary Sol build thread.

### Gate G7 — Release complete

The public deployment passes incognito, second-device, slow-network, and API-disabled smoke checks. The repository and submission package are judge-ready.

**Current status (2026-07-16): engineering-complete / Vercel-proof-pending;
Gate G7 is not complete.** Gate G6 is synchronized at `112d3da`. Terra returned
PASS for the G7 release-security review, and Sol certified the complete local
candidate through the full serialized release matrix. Health/smoke/CI,
same-origin enforcement, repository/judge/demo readiness, and exact rollback
instructions are complete locally. Vercel project `dreamcraft` is linked with
Git integration disconnected. The failed pre-build attempt and the subsequent
Ready first-success deployment have both been removed, so no deployment or alias
remains. The latter was invoked with `--target=preview`, but Vercel classified
the first successful deployment in the new project as production and assigned a
production alias; it was removed without any HTTP application/API request.
Vercel documents that first-deployment promotion behavior. The seven safe,
non-secret generation-disabled settings are present in both Preview and
Production and no OpenAI key is configured. No Ready preview, authorized
production release, or live proof exists. Evidence:
`docs/20_G7_LOCAL_RELEASE_EVIDENCE.md`. Next: obtain explicit owner
authorization for the first successful production-target deployment, then prove
the generation-disabled preview and complete edge/device verification.

---

# 48-hour execution shape

## Hours 0–6

M0 and G0; begin M1. Preserve a runnable branch.

## Hours 6–14

Finish G1 vertical slice. Start DreamSpec contracts and dummy compilers.

## Hours 14–24

Reach G2 and first live `single-sol` generated world. Record evidence immediately.

## Hours 24–34

Physics, EntityKit, DreamPlayGraph, product UI, and varied-dream quality.

## Hours 34–42

Failure injection, performance, mobile/PWA, security remediation.

## Hours 42–48

Deployment, documentation, demo recording package, final freeze.

# Stop conditions

The orchestrator may stop only when:

- G7 is verifiably complete; or
- Every uncompleted item is blocked exclusively by a human credential/account/legal action, all unblocked work is complete, and `.ai-bridge/status.md` states exact next actions and evidence.
