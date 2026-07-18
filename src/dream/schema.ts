import { z } from "zod";

import { STRUCTURAL_LIMITS } from "./limits.js";

const finite = z.number().finite();
const nonNegative = finite.nonnegative();
const positive = finite.positive();
const integer = finite.int();
const color = integer.min(0).max(0xffffff);
const unit = finite.min(0).max(1);
const text = z.string().trim().min(1).max(STRUCTURAL_LIMITS.textLength);
const optionalText = z.string().trim().max(STRUCTURAL_LIMITS.textLength);
const identifier = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z][A-Za-z0-9_-]*$/);

export const Vec2Schema = z.tuple([finite, finite]);
export const Vec3Schema = z.tuple([finite, finite, finite]);

const stringList = z.array(text).max(STRUCTURAL_LIMITS.array);
const tags = z.array(identifier).max(STRUCTURAL_LIMITS.array);

const DreamIssueSeveritySchema = z.enum(["info", "warning", "error"]);

export const DreamIssueSchema = z.strictObject({
  code: identifier,
  severity: DreamIssueSeveritySchema,
  path: optionalText.optional(),
  message: text,
  repaired: z.boolean(),
});

const SemanticAnchorSchema = z.strictObject({
  id: identifier,
  concept: text,
  sourcePhrase: text,
  role: z.enum(["environment", "character", "object", "event", "emotion"]),
  representation: z.enum(["structure", "entity", "prop", "zone", "objective"]),
  gameplayRole: z.enum(["landmark", "guide", "objective", "route", "obstacle", "ending"]),
  importance: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  nearSpawn: z.boolean(),
  mustAppear: z.boolean(),
});

const DreamBlueprintSchema = z.strictObject({
  summary: text,
  playerRole: text,
  playerFantasy: text,
  emotionalArc: z.strictObject({
    opening: text,
    transformation: text,
    payoff: text,
  }),
  semanticAnchors: z
    .array(SemanticAnchorSchema)
    .min(3)
    .max(STRUCTURAL_LIMITS.array),
  artDirection: z.strictObject({
    shapeLanguage: stringList,
    paletteIntent: stringList,
    scaleContrast: text,
    atmosphere: text,
  }),
  playableArc: z.strictObject({
    openingSituation: text,
    playerGoal: text,
    meaningfulActions: stringList,
    finalPayoff: text,
  }),
  physicsMotifs: stringList,
});

const DreamBudgetsSchema = z.strictObject({
  worldRadius: integer.positive(),
  worldHeight: integer.positive(),
  blockTypes: integer.nonnegative(),
  terrainOperations: integer.nonnegative(),
  structures: integer.nonnegative(),
  entityDefinitions: integer.nonnegative(),
  entityInstances: integer.nonnegative(),
  meshPartsPerHero: integer.nonnegative(),
  physicsFields: integer.nonnegative(),
  dialogueNodes: integer.nonnegative(),
  storyBeats: integer.nonnegative(),
  particles: integer.nonnegative(),
});

const TerrainOperationSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("fbm_height"),
    scale: positive,
    amplitude: finite,
    octaves: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  }),
  z.strictObject({
    kind: z.literal("ridge_height"),
    scale: positive,
    amplitude: finite,
  }),
  z.strictObject({ kind: z.literal("terrace"), stepHeight: positive }),
  z.strictObject({
    kind: z.literal("radial_island"),
    radius: positive,
    falloff: positive,
  }),
  z.strictObject({
    kind: z.literal("floating_islands"),
    frequency: nonNegative,
    minY: finite,
    maxY: finite,
  }),
  z.strictObject({
    kind: z.literal("caves"),
    scale: positive,
    threshold: finite,
  }),
  z.strictObject({
    kind: z.literal("waves"),
    direction: Vec2Schema,
    wavelength: positive,
    amplitude: finite,
  }),
  z.strictObject({
    kind: z.literal("crater"),
    center: Vec2Schema,
    radius: positive,
    depth: nonNegative,
  }),
  z.strictObject({
    kind: z.literal("path_bias"),
    points: z.array(Vec2Schema).min(2).max(STRUCTURAL_LIMITS.array),
    width: positive,
    flattenStrength: unit,
  }),
]);

