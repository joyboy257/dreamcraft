# Start Here

## Recommended: one Codex task

1. Open a new **Codex** task in the ChatGPT desktop app, or a Codex cloud task connected to `joyboy257/dreamcraft`.
2. Select **GPT-5.6 Sol** with medium or high reasoning.
3. Use workspace-write / ask-for-approval permissions.
4. Attach `dreamcraft-codex-kickstart-v2.zip`.
5. Paste `CODEX_APP_BOOTSTRAP.md` in full.

That single prompt tells Sol to:

- locate, mount, or clone the correct repository;
- verify GitHub write access without exposing credentials;
- validate and safely overlay this pack while preserving the existing project README;
- read the architecture and continuing kickoff contract;
- scaffold Gate G0;
- test, review, commit, and make the first safe GitHub push;
- spawn bounded Terra and Luna workers;
- integrate and continue through the release gates.

The only expected human interruption is for missing GitHub authentication, runtime/deployment secrets, legal approval, or public submission actions.

## Manual route

### 1. Install the pack into a local clone

```bash
git clone https://github.com/joyboy257/dreamcraft.git
cd dreamcraft
unzip /path/to/dreamcraft-codex-kickstart-v2.zip -d /tmp/dreamcraft-pack
/tmp/dreamcraft-pack/dreamcraft-codex-kickstart-v2/scripts/install-pack.sh "$PWD"
```

The installer preserves the repository's existing `README.md`, copies the pack guide to `docs/CODEX_PACK_README.md`, and includes `.codex` and `.ai-bridge`.

Do not copy secrets. Do not commit a real `.env` or `.env.local` file.

### 2. Confirm the repository boundary

```bash
git status --short --branch
git remote -v
git log -1 --oneline
```

### 3. Start the primary Sol session

CLI:

```bash
codex -m gpt-5.6-sol
```

Desktop app:

1. Open the repository as a Codex project.
2. Select Sol.
3. Use medium or high reasoning.
4. Select workspace-write with on-request approvals.

### 4. Paste the continuing kickoff prompt

Paste all of `CODEX_KICKOFF.md` into the primary session.

## Keep the primary thread alive

The primary Sol thread should own:

- architecture decisions;
- shared contracts;
- integration;
- Git checkpoints;
- release gates;
- final evidence;
- the hackathon `/feedback` session ID.

Subagents and worktrees are encouraged, but unrelated top-level build conversations make integration and submission evidence harder.

## Supply secrets only when requested

Local `.env.local` example:

```bash
OPENAI_API_KEY=replace_me
OPENAI_RUNTIME_MODEL=gpt-5.6-sol
DREAMCRAFT_GENERATION_STRATEGY=single-sol
```

Never paste a key into a prompt, issue, commit, screenshot, or demo video.

## Record evidence as milestones pass

Capture short clips when these first work:

- walking and collision;
- dummy DreamSpec loading;
- first model-generated world;
- first generated dialogue and ending;
- fallback with the API disabled.

## Preserve the cut line

The core release does not require multiplayer, crafting, infinite worlds, native iOS rendering, real-time LLM NPC chat, arbitrary generated code, or image-generated textures.

## Final human actions

Once Codex reports the release gates passing:

- approve the repository license;
- configure production secrets;
- verify the public deployment from incognito and a second device;
- record and upload the public demo video;
- run `/feedback` in the primary Sol session and save the session ID;
- complete the hackathon submission.
