# G7.1 Semantic-Grounding Evidence

## What was lost before G7.1

The compiler retained a small anchor list, but the runtime reduced it to a fixed
near-spawn corridor. Structures only influenced staging; terrain chunks never
contained their geometry. Non-hero entities were hidden, and every objective
used the same moonwell beacon, regardless of the DreamSpec.

## Grounded contract and runtime changes

- Semantic anchors now retain a source phrase, representation, gameplay role,
  importance, and `mustAppear` flag through compilation.
- The director prompt only requests declared runtime capabilities and maps
  important phrases to physical/mechanical representations. Live director
  reasoning is `medium`; no live request was made for this gate.
- Authored structures compile to safe, capped voxel overlays. Entity spawn
  definitions compile to up to 12 procedural instances, with hiding allowed
  only for an explicit later `spawn_entity` effect.
- Runtime staging preserves safe authored anchor positions. The opening camera
  faces the highest-priority non-fallback anchor.
- `createSemanticObjective` binds the target visual, HUD/play-graph objective,
  interaction target, transformation, and ending to the same anchor. The
  legacy beacon is only used when the compiler has no supported objective.

## Supported voxel archetypes

`room`, `corridor`, `school`, `kitchen`, `house`, `stage`, `bridge`, `tower`,
`doorway`, `tree`, `giant_cup`, `bowl`, `instrument`, `sign`, `jackpot_board`,
`platform`, and `floating_island` (plus the existing bounded legacy forms).
Each is capped to 24×20×24 voxels per authored structure and rendered only in
intersecting chunks.

## Reference-dream evidence matrix

| Reference dream | High-priority anchor coverage | Central physical objective | Mechanical arc / ending |
| --- | ---: | --- | --- |
| Moonlit kitchen | 100% (5/5) | Giant cup voxel form + cup objective | Repair/fill the cup; kitchen returns to rhythm |
| Flooded school | 100% (5/5) | Exit stairwell doorway | Evade the hallway shadow; dog crosses the exit |
| Lottery family | 100% (5/5) | Bright celebration stage | Perform with three visible family-band instances; shared finale |

The evaluator additionally verifies entity recognisability, objective/ending
alignment, and rejects a supported objective that regresses to fallback beacon
staging. The fixtures are valid `DreamSpecV1` values and use the normal
sanitizer, compiler, runtime adapter, voxel generator, entity kit, and
objective factory—there is no fixture-specific renderer.

## Bounded performance observation

On this workstation, generating the chunks containing all authored structures
took 1.11 ms for the kitchen, 0.54 ms for the school, and 1.48 ms for the
lottery family. The automated guard permits less than 250 ms per reference
fixture and limits runtime entity instances to 12. These are local CPU timings,
not a substitute for the remaining physical-device gate.

## Remaining unsupported concepts

The engine intentionally reduces arbitrary prose to this bounded vocabulary.
Unsupported bespoke creatures, architecture, cinematic events, and mechanics
must be represented by the closest declared archetype, entity-kit body plan,
or safe fallback; they cannot add executable content, remote assets, or new
render code at generation time.
