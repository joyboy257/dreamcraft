# DreamCraft Mission Status

> The root Sol thread updates this file at each milestone gate. Replace placeholders with evidence.

## Baseline

- Date/time: 2026-07-16 (Asia/Singapore)
- Branch / commit: `main`; G4 synchronized with `origin/main` at `798401f`; independently certified G5 changes await the checkpoint commit
- Remote: `git@github.com:joyboy257/dreamcraft.git`; authenticated owner permission confirmed with `gh`
- Working tree: independently certified G5 engineering changes and evidence pending checkpoint commit
- Node / package manager: Node `24.18.0`; project-pinned pnpm `11.13.0` via Corepack
- Existing implementation summary: remote contained one product `README.md` and no runnable code; README preserved byte-for-byte during pack installation
- Detected tooling: npm `11.16.0`, Chromium CLI, Google Chrome, Safari, GitHub CLI
- Missing prerequisites: live G3 proof requires a rotated/funded OpenAI project key and explicit authorization; deployment is deliberately deferred until local release certification
- Deviations from pack assumptions: mounted repository initially had no `origin`; it was safely connected to the verified non-empty remote and fast-forwarded to `origin/main`

## Active milestone

- Milestone: M5 — Product experience and PWA
- Work items: DC-WI-050 through DC-WI-054; Gate G5
- Goal: make the complete desktop journey understandable and recoverable while proving usable mobile controls and an offline production shell
- Gate state: **engineering-complete / independently certified PASS**
- Owners/agents: root integration, bounded Luna implementation/documentation, and independent Terra gate verification; no live request authorized

## Working user-visible behavior

- [x] Application boots
- [x] Voxel shell playable
- [x] Dummy DreamSpec completes
- [ ] Live generation proof (engineering path complete; ten-prompt live evidence pending)
- [x] Local fallback works
- [x] Procedural hero entity readable
- [x] Generated story ending works
- [x] Mobile reduced-quality path works
- [ ] Public deployment works

## Verification evidence

| Check | Command / route | Result | Evidence |
|---|---|---|---|
| Fresh clone | local `git clone --no-local`, then frozen install and full G0 suite | Pass | isolated clone of `8f0e888`; install/typecheck/lint/test/eval/build/e2e/pack validation all passed |
| Typecheck | `corepack pnpm typecheck` | Pass | strict TypeScript across client, server, API handler, and tests, 2026-07-15 |
| Lint | `corepack pnpm lint` | Pass, zero warnings | ESLint 10 + typed rules |
| Unit/integration tests | `corepack pnpm test` | Pass, 46 files and 189/189 tests | includes G3 mocked failure coverage, G4 runtime richness, real materialization preflight, and production-only service-worker registration behavior |
| Browser smoke | `corepack pnpm test:e2e` | Pass, 4/4 Playwright journeys | complete deterministic desktop journey, six unique G4 renders, materialization cancellation/retry with preserved input, and real mobile touch look/interaction/movement; console and page errors clean |
| Production PWA | `corepack pnpm test:pwa` | Pass, 1/1 Chromium | production service-worker control, manifest and hashed shell assets cached, then usable input shell reloads offline |
| Dream evals | `corepack pnpm eval` | Pass, 5/5 | six-dream G4 distinction gate, representative compiler corpus, hostile path budget, and ten-prompt mocked single/director benchmark |
| Production build | `corepack pnpm build` | Pass | Vite 8 output: index 1.35 kB raw / 0.60 kB gzip, CSS 23.74 / 5.81 kB, JavaScript 979.63 / 271.02 kB; the raw 500 kB advisory remains nonblocking and is owned by G6 |
| Performance | focused metrics tests + headed render inspection | Pass for G1 gate | combined per-chunk geometry, bounded one-job-per-frame scheduling, quality tiers, disposal, and runtime metric recorder |
| Dependency/security checks | `corepack pnpm audit --prod --audit-level high`; ignored-aware pack validator; independent architecture/test/security diff review | Pass | no known production advisories; no High/Critical findings; prior cache/rate/cancellation findings remediated; validator suppresses values and excludes ignored secret files |
| Install integrity | `corepack pnpm install --frozen-lockfile` | Pass | 222 lock entries pass supply-chain policy; OpenAI SDK pinned to mature `6.46.0` |

## Recent decisions or deviations

