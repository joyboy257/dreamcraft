# Performance Budgets

## Release targets

### Desktop demo machine

- Target 60 FPS during normal play
- No sustained frame slower than 22 ms in the primary demo path
- No main-thread freeze perceptible during chunk generation
- Under approximately 100 draw calls in the typical view
- Under approximately 500,000 visible triangles in the primary scene
- Stable memory across two dream reloads

### Mobile reduced profile

- At least 30 FPS in representative Safari/Chrome test
- Render radius 2 or lower
- Device pixel ratio capped around 1.5
- No dynamic shadows by default
- Reduced particle and geometry budgets

## Latency targets

- App shell interactive: as quickly as practical after load
- Validated DreamSpec core: target p95 under 12 seconds
- Playable spawn region: target p95 under 15 seconds
- Central chunk generation after spec: target under 1 second on demo machine where practical

Measure rather than assuming.

## World budgets

Suggested defaults:

```ts
const WORLD_LIMITS = {
  radius: 64,
  height: 64,
  chunkSize: 16,
  desktopRenderRadius: 3,
  mobileRenderRadius: 2,
  structures: 16,
  blockTypes: 16,
  transparentBlockTypes: 4,
};
```

A bounded world is preferred to an infinite one.

## Entity budgets

```ts
const ENTITY_LIMITS = {
  definitions: 6,
  activeInstances: 12,
  heroEntities: 3,
  heroParts: 32,
  backgroundParts: 12,
  dynamicBodies: 32,
};
```

Update rates may depend on distance:

- Near: 30 Hz behavior, render interpolation every frame
- Medium: 10 Hz
- Far: 2–5 Hz or paused

## Particle budgets

- Desktop typical: up to 500 simple particles
- Mobile typical: 150–250
- Climax burst may temporarily exceed typical count within a hard cap and short lifetime
- Use instancing or points, not individual meshes

## Chunk scheduling

Prioritize:

1. Spawn chunk
2. Eight surrounding chunks
3. Chunks in camera direction/objective path
4. Remaining ring

Limit concurrent worker jobs. Discard stale results when the player moves or a new dream loads.

## Main-loop allocation policy

Avoid allocating arrays/vectors/closures each frame. Reuse scratch vectors and typed buffers. Avoid traversing the full world or all definitions per frame.

## Geometry/material policy

- One/few mesh objects per chunk
- Reuse block materials/palette
- Cache shared entity geometry/material where safe
- Dispose replaced chunk/entity resources
- Transparent rendering is limited and separated
- Avoid expensive material features on background entities

## Physics policy

- Kinematic player and bounded voxel queries
- Limited collision substeps based on maximum speed
- Physics fields indexed by zone/region rather than all-fields-per-frame when possible
- Dynamic props sleep and simulate only near player
- Hard velocity/acceleration caps

## Metrics

Expose a development-only metrics object:

```ts
interface RuntimeMetrics {
  fps: number;
  frameMsP50: number;
  frameMsP95: number;
  drawCalls: number;
  triangles: number;
  loadedChunks: number;
  queuedChunks: number;
  activeEntities: number;
  activeDynamicBodies: number;
  particles: number;
  workerJobMsP95: number;
  timeToPlayableMs?: number;
}
```

Use the renderer's information object where appropriate and custom timers for chunk/compile/generation stages.

## Degradation tiers

```ts
type QualityTier = "high" | "balanced" | "reduced";
```

### High

- DPR up to 2
- Radius 3
- Hero shadows or richer materials where safe
- Full particle budget

### Balanced

- DPR up to 1.5
- Radius 3 or 2
- No expensive postprocessing
- Moderate particles

### Reduced

- DPR 1–1.25
- Radius 2
- No dynamic shadows
- Simplified entity segments/materials
- Low particles
- Lower far-entity update rate

Allow manual override and persist locally.

## Performance release evidence

Record:

- Device/browser
- Quality tier
- Prompt/world fixture
- Time to validated core
- Time to playable frame
- FPS/frame percentiles
- Draw calls/triangles
- Memory before load, during play, after two reloads
- Any degradation triggered
