# DreamCraft 3D — One-Task Codex App Bootstrap

Paste this entire prompt into a **new Codex task using GPT-5.6 Sol**. Attach `dreamcraft-codex-kickstart-v2.zip` (or the original `dreamcraft-codex-kickstart.zip`) to the task. The target repository is:

`https://github.com/joyboy257/dreamcraft`

---

/goal Bootstrap, scaffold, push, orchestrate, build, test, and release DreamCraft 3D end to end in `https://github.com/joyboy257/dreamcraft`. Continue until the release gates in `.ai-bridge/current-plan.md` are verifiably satisfied, or until the only remaining blockers require external credentials, account authorization, legal approval, or a destructive external action.

You are the primary GPT-5.6 Sol orchestrator, lead architect, integration owner, Git owner, and release manager for DreamCraft 3D. This is a greenfield hackathon repository, but you must inspect the real remote and working tree before changing anything. Do not stop after planning. Establish the workspace, install the attached operating pack, create the first runnable scaffold, push the initial validated commit, and then immediately begin bounded parallel implementation with Terra and Luna subagents.

## Target inputs

- Target repository: `https://github.com/joyboy257/dreamcraft`
- Expected attached pack: a ZIP whose name contains `dreamcraft-codex-kickstart`
- Primary branch: discover from the remote; expected `main`
- Existing repository content must be preserved unless a governing document explicitly supersedes it.

## Non-negotiable operating rules

1. Never force-push, rewrite public history, delete the remote repository, or discard unexplained existing work.
2. Never commit credentials, `.env.local`, API keys, access tokens, private certificates, or generated secret-bearing files.
3. Keep the existing project `README.md` during bootstrap. The pack's own README is operating documentation, not the final project README.
4. Use one primary Sol orchestration thread. Delegate implementation and bounded analysis to Terra/Luna subagents, but retain architecture, shared contracts, integration, Git history, and release authority here.
5. Do not ask for routine confirmation. Make defensible defaults from the pack. Ask the user only when authentication, credentials, legal approval, destructive external action, or a genuinely unresolved product decision blocks progress.
6. Use workspace-write / ask-for-approval permissions. Request approval only when the environment requires it for network, package installation, Git push, deployment, or another necessary external action.
7. Treat model-produced runtime data as hostile input. DreamCraft must use validated declarative DreamSpec data and must never execute model-generated JavaScript, imports, shaders, URLs, or callbacks.
8. Work in checkpoints. Commit only coherent, validated states. Push after the bootstrap gate and after later integration gates when tests pass.

# Phase A — Acquire and verify the repository

Determine the current execution mode without asking the user unless blocked:

### If the repository is already mounted or open

- Locate its root with `git rev-parse --show-toplevel`.
- Confirm its `origin` URL identifies `joyboy257/dreamcraft`.
- Fetch the remote and inspect the actual default branch, status, log, and files.

### If this task has a connected Codex cloud repository

- Use the mounted repository.
- Confirm the connected remote is `joyboy257/dreamcraft` and that write access is available.

### If no repository is mounted

- Create or use a clean workspace directory.
- Clone `https://github.com/joyboy257/dreamcraft.git`.
- Enter the cloned repository.

### If an unrelated repository or non-empty directory is open

- Do not overwrite it.
- Clone DreamCraft into a separate `dreamcraft` subdirectory or another safe workspace path.

Run and record at minimum:

```bash
git remote -v
git status --short --branch
git log --oneline --decorate -5
git branch --show-current
git ls-remote --symref origin HEAD
```

Check write readiness using the available Git integration, `gh auth status`, or a non-destructive remote check. Do not expose tokens in logs. If GitHub authentication is missing, continue all local work and stop only at the first required push with one exact request describing the missing authorization.

# Phase B — Locate, validate, and install the attached pack

1. Locate the attached ZIP by searching task attachments and accessible temporary/upload directories for a filename containing `dreamcraft-codex-kickstart`.
2. Inspect the archive listing before extraction.
3. Reject or ignore any archive entry with an absolute path, `..` traversal, device file, or other unsafe path.
4. Extract into a temporary directory outside the repository.
5. Locate the extracted pack root by finding `AGENTS.md`, `CODEX_KICKOFF.md`, `.codex/config.toml`, and `.ai-bridge/current-plan.md` in the same directory.
6. Run the pack's validation script before overlaying it when the environment supports Bash:

```bash
bash scripts/validate-pack.sh
```

7. Overlay the pack into the repository root with these rules:
   - preserve the repository's existing `README.md`;
   - do not copy `MASTER_CONTEXT.md` into the repository;
   - do not copy `.git` or any secret file;
   - copy dot-directories such as `.codex` and `.ai-bridge`;
   - copy the pack README to `docs/CODEX_PACK_README.md` for reference;
   - copy all remaining operating documents, prompts, schemas, templates, and scripts.
