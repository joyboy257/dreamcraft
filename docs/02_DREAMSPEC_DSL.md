# DreamSpec v1

## Purpose

DreamSpec is the declarative intermediate representation between natural-language dreams and the trusted game runtime.

It must be:

- Expressive enough to produce distinct dream worlds
- Small enough for low-latency structured generation
- Serializable and cacheable
- Deterministic
- Strictly validated
- Safe to compile without arbitrary code execution

## Top-level shape

```ts
interface DreamSpecV1 {
  version: 1;
  id: string;
  title: string;
  seed: number;

  blueprint: DreamBlueprint;
  budgets: DreamBudgets;

  world: WorldSpec;
  blocks: BlockSpec[];
  structures: StructureSpec[];

  player: PlayerSpec;
  physics: DreamPhysicsSpec;

  entities: EntitySpec[];
  playGraph: DreamPlayGraph;
  dialogues: DialogueSpec[];

  atmosphere: AtmosphereSpec;
  audio: AudioSpec;
}
```

## Blueprint

The blueprint preserves creative intent so implementation can be evaluated against it.

```ts
interface DreamBlueprint {
  summary: string;
  playerRole: string;
  playerFantasy: string;

  emotionalArc: {
    opening: string;
    transformation: string;
    payoff: string;
  };

  semanticAnchors: Array<{
    id: string;
    concept: string;
    role: "environment" | "character" | "object" | "event" | "emotion";
    importance: 1 | 2 | 3 | 4 | 5;
    nearSpawn: boolean;
  }>;

  artDirection: {
    shapeLanguage: string[];
    paletteIntent: string[];
    scaleContrast: string;
    atmosphere: string;
  };

  playableArc: {
    openingSituation: string;
    playerGoal: string;
    meaningfulActions: string[];
    finalPayoff: string;
  };

  physicsMotifs: string[];
}
```

## Budgets

The model may request values no larger than server-defined maxima. The sanitizer always applies the stricter value.

```ts
interface DreamBudgets {
  worldRadius: 32 | 48 | 64;
  worldHeight: 48 | 64;
  blockTypes: number;
  terrainOperations: number;
  structures: number;
  entityDefinitions: number;
  entityInstances: number;
  meshPartsPerHero: number;
  physicsFields: number;
  dialogueNodes: number;
  storyBeats: number;
  particles: number;
}
```

## World

```ts
interface WorldSpec {
  radius: 32 | 48 | 64;
  height: 48 | 64;
  baseHeight: number;
  boundary: "fog" | "void" | "mountains" | "dream_loop";
  terrain: TerrainOperation[];
  layers: TerrainLayer[];
  zones: ZoneSpec[];
}
```

### Terrain operations

Use a small trusted vocabulary:

```ts
type TerrainOperation =
  | { kind: "fbm_height"; scale: number; amplitude: number; octaves: 1 | 2 | 3 | 4 }
  | { kind: "ridge_height"; scale: number; amplitude: number }
  | { kind: "terrace"; stepHeight: number }
  | { kind: "radial_island"; radius: number; falloff: number }
  | { kind: "floating_islands"; frequency: number; minY: number; maxY: number }
  | { kind: "caves"; scale: number; threshold: number }
  | { kind: "waves"; direction: Vec2; wavelength: number; amplitude: number }
  | { kind: "crater"; center: Vec2; radius: number; depth: number }
  | { kind: "path_bias"; points: Vec2[]; width: number; flattenStrength: number };
```

The compiler combines operations in a fixed documented order. The model does not supply formulas.

## Blocks

```ts
interface BlockSpec {
  id: string;
  displayName: string;
  color: number;
  secondaryColor?: number;
  emissive: number;
  opacity: number;
  solid: boolean;
  breakable: boolean;
  materialPhysicsId: string;
  visualPattern?: "none" | "stripes" | "spots" | "checker" | "gradient";
  tags: string[];
}
```

Use vertex color/pattern generation rather than remote textures.

## Structures

```ts
type StructureSpec =
  | TreeStructure
  | TowerStructure
  | ArchStructure
  | BridgeStructure
  | SpiralStructure
  | BlobStructure
  | RingStructure
  | RoomStructure
  | StairStructure
  | LandmarkStructure
  | InteractiveObjectStructure;
```

Each structure has:

- Stable ID
- Position or placement rule
- Bounded dimensions
- Block/material references
- Semantic tags
- Optional state variants for gameplay transformations

Structure recipes are geometric operations, not fixed thematic assets.

## Player

```ts
interface PlayerSpec {
  preferredSpawn: Vec3;
  scale: number;
  startingItems: string[];
  abilities: string[];
  objectiveSummary: string;
}
```

The compiler may move the preferred spawn to a safe nearby point.

## Entities

```ts
interface EntitySpec {
  id: string;
  displayName: string;
  role: "hero" | "npc" | "threat" | "companion" | "ambient" | "object";
  visual: EntityVisualSpec;
  spawn: EntitySpawnSpec;
  behavior: EntityBehaviorSpec;
  dialogueId?: string;
  interactionId?: string;
  tags: string[];
}
```

## Play graph

See `05_DREAMPLAYGRAPH.md`. DreamSpec stores declarative variables, verbs, beats, conditions, effects, and endings.

## Dialogue

```ts
interface DialogueSpec {
  id: string;
  speakerEntityId: string;
  trigger: "interact" | "proximity" | "story";
  startNodeId: string;
  nodes: DialogueNodeSpec[];
}
```

Constraints:

- Plain text only
- Bounded length
- Bounded nodes/responses
- Every referenced node exists
- Effects use DreamPlayGraph vocabulary
- No model call at interaction time

## Atmosphere/audio

Atmosphere controls sky, fog, lighting, particles, wobble/pulse, and transitions. Audio selects procedural mood and cues. No remote media URLs.

## Versioning

- `version: 1` is required.
- The parser must reject unsupported future major versions.
- Minor additive fields should use defaults.
- Cached specs should be migrated explicitly rather than cast.

## Validation phases

1. Structural parse
2. Primitive bounds
3. Unique identifier checks
4. Reference integrity
5. Semantic budgets
6. Spawn/objective reachability
7. Readability and staging checks
8. Safe repair
9. Compile

## Repair policy

Repair only when behavior remains understandable:

- Clamp a value
- Replace missing referenced block with safe default
- Truncate excessive arrays
- Move spawn/objective to safe surface
- Replace unsupported behavior with idle/wander
- Add a final completion effect

Reject and fallback when:

- Core structure is absent
- Required references are irreparably cyclic/broken
- Non-finite values are pervasive
- Content violates product safety policy
- Repair would produce a misleading or incoherent game
