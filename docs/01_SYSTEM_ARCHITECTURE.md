# System Architecture

## Overview

```text
User dream
   ↓
Product UI
   ↓
POST /api/dream
   ↓
Generation strategy
   ├── mock-local
   ├── single-sol
   └── director-parallel
   ↓
DreamSpec JSON
   ↓
Schema validation + sanitizer + repair
   ↓
Trusted compilers
   ├── Terrain/structure compiler
   ├── Physics compiler
   ├── EntityKit compiler
   ├── DreamPlayGraph compiler
   ├── Atmosphere/audio compiler
   └── Spawn/staging compiler
   ↓
DreamRuntimeManifest
   ↓
Three.js voxel shell
   ├── World/chunks
   ├── Worker meshing
   ├── Renderer
   ├── Player/collision
   ├── Entities
   ├── Gameplay event bus
   ├── Dialogue/HUD
   └── Audio/atmosphere
```

## Trust boundaries

### Untrusted

- User dream text
- Model response
- Stored/cached manifests
- URL/query parameters
- Share identifiers

### Validated data boundary

- Zod/JSON Schema parse
- Cross-reference validation
- Runtime budget clamp
- Safe spawn/objective repair
- Text normalization

### Trusted

- TypeScript compilers
- World and engine APIs
- Entity behaviors
- Physics implementations
- Game effects
- Renderer and DOM code

The model never receives an object reference to the engine and never produces executable callbacks.

## Client modules

### `src/app`

Owns product phases, user input, generation requests, loading/failure UX, and shell composition.

### `src/dream`

Owns DreamSpec schema, validation, sanitizer, compilers, generation-provider client, examples, fallback, and deterministic utilities.

### `src/engine`

Owns Three.js scene, world/chunks, meshing, player/collision, interaction, render loop, worker bridge, metrics, quality tiers, and disposal.

### `src/entitykit`

Owns procedural rigs, features, materials, expressions, animations, readability checks, and mesh budgets.

### `src/gameplay`

Owns DreamPlayGraph variables/conditions/effects/beats, event bus, dialogue, quest journal, endings, physics transitions, and game-state serialization.

### `src/audio`

Owns Web Audio graph, procedural ambience, movement/contact cues, one-shot effects, mute/volume, and unlock-on-gesture.

### `src/ui`

Owns HUD, dialogue, objective journal, interaction prompt, loading, controls overlay, pause/settings, ending, and accessibility.

### `src/server` or `api`

Owns OpenAI requests, secret management, input limits, structured output, strategy orchestration, timeout/retry, response normalization, and server-safe logging.

## Shell lifecycle

```text
initialize canvas/renderer
→ create UI bridge and metrics
→ request or load DreamSpec
→ validate/sanitize/compile
→ generate spawn chunk(s)
→ load player and hero staging
→ unlock entry
→ stream outer chunks
→ apply optional enrichment patch
→ run game until ending/restart
→ dispose world and load next dream
```

## World/chunk design

Recommended initial values:

```ts
const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Z = 16;
const WORLD_HEIGHT = 64;
const DESKTOP_RENDER_RADIUS = 3;
const MOBILE_RENDER_RADIUS = 2;
```

World coordinates map to chunk/local coordinates using floor division that correctly handles negatives.

Chunk storage may use a compact typed array:

```ts
type BlockId = number;
type ChunkVoxelData = Uint16Array;
```

Player edits are stored as sparse deterministic deltas above the base generator so unloaded chunks can be reconstructed.

## Meshing

Minimum acceptable approach:

1. Iterate voxel cells.
2. For each solid block, inspect six neighbors.
3. Emit only exposed faces.
4. Write positions/normals/colors/indices into typed arrays.
5. Create one opaque geometry and optionally one transparent geometry per chunk.
6. Dispose old geometry after rebuild.

Greedy meshing is valuable but not allowed to delay the vertical slice if exposed-face meshing meets budgets.

## Worker boundary

Chunk generation/meshing should use a Web Worker once the synchronous version is proven.

Messages must include a protocol version and transferable typed arrays where possible:

```ts
interface ChunkWorkerRequest {
  protocol: 1;
  requestId: string;
  kind: "generate-and-mesh";
  chunk: [number, number];
  neighbors: NeighborBorders;
  generator: CompiledGeneratorDescriptor;
}
```

The worker does not receive executable model code. It receives trusted compiled descriptors or data.

A watchdog may terminate/restart a worker if a job exceeds a bounded duration.

## Player controller

Use a custom kinematic motor:

- Pointer-lock yaw/pitch
- Input vector normalized in camera plane
- Acceleration/deceleration
- Gravity vector
- Jump buffering/coyote time
- Axis-separated or swept AABB voxel collision
- Safe maximum speed and substeps
- Recovery if position becomes non-finite or falls outside bounds

## Interaction

One center-screen query resolves in order:

1. Interactive entity within reach
2. Interactive structure/object
3. Voxel face
4. No target

The UI receives a safe prompt through `GameUIBridge`.

## Runtime model flow

### Initial production path

```text
single-sol request
→ Blueprint + Core DreamSpec
→ validate/compile
→ play
```

### Experimental path

```text
Sol blueprint
   ├── Terra core DreamSpec
   └── Luna enrichment patch

Core validates → play
Enrichment validates → apply safely
```

The experiment must be behind a feature flag. Luna enrichment cannot be a hard dependency.

## Caching

Cache only data that is safe and useful:

- Application shell/service worker
- Deterministic sample DreamSpecs
- Recent user DreamSpecs locally
- Optional last-known-good runtime response

Do not cache secrets or raw authorization data. Clearly separate a generated dream from its source text if privacy requirements evolve.

## Deployment

The architecture assumes:

- Static frontend build
- One server-side dream-generation route
- Environment-based secret
- HTTPS
- Optional serverless/edge function constraints

Avoid Node-only APIs in shared client modules. Keep model SDK imports out of the browser bundle.
