# DreamCraft Mission Status

> The root Sol thread updates this file at each milestone gate. Replace placeholders with evidence.

## Baseline

- Date/time: 2026-07-17 (Asia/Singapore)
- Branch / base commit: `main` synchronized with `origin/main` at `3264b22` (G7.1 semantic-grounding merge)
- Remote: `git@github.com:joyboy257/dreamcraft.git`; authenticated owner permission confirmed with `gh`
- Release-candidate state: G7.1 is merged and Ready at `https://dreamcraft-psi.vercel.app`; production retains the API-disabled policy, while physical-device and live-proof gates remain pending
- Node / package manager: Node `24.18.0`; project-pinned pnpm `11.13.0` via Corepack
- Existing implementation summary: remote contained one product `README.md` and no runnable code; README preserved byte-for-byte during pack installation
- Detected tooling: npm `11.16.0`, Chromium CLI, Google Chrome, Safari, GitHub CLI
- Missing prerequisites: physical-device/second-device/incognito/slow-network proof; live G3 proof needs a rotated/funded OpenAI project key and separate explicit authorization; repository license adoption needs owner approval
- Deviations from pack assumptions: mounted repository initially had no `origin`; it was safely connected to the verified non-empty remote and fast-forwarded to `origin/main`

## Active milestone

- Milestone: M7 — Deployment and hackathon submission
- Work items: DC-WI-070 through DC-WI-073; Gate G7
- Goal: retain the verified API-disabled production release and complete the remaining physical/device, legal, and separately-authorized live-proof gates
- Gate state: **G7.1 engineering-complete / protected-main merged / production Ready / human-proof-pending; Gate G7 not complete**
- Owners/agents: Sol integration/release authority, sequential Luna implementation/documentation, and Terra security/gate verification; production `dpl_7z7JgqQfRcbeae2DHPJAXFfPqyrr` is Ready, Git integration remains disconnected, and live requests remain unauthorized

## Working user-visible behavior

- [x] Application boots
- [x] Voxel shell playable
- [x] Dummy DreamSpec completes
- [ ] Live generation proof (engineering path complete; ten-prompt live evidence pending)
- [x] Local fallback works
- [x] Procedural hero entity readable
- [x] Generated story ending works
- [x] Mobile reduced-quality path works
- [x] Public generation-disabled deployment works

## Verification evidence

| Check | Command / route | Result | Evidence |
|---|---|---|---|
| Fresh clone | local `git clone --no-local`, then frozen install and full G0 suite | Pass | isolated clone of `8f0e888`; install/typecheck/lint/test/eval/build/e2e/pack validation all passed |
| Typecheck | `corepack pnpm typecheck` | Pass | strict TypeScript across client, server, API handler, and tests, 2026-07-16 |
| Lint | `corepack pnpm lint` | Pass, zero warnings | ESLint 10 + typed rules |
| Unit/integration tests | `corepack pnpm test` | Pass, 54 files and 216/216 tests | includes G7.1 semantic anchors, bounded voxel structures, entity instances, semantic objectives, and all prior G0–G7 coverage |
| Deployed-smoke validator | `corepack pnpm test:smoke-deployed` | Pass, 4/4 Node tests | validates safe URL handling, generation-disabled fail-closed behavior, deterministic fallback checks, CORS/header checks, and error redaction without contacting a deployment |
| Focused independent verification | changed-path unit, integration, security, and hostile suites | Pass, 44/44 tests | independent Terra rerun before the G6 verdict |
| Browser smoke | `corepack pnpm test:e2e` plus explicit mobile rerun | Pass, 9/9 Playwright journeys | desktop and mobile journeys, semantic-objective discoverability, twenty prompts in one page, accessibility/comfort, WebGL recovery, and measured desktop/mobile budgets |
| Production PWA | `corepack pnpm test:pwa` | Pass, 1/1 Chromium | Sol reran production service-worker control, manifest and hashed shell caching, then the usable input shell offline reload on the final G7 candidate |
| Dream evals | `corepack pnpm eval` | Pass, 5 files and 8/8 tests | adds moonlit-kitchen, flooded-school, and lottery-family G7.1 fidelity evaluation with 100% high-priority anchor coverage and a generic-beacon regression guard |
| Production build | `corepack pnpm build` | Pass | Vite 8 JavaScript output 980.52 kB raw / 271.31 kB gzip; the raw 500 kB advisory remains nonblocking because documented runtime budgets pass |
| Performance | deterministic desktop balanced and Pixel 7 reduced-profile browser metrics | Pass | desktop 119 FPS / 16.7 ms p95 / 23 draws / 11,738 triangles; reduced mobile 120 FPS / 9.1 ms p95 / 18 draws / 7,628 triangles; chunk work below 5 ms p95 and three-lifecycle heap growth approximately 6.7% |
| Dependency/security checks | `corepack pnpm audit --prod`; pack validator; service-worker syntax; sequential repository hardening plus independent Terra gate review | Pass | zero known vulnerabilities, zero High/Critical findings, restrictive deployment-header configuration, API responses excluded from caches, and no secret-pattern hit; this was not claimed as an exhaustive multi-agent security scan |
| G7 release-security review | exact-origin, health/smoke, CI action pins, Vercel bounds/headers, live-script safety | Terra PASS | no Critical/High finding; Checkout and Setup Node use immutable SHAs, credentials are not persisted, and CI contains no deploy/upload step |
| G7 complete local matrix | full serialized release commands on the final candidate | Terra post-fix PASS | typecheck/lint, 202/202 unit/integration, 4/4 smoke validator, 6/6 eval, direct build, 9/9 E2E, 1/1 PWA, pack/script/SW syntax, zero-vulnerability audit, and diff check all passed |
| Install integrity | `corepack pnpm install --frozen-lockfile` | Pass | 222 lock entries pass supply-chain policy; OpenAI SDK pinned to mature `6.46.0` |
| G7.1 protected release | PR #2 / `release-checks` | Pass | `3264b22` merged after hosted typecheck, lint, tests, evals, Chromium, PWA, pack, service-worker, and audit checks |
| G7.1 production deployment | Vercel `dpl_7z7JgqQfRcbeae2DHPJAXFfPqyrr` | Ready | aliases include `https://dreamcraft-psi.vercel.app`; deployment used existing encrypted API-disabled environment policy and added no key |

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
- Vercel project `dreamcraft` was subsequently linked with Git integration
  disconnected. The original preview-intended attempt failed before application
  output because a nested PATH pnpm 10.28 violated the pnpm 11 engine; its
  record was removed. The repaired `--target=preview` attempt built Ready, but
  Vercel classified the first successful deployment in the new project as
  production and assigned a production alias. It was immediately removed without
  an HTTP application/API request. Vercel's documented first-deployment
  promotion means an explicitly authorized first successful production-target
  deployment is now required before a preview can be proven.
