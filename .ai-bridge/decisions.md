# DreamCraft Architecture Decision Log

These decisions are locked unless the root Sol thread records a replacement with rationale, consequences, and migration impact.

## D-001 — Web-first release

**Decision:** Ship a desktop-first web application with PWA/mobile support. Defer native packaging until the web release gate passes.

**Why:** The judged magic is immediate dream-to-world materialization. A second native rendering/runtime surface adds risk without improving that core demonstration.

## D-002 — Three.js shell, not a full imported voxel engine

**Decision:** Build a bounded purpose-specific shell using Three.js primitives and controls.

**Why:** The repository needs predictable ownership, modern TypeScript, explicit performance budgets, and a narrow feature set. Avoid inheriting a large or stale framework.

## D-003 — Declarative DreamSpec, never arbitrary generated JavaScript

**Decision:** GPT-5.6 outputs strict data validated by Zod/JSON Schema. Trusted TypeScript compilers create runtime functions and objects.

**Consequences:**

- No `eval`, `new Function`, generated modules, generated shaders, or generated URLs.
- Behaviors, geometry, physics, and story use bounded vocabularies.
- Worlds are serializable, cacheable, reproducible, and testable.

## D-004 — Runtime generation strategies are pluggable

**Decision:** Implement:

- `mock-local` for deterministic development/offline use.
- `single-sol` as the initial production path.
- `director-parallel` as an experiment: Sol blueprint, Terra core, Luna enrichment.

**Promotion rule:** Multi-stage generation is not the default unless measured quality improves materially and p95 time to playable remains within target.

## D-005 — Sol root, Terra/Luna build workers

**Decision:** The primary Codex thread uses Sol and owns architecture/integration. Terra handles reasoning-heavy implementation. Luna handles clear bounded implementation, UI, exploration, and documentation.

**Constraint:** Parallel writers receive disjoint directory ownership. The root owns shared files and contracts.

## D-006 — Bounded world, progressive chunks

**Decision:** Generate a deliberately limited region suitable for a 60–90 second experience. Stream chunks around the player and make the spawn region playable first.

**Why:** “Procedurally infinite” is not required for the emotional promise and makes reliability harder.

## D-007 — Face-culled combined chunk geometry

**Decision:** Voxel chunks compile to one/few BufferGeometries. Greedy meshing is a performance enhancement, not a prerequisite if exposed-face culling meets budgets.

**Prohibited:** One Mesh per block.

## D-008 — Custom player/voxel collision

**Decision:** Use a simple bounded player motor and voxel collision. A general physics library is optional only for a small number of dynamic props after the core gates pass.

## D-009 — Physics is a composable DSL

**Decision:** Separate player motor, world physics, surface materials, local fields, and story transitions. User comfort overrides always win.

## D-010 — EntityKit is a semantic procedural grammar

**Decision:** Entities are composed from body plans, named joints, features, materials, faces, and animation styles. Hero entities must satisfy a recognizability contract.

**Why:** Raw primitive lists create unrecognizable “sphere creatures”; fixed asset templates violate the dream-specific promise.

## D-011 — DreamPlayGraph replaces fixed game modes

**Decision:** The runtime executes variables, verbs, conditions, effects, beats, and endings. Archetype tags are descriptive metadata only.

**Why:** Social, celebratory, ritual, memory, performance, and transformation dreams need meaningful play without being forced into combat/collection/escape.

## D-012 — No gameplay-time model dependency

**Decision:** Dialogue trees, reactions, quest logic, and endings are generated up front. Completing a dream requires no additional model request.

## D-013 — Progressive materialization

**Decision:** Renderer and shell initialize while generation runs. Spawn chunks enter first. Optional enrichment patches may apply after entry at safe update boundaries.

## D-014 — Local fallback is a product feature

**Decision:** API/network/model failure enters a themed deterministic “stable dream fragment” rather than an error screen.

## D-015 — No account or database in the core release

**Decision:** Use local storage/IndexedDB for recent dreams and cached showcases. Add server persistence only when share links are proven necessary and the release is otherwise complete.

## D-016 — No external creative assets in the core world

**Decision:** Blocks, entities, particles, sky, and audio are procedural or application-generated. Small interface icons/fonts must be license-compatible and documented.

## D-017 — Deployment target remains replaceable

**Decision:** Use standard Vite output plus a small server/API boundary compatible with a mainstream serverless host. Avoid vendor-specific application architecture.

## D-018 — Evidence is part of completion

**Decision:** A milestone is not complete without commands, test results, browser evidence, and updated status. Documentation may not claim behavior that has not been demonstrated.

## D-019 — Sequential model allocation through G7

**Decision:** Use one worker at a time until Gate G7. Luna owns normal implementation, tests, documentation, and routine fixes. Terra owns difficult systems work, debugging, security review, and gate verification. Sol is reserved for architecture decisions, scope arbitration, integration authority, and final release review.

**Supersedes:** The parallel-worker portion of D-005 and earlier worker-wave guidance. Directory ownership and root shared-contract authority remain unchanged.

**Context policy:** Keep unused MCP/connectors idle and load only the repository context needed for the active gate.
