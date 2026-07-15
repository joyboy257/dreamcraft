# DreamCraft

> Describe a dream. DreamCraft turns it into a surreal, playable world.

DreamCraft is an experimental dream-to-game experience being built for **OpenAI Build Week 2026**. A player describes a dream in natural language; DreamCraft interprets its setting, mood, characters, objectives, and strange physical rules into a playable web game.

## The experience

Dreams do not behave like ordinary places. A bedroom can become an ocean, gravity can reverse when a door opens, a familiar person can speak in riddles, and a nightmare can turn into a survival challenge.

DreamCraft is designed to make those rules playable:

1. Describe a dream in your own words.
2. Generate a game concept and a surreal world specification.
3. Enter a playable 3D world shaped by the dream's setting, atmosphere, objectives, dialogue, and physics quirks.
4. Complete the dream's central objective or discover its ending.

## Hackathon focus

DreamCraft is being built with **Codex and GPT-5.6** for the **Apps for Your Life** track.

The initial product is deliberately web-first: a polished, instantly playable browser experience. Native packaging is out of scope until the web game is complete and stable.

## Current build scope

- Natural-language dream input with three showcase prompts
- Strict, declarative DreamSpec generation and repair
- Playable bounded voxel terrain with first-person controls and block editing
- Procedural guide, interaction, objective, dialogue, and ending
- Server-only GPT-5.6 generation with a deterministic offline fallback
- Feature-flagged Sol → Terra/Luna director experiment
- Progressive core delivery, validated enrichment, and safe local caches

## Status

G3 is engineering-complete and live-proof-pending. The complete local path is
playable without an API key. Live OpenAI validation remains deliberately locked
until the owner authorizes the ten-prompt run described in
[`docs/13_G3_LIVE_VALIDATION_RUNBOOK.md`](docs/13_G3_LIVE_VALIDATION_RUNBOOK.md).

## Development

DreamCraft is runnable without an OpenAI API key.

Requirements:

- Node.js `24.18.0` (see `.nvmrc` and `.node-version`)
- Corepack, included with the supported Node release

From a fresh clone:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:5173`. Enter a dream, wait for the bounded compiler, then
enter the generated world. With the live gate disabled, the same dream and
intensity always produce the same stable local fragment.

Run the complete bootstrap checks with:

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test
corepack pnpm eval
corepack pnpm e2e
corepack pnpm build
```

Real values belong in `.env.local`, which is ignored by Git. Never expose an
OpenAI key through a `VITE_*` variable; those variables are shipped to the
browser. A key alone does not enable requests: the server also requires the
literal safety gate `DREAMCRAFT_OPENAI_ENABLED=true`.

The normal local configuration is intentionally offline:

```dotenv
OPENAI_API_KEY=
DREAMCRAFT_OPENAI_ENABLED=false
DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE=false
VITE_DREAMCRAFT_GENERATION_STRATEGY=single-sol
```

Runtime details and engineering evidence are documented in
[`docs/06_RUNTIME_MODEL_PIPELINE.md`](docs/06_RUNTIME_MODEL_PIPELINE.md) and
[`docs/14_G3_ENGINEERING_EVIDENCE.md`](docs/14_G3_ENGINEERING_EVIDENCE.md).

## License

License selection is pending before the first public implementation release.