- Selected the Node 24 line and current pnpm 11 through Corepack; the system pnpm 9 audit endpoint was retired.
- Selected lightweight React for product/error-boundary composition and Three.js for the canvas shell.
- G0 preview uses `THREE.InstancedMesh`; it does not create one mesh per decorative voxel.
- Client configuration rejects secret-like `VITE_*` names and exposes no OpenAI credential.
- Gate G0 independently reviewed, reproduced from a fresh clone, committed, and pushed to `origin/main` at `8f0e888`.
- Gate G1 independently reviewed PASS with no actionable blockers, committed, and pushed to `origin/main` at `8d91b90`.
- Manual visual inspection caught and resolved a seeded terrain wall at arrival by adding a bounded deterministic safe-spawn corridor.
- Gate G2 independently reviewed PASS after adversarial remediation, committed, and pushed to `origin/main` at `59965a2`.
- G2 compiler preserves the complete sanitized declarative spec and maps a trusted safe subset into runtime terrain, palette, hero presentation, story copy, ending, physics, FOV, and spawn.
- G2 adversarial probes cover missing completion, mismatched dialogue responses, nested work budgets, finite overflow, radial spawn safety, requested block capacity, all-air, and all-solid inputs.
- G3 uses strict stage-specific JSON Schemas over the Responses API with `store: false`, `maxRetries: 0`, an overall deadline, and one shared application retry.
- `single-sol` remains the default. The mocked director benchmark did not demonstrate a quality advantage and incurred additional staged calls, so promotion criteria are not met.
- Three bundled showcase prompts warm a bounded memory-only validated cache; exact last-known-good entries are restored only after validation, while novel failures still reach the deterministic local generator.
- Vercel CLI `54.18.1` and MCP are authenticated to team `deonaqwx-9156s-projects`; no DreamCraft project was created and no deployment was attempted before local release certification.
- The original pack validator was hardened after it printed an ignored local key: it now scans only tracked/nonignored files and suppresses matched values.
- G4 maps eight safe scenario archetypes into contextual mechanics and copy rather than executing generated code.
- The six required G4 dreams now have distinct mechanics, movement, silhouettes, atmosphere, audio, and physics fingerprints under deterministic local generation.
- Physics fields resolve only the three highest-priority overlaps; particles cap at 500 and reduced-motion caps their draw count at 48.
- Procedural audio creates no context before the Enter gesture and follows mute, pause/resume, and disposal lifecycle.
- Vercel remains the selected Vite/serverless host with no database/auth/extra backend; `docs/16_VERCEL_RELEASE_PLAN.md` records the disabled-by-default preview and production sequence.
- G4 was independently recertified PASS after adversarial regressions for real physical PlayGraph inputs, dialogue gating/effect atomicity, multi-node response identity, optional concurrency, alternative branches, and runtime-selected endings.
- G5 ties materialization copy to validated compilation and real spawn preparation, supports cancellation/retry without losing the description, and progressively reveals the playable canvas.
- Mobile touch controls feed the same engine paths as desktop movement, look, jump, and interaction; automated Chromium measures actual camera and player changes while reduced quality bounds particle work.
- The PWA service worker is production-only, excludes API traffic, versions only DreamCraft-owned caches, discovers hashed build assets, and preserves a tested offline shell.
- G5 was independently verified by Terra and returned PASS with no OpenAI request and no deployment.

## Known issues

| Severity | Issue | Owner | Next action |
|---|---|---|---|
| Low | Vite reports the 979.63 kB raw client entry chunk above its 500 kB advisory threshold | Root/engine | Profile and reassess justified code splitting during G6; current gzip is 271.02 kB and G5 functionality passes |
| Low | In-memory application rate limiting is per serverless instance | Root/release | Pair with Vercel platform/WAF rate protection before public production traffic |
| Low | Automated mobile Chromium proves touch paths but not real-device ergonomics, GPU performance, or thermal behavior | Root/QA | Run the G6 real-device and performance pass before deployment |
| Low | PWA shell changes can remain stale if the service-worker cache name is not version-bumped | Root/release | Require a cache-version bump whenever cached shell behavior or assets change |
| Low | Chunk generation/meshing is bounded to one job per frame but remains on the main thread | Root/engine | Add worker offload during the G6 performance pass if thresholds require it |

## External blockers

- The existing development key must be rotated because its value appeared in local validator output. Do not add credit to that key.
- The replacement OpenAI project needs up to `$10` credit and explicit authorization before the locked ten-prompt proof. Projected maximum spend is `$9.35`; see `docs/13_G3_LIVE_VALIDATION_RUNBOOK.md`.
- These blockers affect only the live G3 proof. Engineering, deterministic fallback, browser, and security validation are complete locally.

## Next worker wave

- Commit and synchronize the independently certified G5 checkpoint on `main`.
- Continue M6 reliability, failure injection, accessibility, security, performance, and real-device certification without live OpenAI calls.
- After G6 is certified, create/link the Vercel project, configure secrets server-side, deploy and verify a preview, then request explicit production-deployment authorization.
