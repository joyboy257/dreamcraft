# Pack Manifest

## Minimum files Codex needs in the repository

- `AGENTS.md`
- `CODEX_APP_BOOTSTRAP.md` — one-shot Codex App bootstrap, first push, and orchestration handoff
- `CODEX_KICKOFF.md`
- `.codex/config.toml`
- `.codex/agents/`
- `.ai-bridge/current-plan.md`
- `.ai-bridge/decisions.md`
- `.ai-bridge/contracts.md`
- `docs/00_PRODUCT_NORTH_STAR.md`
- `docs/01_SYSTEM_ARCHITECTURE.md`
- `docs/02_DREAMSPEC_DSL.md`
- `docs/03_PHYSICS_DSL.md`
- `docs/04_ENTITYKIT.md`
- `docs/05_DREAMPLAYGRAPH.md`
- `docs/06_RUNTIME_MODEL_PIPELINE.md`
- `docs/09_TEST_AND_EVAL_PLAN.md`
- `docs/10_SECURITY_AND_RELIABILITY.md`

## Root files

| File | Purpose |
|---|---|
| `README.md` | Pack usage and build definition of done |
| `START_HERE.md` | Human setup sequence |
| `HUMAN_DECISIONS.md` | Credentials, license, deployment, and submission decisions |
| `AGENTS.md` | Durable repository rules automatically loaded by Codex |
| `CODEX_APP_BOOTSTRAP.md` | One-shot Codex App bootstrap, first push, and handoff |
| `CODEX_KICKOFF.md` | Primary Sol `/goal` orchestration prompt |
| `.env.example` | Safe environment variable names and defaults |
| `MASTER_CONTEXT.md` | Single-file context alternative for upload/attachment |

## Codex configuration

| Path | Role |
|---|---|
| `.codex/config.toml` | Sol root defaults, goal mode, max six direct workers |
| `.codex/agents/repo-explorer.toml` | Luna read-only repository mapper |
| `.codex/agents/engine-builder.toml` | Terra engine implementation |
| `.codex/agents/dream-compiler.toml` | Terra schema/API/compiler implementation |
| `.codex/agents/gameplay-builder.toml` | Terra Physics/EntityKit/PlayGraph implementation |
| `.codex/agents/product-ui-builder.toml` | Luna product UI/PWA implementation |
| `.codex/agents/qa-release.toml` | Terra integration QA/release validation |
| `.codex/agents/security-reviewer.toml` | Terra high-effort read-only security review |
| `.codex/agents/release-scribe.toml` | Luna release and submission writing |

## Mission control

| Path | Purpose |
|---|---|
| `.ai-bridge/current-plan.md` | Work items DC-WI-001 through DC-WI-073 and gates G0–G7 |
| `.ai-bridge/decisions.md` | Locked architecture decisions |
| `.ai-bridge/contracts.md` | Shared TypeScript boundaries and root-owned interfaces |
| `.ai-bridge/status.md` | Evidence-backed milestone status template |
| `.ai-bridge/risk-register.md` | Operational and product risk register |
| `.ai-bridge/handoff-template.md` | Worker return structure |

## Design documents

- Product north star
- System architecture
- DreamSpec DSL
- Physics DSL
- EntityKit
- DreamPlayGraph
- Runtime model pipeline
- Product UI/game feel
- Performance budgets
- Test/eval plan
- Security/reliability
- Demo/submission
- Scope cut list

## Prompt library

Manual worktree prompts for engine, compiler, gameplay, UI, QA, integration, security, demo/submission, and emergency recovery.

## Fixtures and templates

- Full representative candy-forest DreamSpec
- Eighteen varied eval prompts, including social/celebration dreams
- Acceptance matrix
- Worker/ADR/PR/bug/test/demo templates
- Third-party notices template

## Utility scripts

- `scripts/install-pack.sh /path/to/repo`
- `scripts/validate-pack.sh`
