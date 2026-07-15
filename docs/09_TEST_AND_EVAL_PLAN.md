# Test and Evaluation Plan

## Testing layers

### Unit tests

Cover deterministic utilities and pure compilers:

- Coordinate/chunk math including negatives
- Seeded random/noise determinism
- Schema parsing and bounds
- Reference integrity
- Sanitizer repairs
- Terrain operation composition
- Safe spawn search
- Entity readability scoring
- DreamPlayGraph condition/effect evaluation
- Physics resolution and clamps

### Integration tests

Cover subsystem boundaries:

- DreamSpec → runtime manifest
- Manifest → chunks
- EntityKit spec → Object3D hierarchy
- PlayGraph events → objective/ending
- Server route → validated response/fallback metadata
- Enrichment patch compatibility

### Browser/E2E tests

Use Playwright or equivalent for:

- App load and dream input
- Mock-local materialization
- Canvas and shell ready state
- Keyboard movement or test hooks
- Dialogue and objective completion
- Restart/new dream
- API failure → fragment
- Resize and mobile viewport
- No uncaught page/console errors

Pointer lock may require dedicated manual smoke or browser-specific handling. Provide a test hook without weakening production behavior.

## Hostile fixtures

Create fixtures for:

1. Empty dream
2. Overlong dream
3. All-air world request
4. All-solid world request
5. Spawn inside geometry
6. Objective outside bounds
7. Missing referenced block/entity/dialogue
8. Duplicate IDs
9. Excessive structures/entities/features
10. Non-finite numeric values
11. Extreme gravity/time scale
12. Cyclic/never-completing story graph
13. Dialogue node loop beyond limit
14. Unsupported enum values
15. Transparent-block overload
16. Model refusal/incomplete result
17. API timeout
18. Worker crash/timeout
19. WebGL context loss where testable
20. Offline/API-disabled app

Each fixture must result in either a valid repaired world or a local fragment without page reload.

## Dream prompt corpus

Use `schemas/eval-cases.json`. It must include:

- Candy forest guarded treasure
- Flying city/sky whales
- Flooded repeated school nightmare
- Teapot in space with talking moons
- Lost dog in photograph forest
- Volcano riddle/glass bridge
- Underwater palace
- Alarm clock childhood-home chase
- Cloud floor/falling stars
- Whispering future library
- Lottery family celebration
- Quiet family reunion
- Tiny person in ordinary kitchen
- Sideways-gravity office
- Performance dream with no threat

## Automated eval assertions

For every generated spec:

- Schema valid
- IDs unique
- References valid
- Within budgets
- Safe spawn possible
- At least three semantic anchors declared
- Required anchors have staging targets
- At least five block types unless intentionally minimal
- At least one readable hero entity
- At least one objective beat
- At least one reachable ending
- No external URLs/code fields
- No dialogue exceeds length limits
- No required object outside bounds
- No impossible count requirement

## Human quality rubric

Score 1–5:

1. Dream recognizability
2. Environmental specificity
3. Entity readability
4. Physics relevance
5. Emotional fidelity
6. Objective clarity
7. Story coherence
8. Climax/payoff
9. Visual composition near spawn
10. Overall desire to replay/remix

Record short evidence notes, not just numbers.

## Strategy comparison

For each runtime strategy, capture:

- Validation success rate
- Repair count distribution
- Fallback rate
- Time to core
- Time to playable
- Token/cost metadata if available
- Human rubric average

Do not compare on one cherry-picked prompt.

## Release gates

### G1 vertical slice

- Unit checks for engine math
- Browser manual smoke
- No console errors

### G2 DreamSpec

- All schema/repair fixtures pass
- Example worlds compile

### G3 live generation

- Ten consecutive varied live prompts succeed or safely fallback

### G4 richness

- Six contrasting prompts demonstrate distinct mechanics and staging

### G6 reliability

- Twenty consecutive corpus prompts plus hostile fixtures
- No page reload
- No uncaught error
- Performance budgets recorded
- Security review complete

### G7 release

- Fresh clone verification
- Production build
- Incognito public smoke
- Second device
- Slow network simulation
- API disabled fallback

## Evidence format

Use `templates/TEST_EVIDENCE.md` and update `.ai-bridge/status.md`.
