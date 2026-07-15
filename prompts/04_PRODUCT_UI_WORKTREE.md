# Product UI and PWA Worktree Prompt

Build the user-facing DreamCraft flow around the real runtime contracts.

Read:

- `AGENTS.md`
- `.ai-bridge/contracts.md`
- `docs/00_PRODUCT_NORTH_STAR.md`
- `docs/07_PRODUCT_UI_AND_GAME_FEEL.md`
- `docs/11_DEMO_AND_SUBMISSION.md`

## Ownership

You own only:

- `src/app/**`
- `src/ui/**`
- `public/**`
- UI-scoped tests

Do not edit root dependencies/configs, engine/compiler/gameplay internals, or shared contracts without permission.

## Required flow

1. Dream input screen and sample prompts
2. Real pipeline-status materialization view
3. Canvas entry and pointer-lock call to action
4. Title/objective/crosshair/interaction HUD
5. Dialogue choices
6. Pause, mute, controls, comfort settings
7. Ending/replay/new dream
8. Failure-to-stable-fragment transition
9. Responsive layout and minimum touch controls
10. PWA manifest/shell behavior

## Constraints

- No `innerHTML` for generated text
- No accounts, trackers, remote creative assets, or heavy design system
- Audio starts only after gesture
- Reduced-motion/camera comfort overrides
- Mobile is reduced quality and secondary to desktop reliability

## Acceptance

Verify input, loading, playing, dialogue, completion, retry, fragment, resize, and mobile viewport states. Return exact evidence and worker report.
