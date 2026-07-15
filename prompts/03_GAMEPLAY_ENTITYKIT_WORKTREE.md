# Gameplay, EntityKit, and Audio Worktree Prompt

Implement assigned work items for the trusted expressive runtime.

Read:

- `AGENTS.md`
- `.ai-bridge/contracts.md`
- `docs/03_PHYSICS_DSL.md`
- `docs/04_ENTITYKIT.md`
- `docs/05_DREAMPLAYGRAPH.md`
- `docs/07_PRODUCT_UI_AND_GAME_FEEL.md`

## Ownership

You own only:

- `src/entitykit/**`
- `src/gameplay/**`
- `src/audio/**`
- Corresponding tests

Do not edit root/shared files, engine internals, compiler schema, or product UI without permission.

## Required vertical slice

1. One body plan and readable hero entity
2. One trusted behavior
3. Event bus
4. One dialogue
5. One objective beat
6. One completion effect and ending
7. Physics material/transition hook
8. Procedural audio cue hook

Then expand the MVP vocabulary from the docs.

## Entity quality

A hero is not complete unless it has:

- Recognizable body plan/silhouette
- Three iconic features
- Contrasting face or focal point
- Dream-specific material/accessory
- Characteristic animation
- Bounded geometry and disposal

## Gameplay quality

Support peaceful/social/ritual experiences, not only collection or pursuit. Variables, conditions, effects, beats, and endings must be validated and deterministic. No model call occurs during gameplay.

## Acceptance

Demonstrate at least:

- Gummy guardian encounter
- Lottery-family gathering/celebration arc
- Nightmare pursuit/escape arc

Use fixtures if compiler integration is not ready. Run tests and return the worker report.