const TerrainLayerSchema = z.strictObject({
  depth: positive,
  block: identifier,
});

const ZoneSchema = z.strictObject({
  id: identifier,
  kind: z.enum(["sphere", "box", "cylinder"]),
  center: Vec3Schema,
  radius: positive.optional(),
  size: Vec3Schema.optional(),
  tags,
});

const WorldSpecSchema = z.strictObject({
  radius: integer.positive(),
  height: integer.positive(),
  baseHeight: finite,
  boundary: z.enum(["fog", "void", "mountains", "dream_loop"]),
  terrain: z.array(TerrainOperationSchema).max(STRUCTURAL_LIMITS.array),
  layers: z.array(TerrainLayerSchema).max(STRUCTURAL_LIMITS.array),
  zones: z.array(ZoneSchema).max(STRUCTURAL_LIMITS.array),
});

const BlockSpecSchema = z.strictObject({
  id: identifier,
  displayName: text,
  color,
  secondaryColor: color.optional(),
  emissive: color,
  opacity: unit,
  solid: z.boolean(),
  breakable: z.boolean(),
  materialPhysicsId: identifier,
  visualPattern: z
    .enum(["none", "stripes", "spots", "checker", "gradient", "stars"])
    .optional(),
  tags,
});

const StructureSpecSchema = z.strictObject({
  id: identifier,
  kind: z.enum([
    "tree",
    "tree_cluster",
    "tower",
    "arch",
    "bridge",
    "spiral",
    "blob",
    "ring",
    "room",
    "corridor",
    "school",
    "kitchen",
    "house",
    "stage",
    "doorway",
    "giant_cup",
    "bowl",
    "instrument",
    "sign",
    "jackpot_board",
    "platform",
    "floating_island",
    "stair",
    "landmark",
    "interactive_object",
  ]),
  position: Vec3Schema.optional(),
  center: Vec3Schema.optional(),
  from: Vec3Schema.optional(),
  to: Vec3Schema.optional(),
  width: positive.optional(),
  height: positive.optional(),
  depth: positive.optional(),
  radius: positive.optional(),
  count: integer.positive().optional(),
  block: identifier.optional(),
  trunkBlock: identifier.optional(),
  canopyBlock: identifier.optional(),
  canopyShape: z.enum(["sphere", "cone", "blob", "spiral"]).optional(),
  shape: identifier.optional(),
  interactionId: identifier.optional(),
  states: z.array(identifier).max(STRUCTURAL_LIMITS.array).optional(),
  tags,
});

const PlayerSpecSchema = z.strictObject({
  preferredSpawn: Vec3Schema,
  scale: positive,
  startingItems: z.array(identifier).max(STRUCTURAL_LIMITS.array),
  abilities: z.array(identifier).max(STRUCTURAL_LIMITS.array),
  objectiveSummary: text,
});

const PlayerMotorSchema = z.strictObject({
  body: z.strictObject({
    radius: positive,
    height: positive,
    mass: positive,
    stepHeight: nonNegative,
    maxSlopeDegrees: finite,
    groundSnapDistance: nonNegative,
  }),
  movement: z.strictObject({
    walkSpeed: nonNegative,
    sprintSpeed: nonNegative,
    groundAcceleration: nonNegative,
    groundDeceleration: nonNegative,
    airAcceleration: nonNegative,
    groundFriction: nonNegative,
    airDrag: nonNegative,
    turnResponsiveness: nonNegative,
  }),
  jump: z.strictObject({
    jumpVelocity: nonNegative,
    coyoteTimeMs: nonNegative,
    jumpBufferMs: nonNegative,
    variableHeight: z.boolean(),
    releaseGravityMultiplier: nonNegative,
    maxAirJumps: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  }),
  abilities: z.strictObject({
    crouch: z.boolean(),
    dash: z.strictObject({ speed: nonNegative, durationMs: nonNegative }).optional(),
    glide: z.strictObject({ fallSpeed: nonNegative }).optional(),
    hover: z.strictObject({ durationMs: nonNegative }).optional(),
    wallJump: z.strictObject({ velocity: nonNegative }).optional(),
    flight: z.strictObject({ speed: nonNegative }).optional(),
    swim: z.strictObject({ speed: nonNegative }).optional(),
  }),
});

