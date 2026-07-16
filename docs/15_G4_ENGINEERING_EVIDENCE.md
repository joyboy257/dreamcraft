# G4 Dream Richness Engineering Evidence

Date: 2026-07-16 (Asia/Singapore)

Status: **engineering-complete / independently recertified PASS**

No OpenAI API request, deployment, remote asset fetch, or other paid operation was
used to implement or validate G4. All six gate dreams use the mandatory
deterministic local generator.

An independent read-only reviewer reproduced each discovered PlayGraph edge
case, verified the remediations on the exact final tree, reran every listed
gate, and returned an explicit PASS.

## Delivered work

- DC-WI-040: bounded gravity/wind/buoyancy/time/field/material vocabulary,
  dash/glide/flight/swim motor inputs, and immutable story transitions.
- DC-WI-041: ten MVP procedural body plans, feature/material/face vocabularies,
  semantic animation, part budgets, and evidence-derived readability reports.
- DC-WI-042: a trusted scenario compiler for exploration, pursuit, guarded
  objectives, flight, reunion, celebration, transformation, and performance.
- DC-WI-043: bounded atmosphere descriptors, named transitions, a maximum of
  500 particles (48 in reduced-motion mode), and gesture-gated procedural Web
  Audio with mute/suspend/resume/disposal.
- DC-WI-044: deterministic three-anchor staging, a camera-facing first interaction,
  readable objective path, hero focal treatment, and climax transformation.

## Six-dream gate

`tests/eval/dreamspec.eval.test.ts` verifies these deterministic prompts:

1. Candy forest
2. Flying city
3. Flooded-school nightmare
4. Talking-moon teapot
5. Lost-dog memory
6. Lottery-family celebration

The gate requires six unique values for scenario, mechanic, movement signature,
hero silhouette, particle identity, audio mood, and bounded physics fingerprint.
This prevents palette-only reskins from passing. A separate physical-input test
then completes candy via successful in-zone block placements, flying/flooded/
reunion/performance dreams via actual player-position zone entries, and the
teapot via real entity interactions. The PlayGraph runtime has no synthetic
"complete the current action" shortcut.

## Local verification

| Check | Result |
|---|---|
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass, zero warnings |
| `pnpm test` | Pass, 184/184 |
| `pnpm eval` | Pass, 5/5 |
| `pnpm build` | Pass |
| `pnpm test:e2e` | Pass, 2/2 Chromium; all six worlds render uniquely |
| `pnpm audit --prod --audit-level high` | Pass, no known vulnerabilities |
| `bash scripts/validate-pack.sh` | Pass |
| `git diff --check` | Pass |

The 269.75 kB gzip main bundle remains free of OpenAI credentials. Vite reports the
existing advisory that the main minified chunk exceeds 500 kB; G6 owns final
code splitting and performance certification.

## Deliberate MVP limits

- Sideways gravity applies force but does not rotate the floor collision frame.
- Ropes, vehicles, ragdolls, full fluid simulation, and general rigid bodies
  remain outside the MVP vocabulary.
- The runtime uses the engine-owned atmosphere binding; the separately tested
  Three.js binding remains a reference implementation and is not instantiated
  concurrently.