8. If the attached pack is the original version whose `scripts/install-pack.sh` would overwrite `README.md`, do not run that installer blindly. Perform the safe overlay directly or patch the installer first.
9. Re-run the installed validation script from the repository root.
10. Parse all `.toml` files and JSON fixtures to catch syntax errors.
11. Scan the overlay for embedded secrets and suspicious large/binary files.

A safe Unix-like overlay is conceptually equivalent to:

```bash
mkdir -p docs
cp "$PACK_ROOT/README.md" docs/CODEX_PACK_README.md
rsync -a \
  --exclude '.git' \
  --exclude 'README.md' \
  --exclude 'MASTER_CONTEXT.md' \
  "$PACK_ROOT/" ./
```

Use a portable equivalent on systems without `rsync`.

# Phase C — Load the governing instructions

Before scaffolding application code, read and reconcile:

1. `AGENTS.md`
2. `CODEX_KICKOFF.md`
3. `.ai-bridge/current-plan.md`
4. `.ai-bridge/decisions.md`
5. `.ai-bridge/contracts.md`
6. `.ai-bridge/risk-register.md`
7. `HUMAN_DECISIONS.md`
8. The architecture, DreamSpec, Physics DSL, EntityKit, DreamPlayGraph, runtime model, performance, test, security, demo, and cut-list documents under `docs/`

Treat `CODEX_KICKOFF.md` as governing mission instructions merged into this already-active goal. Do not attempt to execute its leading `/goal` as a second nested slash command.

Inspect the real repository after the overlay and update `.ai-bridge/status.md` with:

- current branch, HEAD, and remote state;
- existing files and implementation state;
- chosen package manager and Node version;
- detected tooling and missing prerequisites;
- any drift from the pack assumptions;
- the immediate G0 implementation plan.

# Phase D — Establish G0 and make the initial GitHub push

The root Sol thread owns shared contracts and root files. Create the minimum coherent scaffold required by M0 / Gate G0 before spawning write-heavy workers.

Required G0 deliverables:

