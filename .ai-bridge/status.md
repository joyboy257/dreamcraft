# DreamCraft Mission Status

> The root Sol thread updates this file at each milestone gate. Replace placeholders with evidence.

## Baseline

- Date/time: 2026-07-16 (Asia/Singapore)
- Branch / commit: `main`; G3 synchronized at `5baa437`; G4 engineering changes awaiting the validated checkpoint commit
- Remote: `git@github.com:joyboy257/dreamcraft.git`; authenticated owner permission confirmed with `gh`
- Working tree: validated G4 engineering changes pending checkpoint commit
- Node / package manager: Node `24.18.0`; project-pinned pnpm `11.13.0` via Corepack
- Existing implementation summary: remote contained one product `README.md` and no runnable code; README preserved byte-for-byte during pack installation
- Detected tooling: npm `11.16.0`, Chromium CLI, Google Chrome, Safari, GitHub CLI
- Missing prerequisites: live G3 proof requires a rotated/funded OpenAI project key and explicit authorization; deployment is deliberately deferred until local release certification
- Deviations from pack assumptions: mounted repository initially had no `origin`; it was safely connected to the verified non-empty remote and fast-forwarded to `origin/main`

## Active milestone

- Milestone: M4 — Dream richness and game feel
- Work items: DC-WI-040 through DC-WI-044; Gate G4
- Goal: preserve generated mechanical, visual, atmospheric, audio, and staging differences in the trusted runtime
- Gate state: **engineering-complete / independently recertified PASS**
- Owners/agents: root integration plus physics, EntityKit, atmosphere/audio implementers and an independent architecture reviewer; no live request authorized

## Working user-visible behavior

- [x] Application boots
- [x] Voxel shell playable
- [x] Dummy DreamSpec completes
- [ ] Live generation proof (engineering path complete; ten-prompt live evidence pending)
- [x] Local fallback works
- [x] Procedural hero entity readable
- [x] Generated story ending works
- [ ] Mobile reduced-quality path works
- [ ] Public deployment works

## Verification evidence

| Check | Command / route | Result | Evidence |
|---|---|---|---|
| Fresh clone | local `git clone --no-local`, then frozen install and full G0 suite | Pass | isolated clone of `8f0e888`; install/typecheck/lint/test/eval/build/e2e/pack validation all passed |
| Typecheck | `corepack pnpm typecheck` | Pass | strict TypeScript across client, server, API handler, and tests, 2026-07-15 |
| Lint | `corepack pnpm lint` | Pass, zero warnings | ESLint 10 + typed rules |
| Unit/integration tests | `corepack pnpm test` | Pass, 184/184 | includes G3 mocked failure coverage plus G4 physical PlayGraph input adapters, atomic dialogue branching, node-scoped response resolution, `any` physical alternatives, optional-beat priority, branching endings, physics, EntityKit, crumble/respawn, camera targeting, atmosphere/audio, staging, and scenario coverage |
| Browser smoke | `corepack pnpm e2e` | Pass, 2/2 Chromium | API-disabled same-origin route, stable-fragment messaging, playable entry, reload, console/page/network errors clean; six required G4 dreams reach playable state and produce six unique canvas render hashes |
| Dream evals | `corepack pnpm eval` | Pass, 5/5 | six-dream G4 distinction gate, representative compiler corpus, hostile path budget, and ten-prompt mocked single/director benchmark |
| Production build | `corepack pnpm build` | Pass | Vite 8 output; 269.75 kB main gzip; existing 500 kB minified chunk advisory remains for G6 |
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

## Known issues

| Severity | Issue | Owner | Next action |
|---|---|---|---|
| Low | Vite reports the client entry chunk above its 500 kB minified advisory threshold | Root/engine | Reassess code splitting during G6; G3 gzip is 249.56 kB and current functionality passes |
| Low | In-memory application rate limiting is per serverless instance | Root/release | Pair with Vercel platform/WAF rate protection before public production traffic |
| Low | Browser E2E does not directly assert pointer-locked movement, jumping, collision, or block editing | Root/QA | Add focused browser instrumentation during G6; source review and unit tests cover G1 |
| Low | Comfort controls do not yet propagate live FOV and mouse-sensitivity changes into the engine; mute and reduced-motion are wired | Root/UI | Complete remaining control propagation during G5/G6 accessibility work |
| Low | Chunk generation/meshing is bounded to one job per frame but remains on the main thread | Root/engine | Add worker offload during the G6 performance pass if thresholds require it |

## External blockers

- The existing development key must be rotated because its value appeared in local validator output. Do not add credit to that key.
- The replacement OpenAI project needs up to `$10` credit and explicit authorization before the locked ten-prompt proof. Projected maximum spend is `$9.35`; see `docs/13_G3_LIVE_VALIDATION_RUNBOOK.md`.
- These blockers affect only the live G3 proof. Engineering, deterministic fallback, browser, and security validation are complete locally.

## Next worker wave

- Commit and synchronize the independently reviewed G4 checkpoint on `main`.
- Continue M5–M6 local product polish, accessibility, performance, and release certification without live OpenAI calls.
- After G6 is certified, create/link the Vercel project, configure secrets server-side, deploy and verify a preview, then request explicit production-deployment authorization.
