# DreamCraft Mission Status

> The root Sol thread updates this file at each milestone gate. Replace placeholders with evidence.

## Baseline

- Date/time: 2026-07-16 (Asia/Singapore)
- Branch / commit: `main`; G5 synchronized with `origin/main` at `7bbcf09`; independently certified G6 changes await the checkpoint commit
- Remote: `git@github.com:joyboy257/dreamcraft.git`; authenticated owner permission confirmed with `gh`
- Working tree: independently certified G6 hardening, tests, and evidence pending checkpoint commit
- Node / package manager: Node `24.18.0`; project-pinned pnpm `11.13.0` via Corepack
- Existing implementation summary: remote contained one product `README.md` and no runnable code; README preserved byte-for-byte during pack installation
- Detected tooling: npm `11.16.0`, Chromium CLI, Google Chrome, Safari, GitHub CLI
- Missing prerequisites: live G3 proof requires a rotated/funded OpenAI project key and explicit authorization; deployment is deliberately deferred until local release certification
- Deviations from pack assumptions: mounted repository initially had no `origin`; it was safely connected to the verified non-empty remote and fast-forwarded to `origin/main`

## Active milestone

- Milestone: M6 — Reliability, performance, security, and accessibility
- Work items: DC-WI-060 through DC-WI-064; Gate G6
- Goal: certify deterministic failure recovery, accessibility and comfort behavior, desktop/mobile runtime budgets, and release security boundaries
- Gate state: **engineering-complete / independently certified PASS**
- Owners/agents: root integration, sequential bounded Luna implementation/documentation, and independent Terra gate verification; no live request authorized

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
| Typecheck | `corepack pnpm typecheck` | Pass | strict TypeScript across client, server, API handler, and tests, 2026-07-16 |
| Lint | `corepack pnpm lint` | Pass, zero warnings | ESLint 10 + typed rules |
| Unit/integration tests | `corepack pnpm test` | Pass, 48 files and 192/192 tests | includes G3 mocked failure coverage, G4 runtime richness, G5 materialization/PWA behavior, request hardening, and locked Vercel security-header configuration |
| Focused independent verification | changed-path unit, integration, security, and hostile suites | Pass, 44/44 tests | independent Terra rerun before the G6 verdict |
| Browser smoke | `corepack pnpm test:e2e` | Pass, 9/9 Playwright journeys with `workers: 1` | three consecutive official Luna runs plus an independent Terra 9/9 rerun; covers complete desktop and mobile journeys, twenty prompts in one page, accessibility/comfort, WebGL recovery, and measured desktop/mobile budgets |
| Production PWA | `corepack pnpm test:pwa` | Pass, 1/1 Chromium | production service-worker control, manifest and hashed shell assets cached, then usable input shell reloads offline |
| Dream evals | `corepack pnpm eval` | Pass, 4 files and 6/6 tests | six-dream distinction, representative compiler corpus, hostile aggregate, and ten-prompt mocked single/director benchmark; twenty deterministic prompts also pass in the single-page browser gate |
| Production build | `corepack pnpm build` | Pass | Vite 8 JavaScript output 980.52 kB raw / 271.31 kB gzip; the raw 500 kB advisory remains nonblocking because documented runtime budgets pass |
| Performance | deterministic desktop balanced and Pixel 7 reduced-profile browser metrics | Pass | desktop 119 FPS / 16.7 ms p95 / 23 draws / 11,738 triangles; reduced mobile 120 FPS / 9.1 ms p95 / 18 draws / 7,628 triangles; chunk work below 5 ms p95 and three-lifecycle heap growth approximately 6.7% |
| Dependency/security checks | `corepack pnpm audit --prod`; pack validator; service-worker syntax; sequential repository hardening plus independent Terra gate review | Pass | zero known vulnerabilities, zero High/Critical findings, restrictive deployment-header configuration, API responses excluded from caches, and no secret-pattern hit; this was not claimed as an exhaustive multi-agent security scan |
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
- G6 locks the official browser matrix to one deterministic worker; Luna
  reproduced 9/9 three consecutive times and Terra independently reran 9/9.
- Twenty varied API-disabled prompts reach preflighted safe fragments in one
  page session without a reload, console error, or page error.
- Accessibility and comfort verification covers focus containment, keyboard
  escape/recovery, audio-cue text alternatives, reduced motion, FOV, and mouse
  sensitivity propagation into the engine.
- Runtime metrics now report actual loaded chunks, queues, entities, particles,
  frame latency, draw calls, triangles, and generation/mesh latency. Desktop and
  reduced-mobile profiles pass their budgets; three materialization lifecycles
  remain inside the heap-growth guard.
- Production configuration adds a restrictive CSP and transport/privacy headers;
  the service worker continues to exclude every API response from caching.
- Gate G6 was independently certified PASS by Terra after a sequential repository
  hardening pass. No OpenAI request and no deployment occurred.

## Known issues

| Severity | Issue | Owner | Next action |
|---|---|---|---|
| Low | Vite reports the 980.52 kB raw client entry chunk above its 500 kB advisory threshold | Root/engine | Reassess code splitting before release only if it materially improves loading; current gzip is 271.31 kB and measured runtime budgets pass |
| Medium | In-memory application rate limiting is per serverless instance | Root/release | Configure Vercel Firewall/shared rate protection or approve a distributed limiter before public live generation |
| Low | The API does not explicitly reject a foreign `Origin`; browser CORS behavior limits impact and the endpoint has no cookie/account authority | Root/release | Approve and add an exact same-origin check/allowlist before public live generation |
| Low | Automated Pixel 7 Chromium proves touch paths and reduced-profile budgets but not physical-device ergonomics, GPU-driver behavior, or thermals | Root/QA | Confirm on the physical demo device during G7 release verification |
| Low | PWA shell changes can remain stale if the service-worker cache name is not version-bumped | Root/release | Require a cache-version bump whenever cached shell behavior or assets change |
| Low | Chunk generation/meshing remains on the main thread | Root/engine | Keep the measured sub-5 ms p95 guard; add worker offload only if future content breaks it |
| Informational | WebGL context loss/restoration is event-tested, but actual recovery depends on the device and GPU driver | Root/QA | Verify the actionable recovery/return path on the physical demo device |

## External blockers

- The existing development key must be rotated because its value appeared in local validator output. Do not add credit to that key.
- The replacement OpenAI project needs up to `$10` credit and explicit authorization before the locked ten-prompt proof. Projected maximum spend is `$9.35`; see `docs/13_G3_LIVE_VALIDATION_RUNBOOK.md`.
- These blockers affect only the live G3 proof. Engineering, deterministic fallback, browser, and security validation are complete locally.

## Next worker wave

- Commit and synchronize the independently certified G6 checkpoint on `main`.
- Continue M7 repository, judge, demo, rollback, and submission documentation
  without live OpenAI calls.
- Create/link the Vercel project only after the G6 checkpoint is clean, configure
  generation disabled by default, deploy and verify a preview, then request
  explicit production-deployment authorization.