const WorldPhysicsSchema = z.strictObject({
  gravity: Vec3Schema,
  terminalVelocity: nonNegative,
  globalTimeScale: nonNegative,
  airDensity: nonNegative,
  globalDrag: nonNegative,
  wind: z.strictObject({
    direction: Vec3Schema,
    strength: nonNegative,
    turbulence: nonNegative,
  }),
  defaultBuoyancy: finite,
  voidBehaviour: z.enum([
    "respawn",
    "soft_reset",
    "endless_fall",
    "teleport_above",
    "dream_transition",
  ]),
});

const SurfacePhysicsSchema = z.strictObject({
  id: identifier,
  friction: nonNegative,
  restitution: nonNegative,
  movementMultiplier: nonNegative,
  jumpMultiplier: nonNegative,
  sinkDepth: nonNegative,
  sinkSpeed: nonNegative,
  conveyorVelocity: Vec3Schema,
  damagePerSecond: nonNegative,
  healingPerSecond: nonNegative,
  crumbleAfterMs: nonNegative.optional(),
  respawnAfterMs: nonNegative.optional(),
  contactEffect: z.enum([
    "none",
    "bounce",
    "launch",
    "stick",
    "slide",
    "slow",
    "speed",
    "float",
    "teleport",
    "transform",
  ]),
});

const FieldShapeSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("sphere"), center: Vec3Schema, radius: positive }),
  z.strictObject({ kind: z.literal("box"), center: Vec3Schema, size: Vec3Schema }),
  z.strictObject({
    kind: z.literal("cylinder"),
    center: Vec3Schema,
    radius: positive,
    height: positive,
  }),
]);

const FieldEffectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("gravity"), vector: Vec3Schema }),
  z.strictObject({ kind: z.literal("wind"), vector: Vec3Schema, turbulence: nonNegative }),
  z.strictObject({
    kind: z.literal("vortex"),
    center: Vec3Schema,
    pullStrength: finite,
    spinStrength: finite,
  }),
  z.strictObject({ kind: z.literal("time_scale"), scale: nonNegative }),
  z.strictObject({ kind: z.literal("zero_gravity"), damping: nonNegative }),
  z.strictObject({ kind: z.literal("buoyancy"), strength: finite, drag: nonNegative }),
  z.strictObject({ kind: z.literal("repel"), center: Vec3Schema, strength: finite }),
  z.strictObject({ kind: z.literal("attract"), center: Vec3Schema, strength: finite }),
  z.strictObject({ kind: z.literal("launch"), impulse: Vec3Schema }),
  z.strictObject({
    kind: z.literal("movement_scale"),
    horizontal: nonNegative,
    vertical: nonNegative,
  }),
]);

const PhysicsFieldSchema = z.strictObject({
  id: identifier,
  shape: FieldShapeSchema,
  priority: integer,
  blendDistance: nonNegative,
  enabled: z.boolean(),
  effect: FieldEffectSchema,
});

const PhysicsChangeSchema = z.discriminatedUnion("target", [
  z.strictObject({ target: z.literal("world.gravity"), value: Vec3Schema }),
  z.strictObject({ target: z.literal("world.globalTimeScale"), value: nonNegative }),
  z.strictObject({ target: z.literal("world.wind.strength"), value: nonNegative }),
]);

const PhysicsTransitionSchema = z.strictObject({
  id: identifier,
  durationMs: nonNegative,
  easing: z.enum(["linear", "smooth", "dream_wobble"]),
  changes: z.array(PhysicsChangeSchema).max(STRUCTURAL_LIMITS.array),
});

