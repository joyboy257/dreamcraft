# Shared Integration Contracts

The root Sol thread owns this file and the actual shared TypeScript contracts. Workers may propose changes but must not independently create incompatible copies.

The names below are conceptual. The implementation may refine file paths while preserving responsibilities.

## 1. Application state

```ts
type AppPhase =
  | "input"
  | "requesting"
  | "validating"
  | "materializing"
  | "playing"
  | "completed"
  | "fragment"
  | "fatal";

interface AppState {
  phase: AppPhase;
  dreamText: string;
  generation?: GenerationMetadata;
  issue?: UserSafeIssue;
}
```

## 2. Generation provider

```ts
type GenerationStrategy =
  | "mock-local"
  | "single-sol"
  | "director-parallel";

interface DreamGenerationRequest {
  dreamText: string;
  intensity: "calm" | "vivid" | "fever";
  strategy: GenerationStrategy;
  clientRequestId: string;
}

interface DreamGenerationResult {
  core: DreamSpecV1;
  enrichment?: DreamEnrichmentPatchV1;
  metadata: GenerationMetadata;
  issues: DreamIssue[];
}

interface DreamGenerationProvider {
  generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
  ): Promise<DreamGenerationResult>;
}
```

## 3. DreamSpec boundary

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

The Zod schema is the executable source of truth. TypeScript types should be inferred from it where practical.

## 4. Validation result

```ts
interface DreamIssue {
  code: string;
  severity: "info" | "warning" | "error";
  path?: string;
  message: string;
  repaired: boolean;
}

interface SanitizedDream {
  spec: DreamSpecV1;
  issues: DreamIssue[];
}
```

## 5. Runtime manifest

```ts
interface DreamRuntimeManifest {
  id: string;
  title: string;
  seed: number;
  spawn: Vec3;
  blockRegistry: RuntimeBlockRegistry;
  blockAt(x: number, y: number, z: number): BlockId;
  decorate(world: WorldMutationAPI): void;
  entityFactories: RuntimeEntityFactory[];
  physics: RuntimePhysicsProfile;
  playGraph: RuntimePlayGraph;
  atmosphere: RuntimeAtmosphere;
  audio: RuntimeAudioProfile;
  diagnostics: DreamIssue[];
}
```

## 6. World read/write APIs

```ts
interface WorldReadAPI {
  getBlock(x: number, y: number, z: number): BlockId;
  getSurfaceY(x: number, z: number): number | null;
  isSolid(x: number, y: number, z: number): boolean;
  isAreaClear(min: Vec3, max: Vec3): boolean;
  getFlag(id: string): GameValue | undefined;
}

interface WorldMutationAPI extends WorldReadAPI {
  setBlock(x: number, y: number, z: number, block: BlockId): void;
  fillBox(min: Vec3, max: Vec3, block: BlockId): void;
  spawnEntity(entityId: string, position: Vec3): RuntimeEntityId;
  emit(event: GameEvent): void;
  setFlag(id: string, value: GameValue): void;
}
```

Generated/model content never receives the real world object. Trusted compilers call these APIs.

## 7. Engine shell

```ts
interface DreamShell {
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  loadDream(manifest: DreamRuntimeManifest): Promise<void>;
  applyPatch(patch: DreamEnrichmentPatchV1): Promise<void>;
  start(): void;
  pause(): void;
  restart(): Promise<void>;
  dispose(): void;
  getMetrics(): RuntimeMetrics;
}
```

## 8. Chunk generator and mesher

```ts
interface ChunkGenerator {
  generate(request: ChunkGenerationRequest): ChunkVoxelData;
}

interface ChunkMesher {
  mesh(request: ChunkMeshRequest): ChunkMeshData;
}
```

Worker messages must be versioned and transferable where practical. A worker failure must not make the page unrecoverable.

## 9. Entity runtime

```ts
interface RuntimeEntityFactory {
  definitionId: string;
  spawn(world: WorldReadAPI): RuntimeEntitySpawn[];
  create(spawn: RuntimeEntitySpawn): RuntimeEntity;
}

interface RuntimeEntity {
  id: RuntimeEntityId;
  root: THREE.Object3D;
  state: string;
  update(context: EntityUpdateContext): void;
  interact?(context: EntityInteractionContext): void;
  dispose(): void;
}
```

No model-provided function enters this interface. EntityKit and behavior compilers produce trusted implementations.

## 10. Gameplay event bus

```ts
type GameEvent =
  | { type: "entity_interacted"; entityId: string }
  | { type: "dialogue_response"; dialogueId: string; responseId: string }
  | { type: "item_collected"; itemId: string; count: number }
  | { type: "item_delivered"; itemId: string; targetId: string }
  | { type: "zone_entered"; zoneId: string }
  | { type: "block_changed"; position: Vec3; blockId: BlockId }
  | { type: "timer_elapsed"; timerId: string }
  | { type: "entity_state_changed"; entityId: string; state: string };
```

## 11. Product UI bridge

```ts
interface GameUIBridge {
  setTitle(title: string): void;
  setObjective(objective: ObjectiveView | null): void;
  setInteractionPrompt(prompt: string | null): void;
  openDialogue(dialogue: DialogueView): void;
  closeDialogue(): void;
  showToast(message: string): void;
  showEnding(ending: EndingView): void;
  setMetrics?(metrics: RuntimeMetrics): void;
}
```

The engine must not directly mutate arbitrary DOM nodes.

## 12. Shared-file policy

The root owns:

- Canonical contracts
- Application composition
- Dependency declarations
- Environment schema
- Cross-lane event names
- Build scripts

Workers return proposed contract changes in their handoff using `templates/WORKER_RETURN.md`.
