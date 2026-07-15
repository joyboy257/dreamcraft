# DreamCraft 3D — Codex Kickstart Pack

This repository-ready pack is the operating system for building **DreamCraft 3D** with a GPT-5.6 Sol orchestrator and bounded Terra/Luna workers.

DreamCraft turns a plain-English dream into a recognizable, playable, first-person voxel experience in the browser. GPT-5.6 produces a validated declarative `DreamSpec`; a trusted TypeScript shell compiles it into terrain, physics, procedural entities, dialogue, story beats, atmosphere, and a short playable ending. The runtime never evaluates arbitrary model-generated JavaScript.

## What this pack contains

- `CODEX_APP_BOOTSTRAP.md` — the recommended one-task handoff: establish the repo, safely install the pack, scaffold, test, make the first push, and start orchestration.
- `CODEX_KICKOFF.md` — the continuing Sol orchestration contract once the pack is installed.
- `AGENTS.md` — durable project instructions Codex reads before working.
- `.codex/config.toml` — Sol root defaults and subagent controls.
- `.codex/agents/*.toml` — specialized Terra/Luna worker profiles.
- `.ai-bridge/current-plan.md` — milestone plan and acceptance gates.
- `docs/` — product, architecture, DSL, performance, security, and submission specifications.
- `prompts/` — manual worker/worktree prompts.
- `schemas/` — representative DreamSpec fixtures and evaluation cases.
- `templates/` — handoff, review, ADR, bug, test, and demo templates.

## Recommended use: one Codex task

1. Open a new Codex task using **GPT-5.6 Sol**.
2. Bind it to a writable local project or a Codex cloud environment connected to `joyboy257/dreamcraft`.
3. Attach this ZIP.
4. Paste `CODEX_APP_BOOTSTRAP.md`.

The repository URL tells Codex which project to use, but it does not itself grant write access. The task still needs a connected GitHub repository or authenticated local Git/`gh`.

The bootstrap prompt will preserve the existing project README, install the pack, establish Gate G0, review and push the first coherent commit, and then spawn Terra/Luna workers without requiring a second handoff.

## Manual overlay

Use the included safe installer:

```bash
./scripts/install-pack.sh /path/to/dreamcraft
```

It preserves the repository's existing `README.md`, copies this guide to `docs/CODEX_PACK_README.md`, excludes `MASTER_CONTEXT.md`, and copies the required dot-directories.

Then:

```bash
cd /path/to/dreamcraft
git status --short --branch
codex -m gpt-5.6-sol
```

Paste `CODEX_KICKOFF.md` into the primary session.

## Permissions

Start with:

- sandbox: `workspace-write`;
- approval policy: `on-request` / ask for approval;
- network enabled only when needed for dependency installation, current documentation, Git push, or deployment.

Do not place API keys in this pack or Git. The build must boot and support a deterministic mock/local flow before `OPENAI_API_KEY` is supplied.

## Human-only prerequisites

Codex can build and validate nearly everything. A person eventually needs to provide or approve:

1. GitHub access if it is not already connected.
2. An OpenAI API key and spend/rate-limit policy.
3. Deployment credentials or a connected deployment project.
4. A repository license; MIT is the recommended default.
5. The final public video and hackathon submission.
6. The `/feedback` session ID from the primary Sol build thread.

See `HUMAN_DECISIONS.md` for defaults and blockers.

## Build philosophy

- Browser-first and PWA-capable; native packaging deferred.
- Three.js shell with chunked voxel rendering.
- Declarative DreamSpec; no `eval`, `new Function`, generated imports, or generated shaders.
- One polished vertical slice before feature breadth.
- Progressive materialization: central chunks become playable first.
- Local fallback world when the API is unavailable.
- Recognizable semantic anchors and a completable 60–90 second arc in every generated dream.

## Definition of done

A fresh user can:

1. Open the public URL without signing in.
2. Enter a novel dream.
3. Reach a playable core world inside the target latency.
4. Recognize at least three dream-specific elements near spawn.
5. Move, interact, and meet a readable procedural entity.
6. Complete a generated objective and see an ending.
7. Enter a playable deterministic dream fragment when the model or network fails.

The full acceptance criteria are in `.ai-bridge/current-plan.md`.