const DreamPhysicsSchema = z.strictObject({
  player: PlayerMotorSchema,
  world: WorldPhysicsSchema,
  materials: z.array(SurfacePhysicsSchema).max(STRUCTURAL_LIMITS.array),
  fields: z.array(PhysicsFieldSchema).max(STRUCTURAL_LIMITS.array),
  transitions: z.array(PhysicsTransitionSchema).max(STRUCTURAL_LIMITS.array),
  dynamicBodies: z.strictObject({
    maximumActiveBodies: integer.nonnegative(),
    sleepAfterMs: nonNegative,
    simulationRadius: nonNegative,
  }),
  gameFeel: z.strictObject({
    headBob: nonNegative,
    landingCompression: nonNegative,
    fieldOfView: positive,
    sprintFovIncrease: nonNegative,
    cameraRollResponse: nonNegative,
    cameraShake: nonNegative,
    hitStopMs: nonNegative,
    interactionPulse: nonNegative,
  }),
});

const MaterialSlotSchema = z.strictObject({
  id: identifier,
  preset: z.enum([
    "matte",
    "toon",
    "metal",
    "glass",
    "jelly",
    "cloud",
    "paper",
    "stone",
    "emissive",
    "shadow",
    "hologram",
  ]),
  color,
  roughness: unit,
  metalness: unit,
  opacity: unit,
  emissive: color,
  pattern: z
    .strictObject({
      kind: z.enum(["none", "stripes", "spots", "gradient", "checker", "stars", "scanlines"]),
      color,
      scale: positive,
    })
    .optional(),
});

const EntityFeatureSchema = z.strictObject({
  kind: z.enum([
    "ear",
    "horn",
    "antenna",
    "snout",
    "beak",
    "wing",
    "tail",
    "fin",
    "paw",
    "claw",
    "hair",
    "crown",
    "hat",
    "backpack",
    "necklace",
    "handle",
    "spout",
    "clock_face",
  ]),
  style: identifier.optional(),
  size: positive,
  materialSlot: identifier,
  pendant: identifier.optional(),
});

const EntityVisualSchema = z.strictObject({
  bodyPlan: z.enum([
    "humanoid",
    "small_humanoid",
    "humanoid_adult",
    "humanoid_child",
    "humanoid_elder",
    "quadruped",
    "dog",
    "bear",
    "bird",
    "moth",
    "fish",
    "serpent",
    "blob",
    "floating_object",
    "plant_creature",
  ]),
  scale: positive,
  proportions: z.strictObject({
    headScale: Vec3Schema,
    torsoScale: Vec3Schema,
    limbLength: positive,
    limbThickness: positive,
    stanceWidth: nonNegative,
    posture: z.enum(["upright", "hunched", "proud", "sleepy", "floating"]),
  }),
  palette: z.strictObject({
    primary: color,
    secondary: color,
    accent: color,
    eye: color,
  }),
  materials: z.array(MaterialSlotSchema).max(STRUCTURAL_LIMITS.array),
  features: z.array(EntityFeatureSchema).max(STRUCTURAL_LIMITS.array),
  face: z
    .strictObject({
      eyeStyle: z.enum(["round", "sleepy", "glowing", "button", "screen", "single_eye", "many_eyes"]),
      eyeScale: positive,
      eyeSpacing: nonNegative,
      mouthStyle: z.enum(["smile", "frown", "beak", "fangs", "speaker", "none"]),
      defaultExpression: z.enum(["friendly", "curious", "afraid", "angry", "mysterious", "sleeping"]),
    })
    .optional(),
  animationStyle: z.strictObject({
    idle: z.enum(["breathe", "bob", "wobble", "look_around", "sleep", "float"]),
    locomotion: z.enum(["walk", "waddle", "hop", "slither", "fly", "roll", "swim"]),
    emotion: z.enum(["wave", "dance", "shiver", "stomp", "cheer", "bow"]),
    speedMultiplier: nonNegative,
    exaggeration: nonNegative,
  }),
  recognitionFeatures: stringList,
});

const EntitySpawnSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("fixed"),
    positions: z.array(Vec3Schema).max(STRUCTURAL_LIMITS.array),
  }),
  z.strictObject({
    kind: z.literal("surface_scatter"),
    center: Vec3Schema,
    radius: positive,
    count: integer.nonnegative(),
    minDistance: nonNegative,
  }),
  z.strictObject({
    kind: z.literal("around_structure"),
    structureId: identifier,
    count: integer.nonnegative(),
    radius: positive,
  }),
  z.strictObject({
    kind: z.literal("in_zone"),
    zoneId: identifier,
    count: integer.nonnegative(),
    minDistance: nonNegative,
  }),
]);

const EntityBehaviorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("idle") }),
  z.strictObject({ kind: z.literal("idle_bob"), amplitude: nonNegative, speed: nonNegative }),
  z.strictObject({ kind: z.literal("wander"), radius: positive, speed: nonNegative }),
  z.strictObject({
    kind: z.literal("patrol"),
    points: z.array(Vec3Schema).max(STRUCTURAL_LIMITS.array),
    speed: nonNegative,
  }),
  z.strictObject({
    kind: z.literal("guard"),
    targetId: identifier,
    warningRadius: positive,
    chaseRadius: positive,
    speed: nonNegative,
  }),
  z.strictObject({ kind: z.literal("orbit"), targetId: identifier, radius: positive, speed: nonNegative }),
  z.strictObject({ kind: z.literal("flee"), triggerRadius: positive, speed: nonNegative }),
  z.strictObject({
    kind: z.literal("follow"),
    target: z.union([z.literal("player"), identifier]),
    distance: nonNegative,
    speed: nonNegative,
  }),
  z.strictObject({ kind: z.literal("escort"), destinationZoneId: identifier, speed: nonNegative }),
  z.strictObject({ kind: z.literal("perform"), animation: identifier, triggerFlag: identifier }),
]);

const EntitySpecSchema = z.strictObject({
  id: identifier,
  displayName: text,
  role: z.enum(["hero", "npc", "threat", "companion", "ambient", "object"]),
  visual: EntityVisualSchema,
  spawn: EntitySpawnSchema,
  behavior: EntityBehaviorSchema,
  dialogueId: identifier.optional(),
  interactionId: identifier.optional(),
  tags,
});

type GameCondition =
  | { kind: "always" }
  | { kind: "flag"; id: string; equals: boolean }
  | { kind: "counter" | "meter"; id: string; operator: ">=" | "==" | "<="; value: number }
  | { kind: "interacted"; targetId: string }
  | { kind: "dialogue_completed"; dialogueId: string }
  | { kind: "response_chosen"; dialogueId: string; responseId: string }
  | { kind: "item_collected"; itemId: string; count: number }
  | { kind: "item_delivered"; itemId: string; targetId: string }
  | { kind: "object_placed"; itemId: string; zoneId: string }
  | { kind: "zone_entered"; zoneId: string }
  | { kind: "entity_state"; entityId: string; state: string }
  | { kind: "timer_elapsed"; timerId: string; seconds: number }
  | { kind: "all" | "any"; conditions: GameCondition[] };

