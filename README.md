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

## Planned build scope

- Natural-language dream input
- AI-generated dream/world plan
- Playable stylised 3D environment
- Dream-specific interactions, objective, and ending
- Dynamic dialogue and environmental storytelling
- A responsive, shareable browser demo

## Status

Active hackathon development. The repository will document setup, architecture, and the ways Codex and GPT-5.6 accelerated the build as implementation lands.

## Development

The first deterministic local scaffold is runnable without an OpenAI API key.

Requirements:

- Node.js `24.18.0` (see `.nvmrc` and `.node-version`)
- Corepack, included with the supported Node release

From a fresh clone:

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

Open `http://localhost:5173`. The current G0 shell renders an instanced Three.js
voxel preview and can stabilize the same dream text to the same local seed.

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
browser. Live DreamSpec generation is added after the deterministic vertical
slice is stable.

## License

License selection is pending before the first public implementation release.
