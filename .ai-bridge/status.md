# DreamCraft Mission Status

> The root Sol thread updates this file at each milestone gate. Replace placeholders with evidence.

## Baseline

- Date/time: 2026-07-15 (Asia/Singapore)
- Branch / commit: `main` at pushed G1 commit `8d91b90694fce568c10cbc7c9e36c97b6a0198de`, synchronized with `origin/main`
- Remote: `git@github.com:joyboy257/dreamcraft.git`; authenticated owner permission confirmed with `gh`
- Working tree: G1 is checkpointed and pushed; isolated G2 DreamSpec work is active locally
- Node / package manager: Node `24.18.0`; project-pinned pnpm `11.13.0` via Corepack
- Existing implementation summary: remote contained one product `README.md` and no runnable code; README preserved byte-for-byte during pack installation
- Detected tooling: npm `11.16.0`, Chromium CLI, Google Chrome, Safari, GitHub CLI
- Missing prerequisites: none for G0; Playwright-managed Chromium is installed. Live model and deployment credentials are intentionally deferred and not required for deterministic boot.
- Deviations from pack assumptions: mounted repository initially had no `origin`; it was safely connected to the verified non-empty remote and fast-forwarded to `origin/main`

## Active milestone

- Milestone: M2 — DreamSpec and trusted compilers
- Work items: DC-WI-020 through DC-WI-026; Gate G2
- Goal: validate, sanitize, safely repair, compile, and locally generate representative declarative DreamSpecs without crashes or executable content
- Owners/agents: root Sol integration; bounded DreamSpec compiler worker complete; independent G2 review follows integration

## Working user-visible behavior

- [x] Application boots
- [x] Voxel shell playable
- [ ] Dummy DreamSpec completes
- [ ] Live generation works
- [ ] Local fallback works
- [x] Procedural hero entity readable
- [x] Generated story ending works
- [ ] Mobile reduced-quality path works
- [ ] Public deployment works

## Verification evidence

| Check | Command / route | Result | Evidence |
|---|---|---|---|
| Fresh clone | local `git clone --no-local`, then frozen install and full G0 suite | Pass | isolated clone of `8f0e888`; install/typecheck/lint/test/eval/build/e2e/pack validation all passed |
| Typecheck | `corepack pnpm typecheck` | Pass | strict TypeScript across the G1 checkpoint, 2026-07-15 |
| Lint | `corepack pnpm lint` | Pass, zero warnings | ESLint 10 + typed rules |
| Unit tests | `corepack pnpm test` | Pass, 49/49 at G1 checkpoint | chunk math/storage/meshing/streaming, motor/collision, block interaction, runtime metrics, entity, gameplay arc, UI model, local preview, public-env boundary, eval |
| Browser smoke | `corepack pnpm test:e2e` plus headed CLI inspection | Pass; landing, canvas entry, guide, dialogue, objective, beacon, ending, reload, console, page errors, failed requests, and HTTP failures clean | `output/playwright/g1-entry.png`; `output/playwright/g1-playable.png` |
| Dream evals | `corepack pnpm eval` | Pass, 1/1 G0 local strategy eval | 3 deterministic distinct samples |
| Production build | `corepack pnpm build` | Pass | Vite 8 production output; 208.29 kB main gzip |
| Performance | focused metrics tests + headed render inspection | Pass for G1 gate | combined per-chunk geometry, bounded one-job-per-frame scheduling, quality tiers, disposal, and runtime metric recorder |
| Security review | `corepack pnpm audit --audit-level high` + secret scan | Pass | no known advisories; no embedded credential patterns |

## Recent decisions or deviations

- Selected the Node 24 line and current pnpm 11 through Corepack; the system pnpm 9 audit endpoint was retired.
- Selected lightweight React for product/error-boundary composition and Three.js for the canvas shell.
- G0 preview uses `THREE.InstancedMesh`; it does not create one mesh per decorative voxel.
- Client configuration rejects secret-like `VITE_*` names and exposes no OpenAI credential.
- Gate G0 independently reviewed, reproduced from a fresh clone, committed, and pushed to `origin/main` at `8f0e888`.
- Gate G1 independently reviewed PASS with no actionable blockers, committed, and pushed to `origin/main` at `8d91b90`.
- Manual visual inspection caught and resolved a seeded terrain wall at arrival by adding a bounded deterministic safe-spawn corridor.

## Known issues

| Severity | Issue | Owner | Next action |
|---|---|---|---|
| Low | Vite reports the initial Three.js entry chunk above its 500 kB uncompressed advisory threshold | Root/engine | Reassess code splitting with the G1 shell; gzip is 193.89 kB and G0 remains functional |
| Low | Browser E2E does not directly assert pointer-locked movement, jumping, collision, or block editing | Root/QA | Add focused browser instrumentation during G6; source review and unit tests cover G1 |
| Low | Comfort controls do not yet propagate FOV, sensitivity, and reduced-motion values into the engine | Root/UI | Wire during G5/G6 accessibility and comfort work |
| Low | Chunk generation/meshing is bounded to one job per frame but remains on the main thread | Root/engine | Add worker offload during the G6 performance pass if thresholds require it |

## External blockers

- None yet.

## Next worker wave

- Agent: root integrates the completed `dream_compiler` lane; independent reviewer verifies G2 before checkpoint
- Bounded task: connect the serializable compiled descriptor and mock-local/fallback provider to representative fixtures and the runtime adapter without live model credentials
- Owned paths: `src/dream/**`, root integration/contracts, eval fixtures; live server/API route remains a distinct G3 slice
- Return criteria: representative valid/malformed/over-budget fixtures compile or safely repair, full suite passes, review PASS, checkpoint pushed