export const GameConditionSchema: z.ZodType<GameCondition> = z.lazy(() =>
  z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("always") }),
    z.strictObject({ kind: z.literal("flag"), id: identifier, equals: z.boolean() }),
    z.strictObject({ kind: z.literal("counter"), id: identifier, operator: z.enum([">=", "==", "<="]), value: finite }),
    z.strictObject({ kind: z.literal("meter"), id: identifier, operator: z.enum([">=", "==", "<="]), value: finite }),
    z.strictObject({ kind: z.literal("interacted"), targetId: identifier }),
    z.strictObject({ kind: z.literal("dialogue_completed"), dialogueId: identifier }),
    z.strictObject({ kind: z.literal("response_chosen"), dialogueId: identifier, responseId: identifier }),
    z.strictObject({ kind: z.literal("item_collected"), itemId: identifier, count: integer.nonnegative() }),
    z.strictObject({ kind: z.literal("item_delivered"), itemId: identifier, targetId: identifier }),
    z.strictObject({ kind: z.literal("object_placed"), itemId: identifier, zoneId: identifier }),
    z.strictObject({ kind: z.literal("zone_entered"), zoneId: identifier }),
    z.strictObject({ kind: z.literal("entity_state"), entityId: identifier, state: identifier }),
    z.strictObject({ kind: z.literal("timer_elapsed"), timerId: identifier, seconds: nonNegative }),
    z.strictObject({ kind: z.literal("all"), conditions: z.array(GameConditionSchema).max(STRUCTURAL_LIMITS.conditionChildren) }),
    z.strictObject({ kind: z.literal("any"), conditions: z.array(GameConditionSchema).max(STRUCTURAL_LIMITS.conditionChildren) }),
  ]),
);

const GameEffectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("set_flag"), id: identifier, value: z.boolean() }),
  z.strictObject({ kind: z.literal("change_counter"), id: identifier, amount: finite }),
  z.strictObject({ kind: z.literal("change_meter"), id: identifier, amount: finite }),
  z.strictObject({ kind: z.literal("show_message"), text }),
  z.strictObject({ kind: z.literal("start_dialogue"), dialogueId: identifier }),
  z.strictObject({ kind: z.literal("spawn_entity"), entityId: identifier, position: Vec3Schema }),
  z.strictObject({ kind: z.literal("move_entity"), entityId: identifier, destination: Vec3Schema }),
  z.strictObject({ kind: z.literal("set_entity_state"), entityId: identifier, state: identifier }),
  z.strictObject({ kind: z.literal("transform_structure"), structureId: identifier, state: identifier }),
  z.strictObject({ kind: z.literal("change_atmosphere"), patchId: identifier, durationMs: nonNegative }),
  z.strictObject({ kind: z.literal("apply_physics_transition"), transitionId: identifier }),
  z.strictObject({ kind: z.literal("play_effect"), effectId: identifier, targetId: identifier.optional() }),
  z.strictObject({ kind: z.literal("play_audio_cue"), cueId: identifier }),
  z.strictObject({ kind: z.literal("unlock_interaction"), interactionId: identifier }),
  z.strictObject({ kind: z.literal("give_item"), itemId: identifier, count: integer.nonnegative() }),
  z.strictObject({ kind: z.literal("remove_item"), itemId: identifier, count: integer.nonnegative() }),
  z.strictObject({ kind: z.literal("complete_experience"), endingId: identifier }),
]);

const GameVariableSchema = z.strictObject({
  id: identifier,
  displayName: text.optional(),
  type: z.enum(["boolean", "counter", "meter"]),
  initialValue: z.union([finite, z.boolean()]),
  minimum: finite.optional(),
  maximum: finite.optional(),
  showInHud: z.boolean(),
});

const StoryBeatSchema = z.strictObject({
  id: identifier,
  title: text,
  objectiveText: text,
  startsWhen: GameConditionSchema,
  completesWhen: GameConditionSchema,
  onStart: z.array(GameEffectSchema).max(STRUCTURAL_LIMITS.array),
  onProgress: z.array(GameEffectSchema).max(STRUCTURAL_LIMITS.array),
  onComplete: z.array(GameEffectSchema).max(STRUCTURAL_LIMITS.array),
  optional: z.boolean(),
});

const EndingSchema = z.strictObject({
  id: identifier,
  title: text,
  narration: text,
  condition: GameConditionSchema,
  effects: z.array(GameEffectSchema).max(STRUCTURAL_LIMITS.array),
});

