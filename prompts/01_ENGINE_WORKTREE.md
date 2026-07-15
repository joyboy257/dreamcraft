# Engine Worktree Prompt

Implement the DreamCraft voxel-shell work items assigned from `.ai-bridge/current-plan.md`, using `AGENTS.md`, `.ai-bridge/contracts.md`, `docs/01_SYSTEM_ARCHITECTURE.md`, `docs/03_PHYSICS_DSL.md`, and `docs/08_PERFORMANCE_BUDGETS.md` as governing context.

## Ownership

You own only:

- `src/engine/**`
- Engine-scoped test files explicitly assigned to you

Do not edit `package.json`, lockfiles, root configs, application entry points, shared DreamSpec contracts, UI modules, compiler modules, or gameplay modules. Return proposed shared/dependency changes to the parent.

## Build order

1. Renderer, camera, resize, loop, disposal
2. Chunk coordinate/storage APIs
3. Deterministic generator adapter
4. Exposed-face combined chunk meshing
5. Player motor and voxel collision
6. Interaction raycast and block editing
7. Chunk queue/load/unload
8. Worker path after synchronous correctness
9. Runtime metrics and quality tiers

## Acceptance

- No one-mesh-per-block implementation
- Negative world coordinates work
- Neighbor faces at chunk boundaries are correct
- Block edits rebuild necessary chunks
- Walking, jumping, collision, break/place, respawn work
- No obvious per-frame allocation hot path
- Dream reload disposes old resources
- Focused tests pass

Start by inspecting the actual repository and shared contracts. Make the smallest coherent implementation that advances the vertical slice. Run the relevant commands and return `templates/WORKER_RETURN.md` format.