- Preview and Production each contain exactly seven safe non-secret settings:
  generation disabled, director disabled, `single-sol`, character/body/deadline
  bounds, and debug metrics disabled. Neither environment has `OPENAI_API_KEY`.
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
- Gate G6 was committed and synchronized with `origin/main` at `112d3da`.
- The local G7 candidate adds `GET /api/health`, a fail-closed deployed smoke
  validator, immutable-pinned GitHub CI actions, and explicit bounds for both
  Vercel functions; real preview-edge behavior is not yet claimed.
- `POST /api/dream` now requires an exact same-origin `Origin` before rate
  limiting, parsing, or generation. The live validator and deployed smoke send
  that header deliberately; preview-edge verification remains.
- Repository readiness now includes a judge-facing README, direct dependency
  notices, an approval-ready but unadopted MIT draft, release/rollback runbook,
  under-three-minute voiceover/shot list, judge guide, and honest submission
  placeholders.
- Terra returned PASS for G7 release security, including exact same-origin
  enforcement and immutable GitHub Action pins. Sol then reran the complete
  serialized release matrix and certified the local candidate.
- G7.1 preserves source phrases, representation kind, gameplay role, importance,
  and visible-presence requirements through the compiler; it voxel-materializes
  bounded DreamSpec structures, materializes entity instances, and binds
  objectives to semantic targets. Evidence:
  `docs/21_G7_1_SEMANTIC_GROUNDING_EVIDENCE.md`.
- PR #2 passed hosted `release-checks` and merged through protected `main` at
  `3264b22`. Vercel deployment `dpl_7z7JgqQfRcbeae2DHPJAXFfPqyrr` is Ready at
  `https://dreamcraft-psi.vercel.app`; no live OpenAI call was made.

## Known issues

| Severity | Issue | Owner | Next action |
|---|---|---|---|
| Low | Vite reports the 980.52 kB raw client entry chunk above its 500 kB advisory threshold | Root/engine | Reassess code splitting before release only if it materially improves loading; current gzip is 271.31 kB and measured runtime budgets pass |
| Medium | In-memory application rate limiting is per serverless instance | Root/release | Configure Vercel Firewall/shared rate protection or approve a distributed limiter before public live generation |
| Low | Exact same-origin enforcement is locally certified but not yet verified at the Vercel edge | Release | Probe missing, foreign, and exact origins against the generation-disabled preview |
| Resolved | First successful Vercel deployment required production promotion | Release | Explicit authorization was supplied; production `dpl_7z7JgqQfRcbeae2DHPJAXFfPqyrr` is Ready and retains the API-disabled policy |
| Low | Automated Pixel 7 Chromium proves touch paths and reduced-profile budgets but not physical-device ergonomics, GPU-driver behavior, or thermals | Root/QA | Confirm on the physical demo device during G7 release verification |
| Low | PWA shell changes can remain stale if the service-worker cache name is not version-bumped | Root/release | Require a cache-version bump whenever cached shell behavior or assets change |
| Low | Chunk generation/meshing remains on the main thread | Root/engine | Keep the measured sub-5 ms p95 guard; add worker offload only if future content breaks it |
| Informational | WebGL context loss/restoration is event-tested, but actual recovery depends on the device and GPU driver | Root/QA | Verify the actionable recovery/return path on the physical demo device |

## External blockers

- The existing development key must be rotated because its value appeared in local validator output. Do not add credit to that key.
- The replacement OpenAI project needs up to `$10` credit and explicit authorization before the locked ten-prompt proof. Projected maximum spend is `$9.45`; see `docs/13_G3_LIVE_VALIDATION_RUNBOOK.md`.
- MIT adoption requires owner legal approval; `LICENSE-MIT-DRAFT.md` is intentionally not an adopted `LICENSE` file.
- Public deployment/video URLs, team display names, and the primary Sol `/feedback` session ID remain human submission placeholders.
- Live-key blockers affect only the live G3 proof; deterministic fallback and G0–G6 engineering remain complete locally.

## Next worker wave

- Keep production API-disabled until the replacement funded key and separate
  live-proof authorization are supplied.
- Capture physical handset/second-device/incognito evidence and make the MIT
  legal adoption decision before claiming Gate G7 complete.