const PlayGraphSchema = z.strictObject({
  experienceName: text,
  playerFantasy: text,
  playerRole: text,
  experienceTags: z.array(z.enum([
    "adventure", "pursuit", "survival", "mystery", "social", "ritual",
    "celebration", "reunion", "transformation", "exploration", "performance", "creation",
  ])).max(STRUCTURAL_LIMITS.array),
  availableVerbs: z.array(z.strictObject({
    mechanic: z.enum([
      "interact", "talk", "choose", "collect", "carry", "deliver", "place", "activate",
      "repair", "assemble", "follow", "escort", "hide", "evade", "chase", "race", "fly",
      "dash", "throw", "perform", "emote", "observe",
    ]),
    label: text,
    targetTags: tags,
  })).max(STRUCTURAL_LIMITS.array),
  variables: z.array(GameVariableSchema).max(STRUCTURAL_LIMITS.array),
  beats: z.array(StoryBeatSchema).max(STRUCTURAL_LIMITS.array),
  endings: z.array(EndingSchema).max(STRUCTURAL_LIMITS.array),
  failurePolicy: z.enum(["none", "retry_current_beat", "soft_reset", "alternate_ending"]),
});

const DialogueResponseSchema = z.strictObject({
  id: identifier,
  text,
  nextNodeId: identifier.optional(),
  effects: z.array(GameEffectSchema).max(STRUCTURAL_LIMITS.array),
});

const DialogueNodeSchema = z.strictObject({
  id: identifier,
  text,
  responses: z.array(DialogueResponseSchema).max(STRUCTURAL_LIMITS.array),
});

const DialogueSchema = z.strictObject({
  id: identifier,
  speakerEntityId: identifier,
  trigger: z.enum(["interact", "proximity", "story"]),
  startNodeId: identifier,
  nodes: z.array(DialogueNodeSchema).max(STRUCTURAL_LIMITS.array),
});

const AtmospherePatchSchema = z.strictObject({
  id: identifier,
  skyTop: color.optional(),
  skyBottom: color.optional(),
  fogColor: color.optional(),
  particleKind: identifier.optional(),
  particleDensity: nonNegative.optional(),
});

const AtmosphereSchema = z.strictObject({
  skyTop: color,
  skyBottom: color,
  fogColor: color,
  fogNear: nonNegative,
  fogFar: nonNegative,
  ambientLight: color,
  ambientIntensity: nonNegative,
  sunColor: color,
  sunIntensity: nonNegative,
  particleKind: identifier,
  particleDensity: nonNegative,
  wobbleStrength: nonNegative,
  pulseSpeed: nonNegative,
  patches: z.array(AtmospherePatchSchema).max(STRUCTURAL_LIMITS.array),
});

const AudioSchema = z.strictObject({
  mood: identifier,
  ambientIntensity: nonNegative,
  footstepProfile: identifier,
  cues: z.array(z.strictObject({
    id: identifier,
    kind: z.enum(["chord", "tone", "pulse", "noise", "arpeggio"]),
    preset: identifier,
  })).max(STRUCTURAL_LIMITS.array),
});

export const DreamSpecV1Schema = z.strictObject({
  version: z.literal(1),
  id: identifier,
  title: text,
  seed: integer,
  blueprint: DreamBlueprintSchema,
  budgets: DreamBudgetsSchema,
  world: WorldSpecSchema,
  blocks: z.array(BlockSpecSchema).max(STRUCTURAL_LIMITS.array),
  structures: z.array(StructureSpecSchema).max(STRUCTURAL_LIMITS.array),
  player: PlayerSpecSchema,
  physics: DreamPhysicsSchema,
  entities: z.array(EntitySpecSchema).max(STRUCTURAL_LIMITS.array),
  playGraph: PlayGraphSchema,
  dialogues: z.array(DialogueSchema).max(STRUCTURAL_LIMITS.array),
  atmosphere: AtmosphereSchema,
  audio: AudioSchema,
});

export type Vec2 = z.infer<typeof Vec2Schema>;
export type Vec3 = z.infer<typeof Vec3Schema>;
export type DreamIssue = z.infer<typeof DreamIssueSchema>;
export type DreamSpecV1 = z.infer<typeof DreamSpecV1Schema>;
export type DreamCondition = z.infer<typeof GameConditionSchema>;