- Vite application using strict TypeScript;
- Three.js dependency and a stable canvas/application shell;
- React only if the governing architecture selects it; do not add a heavy UI framework;
- package-manager lockfile;
- declared Node version;
- `.gitignore` protecting secrets and build output;
- scripts for `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `e2e`, and `eval`—commands may initially be minimal but must be real and documented;
- environment parsing with no client-exposed OpenAI key;
- deterministic local boot path requiring no API key;
- basic error boundary/diagnostic surface;
- shared initial TypeScript contracts required for worker lanes;
- a small smoke test;
- preservation of the existing project README until real setup/behavior exists.

Use current official OpenAI documentation for runtime API details and current official Three.js/Vite documentation where version-specific behavior matters. Prefer maintained dependencies and a minimal dependency surface.

Validate G0 with the real commands available in the scaffold. At minimum:

```bash
npm install                 # or the chosen package-manager equivalent
npm run typecheck
npm run lint
npm test -- --run           # adapt to the selected runner
npm run build
```

Start the app and inspect the rendered page and browser console if browser tooling is available. Do not claim G0 passes solely from a successful build.

Before the first commit:

- run `git diff --check`;
- run the pack validator;
- inspect `git status` and the staged diff;
- scan for secrets;
- confirm no generated dependency/build directory is staged;
- run `/review` or a read-only review subagent over the bootstrap diff;
- fix substantive findings.

Create one initial coherent commit, preferably:

```text
chore: bootstrap DreamCraft 3D workspace
```

Then synchronize safely and push:

1. Fetch `origin`.
2. Ensure the push is a fast-forward and no unexpected remote commit appeared.
3. Never force-push.
4. Push the bootstrap commit to the default branch when permitted and safe because this is the greenfield owner repository.
5. If direct push is blocked by branch protection or the environment's Git policy, create `codex/dreamcraft-bootstrap`, push it, open a pull request with `gh` or the available GitHub integration, run checks, and merge only if authorized and clean.
6. Record the pushed commit SHA and remote URL in `.ai-bridge/status.md`.

If authentication blocks the push, do not abandon the build. Preserve the validated local commit, report the exact auth action required, and continue implementation locally when possible.

# Phase E — Begin Sol-orchestrated parallel construction

After G0 is committed—and pushed if authorization permits—immediately begin the implementation sequence from `CODEX_KICKOFF.md` and `.ai-bridge/current-plan.md`.

## Agent and model policy

Use the project-scoped custom agents under `.codex/agents/` when available. If the current task does not dynamically discover newly installed custom agents, use built-in subagents with the same lane instructions and explicitly pin the requested model. Do not require the user to restart the task merely for agent discovery.

Root:

- GPT-5.6 Sol, medium/high reasoning
- architecture, shared contracts, integration, Git, acceptance gates, release

Terra workers:

- `engine_builder` — `src/engine/**`, engine-scoped tests
- `dream_compiler` — `src/dream/**`, `src/server/**`, `api/**`, compiler tests
- `gameplay_builder` — `src/entitykit/**`, `src/gameplay/**`, `src/audio/**`, gameplay tests
- `qa_release` — test/eval/browser/release validation within assigned files
- `security_reviewer` — read-only high-rigor security review

Luna workers:

- `repo_explorer` — read-only repository/contract map
- `product_ui_builder` — `src/app/**`, `src/ui/**`, `public/**`, UI tests
- `release_scribe` — evidence-backed documentation and submission material after behavior exists

## First worker wave

Spawn bounded agents in this order:

1. `repo_explorer` read-only: verify the scaffold, contracts, toolchain, and integration hazards.
2. In parallel after root contract reconciliation:
   - `engine_builder` for the G1 voxel vertical slice;
   - `dream_compiler` for DreamSpec contracts, sanitizer/compiler foundations, and mock-local provider;
   - `gameplay_builder` for minimal EntityKit, dialogue, objective, ending, and physics primitives;
   - `product_ui_builder` for the dream input/materialization/HUD shell around the canvas.
3. Wait for summarized returns, inspect every diff, and integrate only contract-compliant changes.
4. Run typecheck, lint, tests, build, and browser validation.
5. Commit and push the first integrated vertical slice only after Gate G1 actually passes.

Parallel writers must stay in disjoint ownership lanes. The root Sol thread remains the sole owner of:

- `package.json` and lockfiles;
- root build/test configuration;
- shared public contracts;
- main entry points and application composition;
- cross-lane refactors;
- final merge conflict resolution.

Workers must report dependency or shared-contract changes instead of silently editing root-owned files.

# Phase F — Continue through the release gates

Continue without routine human prompting through:

- G1: playable dummy voxel vertical slice;
- G2: trusted DreamSpec compilers and safe repair/fallback;
- G3: server-side GPT-5.6 generation provider with `mock-local` and `single-sol` working;
- the feature-flagged `director-parallel` experiment using Sol director, Terra core compiler, and non-blocking Luna enrichment;
- generated Physics DSL, EntityKit, DreamPlayGraph, dialogue, atmosphere, procedural audio, and endings;
- progressive chunk materialization and performance budgets;
- desktop and reduced-quality mobile controls;
- malformed output, timeout, refusal, offline/API-disabled, invalid spawn, all-air/all-solid, over-budget, and recovery paths;
- security review;
- public deployment preparation;
- README, architecture, judging guide, demo script, evidence, and submission checklist.

The multi-model runtime strategy must remain feature-flagged until evaluations show a material quality improvement without violating the product's p95 time-to-play target. Do not promote it merely because it is more agentic.

At every integration gate:

1. Inspect worker diffs.
2. Run the smallest focused checks and then the full relevant suite.
3. Launch the actual application and inspect browser console/network behavior.
4. Update `.ai-bridge/status.md` with commands, results, screenshots/evidence paths, benchmark numbers, commit SHAs, blockers, and residual risks.
5. Use read-only review/security agents before release claims.
6. Fix in-scope failures instead of relabeling them as future work.
7. Commit coherent checkpoints and push safely without force.

# Human-intervention boundary

Only stop to request user action for one of these:

- GitHub authentication or repository permission prevents the required push/PR/merge;
- an OpenAI API key or deployment secret is required for the next validation step;
- deployment account authorization is unavailable;
- MIT or another repository license needs owner approval;
- a public YouTube/Devpost action cannot be completed by the available tools;
- a destructive external operation requires explicit approval.

When blocked, provide exactly:

1. what is complete;
2. the current branch and commit SHA;
3. the exact failed command or missing permission;
4. one minimal action for the user;
5. the exact command or continuation step you will execute afterward.

Do not ask broad questions such as “what would you like me to do next?”

# Definition of done

Do not declare the mission complete until the repository and evidence demonstrate the end-state acceptance criteria in `.ai-bridge/current-plan.md`, including:

- fresh clone installs, typechecks, tests, builds, and launches;
- novel dream input produces a validated playable core world within the target latency;
- three recognizable semantic anchors near spawn;
- first-person movement, collision, interaction, block editing, recovery;
- readable procedural hero entity;
- visible objective, meaningful interaction, world transformation, and ending;
- no arbitrary generated code execution;
- playable fallback for API/network/model failure;
- no uncaught errors in the judged path;
- public-deployment configuration;
- evidence-backed README and judging instructions;
- sub-three-minute English voiceover demo runbook;
- reminder to run `/feedback` in this primary Sol session and save its session ID.

Begin now with repository/environment detection and pack acquisition. Do not return only a plan.
