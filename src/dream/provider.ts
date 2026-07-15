import { sanitizeDreamSpec } from "./sanitizer";
import type { DreamIssue, DreamSpecV1 } from "./schema";

export type GenerationStrategy = "mock-local" | "single-sol" | "director-parallel";
export type DreamIntensity = "calm" | "vivid" | "fever";

export interface DreamGenerationRequest {
  dreamText: string;
  intensity: DreamIntensity;
  strategy: GenerationStrategy;
  clientRequestId: string;
}

export interface GenerationMetadata {
  strategy: GenerationStrategy;
  requestedStrategy?: GenerationStrategy | undefined;
  actualStrategy?: GenerationStrategy | undefined;
  modelAliases: string[];
  requestDurationMs: number;
  validationDurationMs: number;
  compileDurationMs?: number | undefined;
  fallbackUsed: boolean;
  fallbackReason?: GenerationFailureCategory | undefined;
  repairCount: number;
  requestId: string;
  providerRequestId?: string | undefined;
  attemptCount?: number | undefined;
  usage?: GenerationTokenUsage | undefined;
}

export type GenerationFailureCategory =
  | "api_disabled"
  | "authentication"
  | "cancelled"
  | "incomplete"
  | "invalid_output"
  | "network"
  | "quota"
  | "rate_limit"
  | "refusal"
  | "server"
  | "timeout"
  | "unknown";

export interface GenerationTokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface DreamGenerationResult {
  core: DreamSpecV1;
  metadata: GenerationMetadata;
  issues: DreamIssue[];
}

export type DreamGenerationProgressEvent =
  | { phase: "requesting" }
  | { phase: "blueprint-ready" }
  | { phase: "core-ready"; result: DreamGenerationResult }
  | { phase: "enrichment-ready" };

export type DreamGenerationProgressListener = (
  event: DreamGenerationProgressEvent,
) => void;

export interface DreamGenerationProvider {
  generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    onProgress?: DreamGenerationProgressListener,
  ): Promise<DreamGenerationResult>;
}

interface LocalTheme {
  name: string;
  primary: number;
  secondary: number;
  accent: number;
  mood: string;
  particle: string;
}

const LOCAL_THEMES: readonly LocalTheme[] = [
  {
    name: "Moonlit Library",
    primary: 0x4056a1,
    secondary: 0x90b9e8,
    accent: 0xf6e7a1,
    mood: "mysterious",
    particle: "letters",
  },
  {
    name: "Cloud Garden",
    primary: 0x84c9f4,
    secondary: 0xf7fbff,
    accent: 0xffd77a,
    mood: "wonder",
    particle: "stars",
  },
  {
    name: "Memory Forest",
    primary: 0x3f7451,
    secondary: 0x98bd72,
    accent: 0xf1bc73,
    mood: "nostalgic",
    particle: "leaves",
  },
  {
    name: "Candy Fragment",
    primary: 0xd95b92,
    secondary: 0xf8b4cf,
    accent: 0xffd166,
    mood: "playful",
    particle: "sugar",
  },
];

function normalizeDreamText(value: string): string {
  const withoutControls = Array.from(value.slice(0, 2_000), (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? " " : character;
  }).join("");
  return withoutControls
    .replace(/[<>]/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stableStringHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function chooseTheme(text: string, seed: number): LocalTheme {
  const normalized = text.toLowerCase();
  if (/book|library|letter|moon/.test(normalized)) return LOCAL_THEMES[0]!;
  if (/sky|cloud|fly|star|whale/.test(normalized)) return LOCAL_THEMES[1]!;
  if (/forest|tree|dog|home|memory|family/.test(normalized)) return LOCAL_THEMES[2]!;
  if (/candy|sweet|sugar|celebrat/.test(normalized)) return LOCAL_THEMES[3]!;
  return LOCAL_THEMES[seed % LOCAL_THEMES.length]!;
}

function localTitle(text: string, theme: LocalTheme): string {
  if (text.length === 0) return `Stable ${theme.name}`;
  const words = text.split(" ").slice(0, 7).join(" ");
  return words.length <= 72 ? words : `${words.slice(0, 69)}...`;
}

function createLocalCandidate(request: DreamGenerationRequest): DreamSpecV1 {
  const normalized = normalizeDreamText(request.dreamText);
  const seed = stableStringHash(`${normalized}|${request.intensity}`) || 1;
  const theme = chooseTheme(normalized, seed);
  const title = localTitle(normalized, theme);
  const intensityScale = request.intensity === "calm" ? 0.65 : request.intensity === "fever" ? 1.25 : 1;

  return {
    version: 1,
    id: `local_fragment_${seed.toString(16)}`,
    title,
    seed,
    blueprint: {
      summary: `A stable local interpretation called ${theme.name}.`,
      playerRole: "dream visitor",
      playerFantasy: "Explore a recognizable fragment and awaken its beacon.",
      emotionalArc: {
        opening: "Quiet curiosity",
        transformation: "The fragment responds to attention",
        payoff: "The stable fragment glows and resolves",
      },
      semanticAnchors: [
        {
          id: "anchor_landscape",
          concept: `${theme.name} landscape`,
          role: "environment",
          importance: 5,
          nearSpawn: true,
        },
        {
          id: "anchor_guide",
          concept: "floating local dream guide",
          role: "character",
          importance: 4,
          nearSpawn: true,
        },
        {
          id: "anchor_beacon",
          concept: "awakening beacon",
          role: "object",
          importance: 5,
          nearSpawn: true,
        },
      ],
      artDirection: {
        shapeLanguage: ["voxel", "rounded", "luminous"],
        paletteIntent: ["primary", "secondary", "warm accent"],
        scaleContrast: "A small guide hovers beside a tall beacon.",
        atmosphere: `${theme.mood} haze`,
      },
      playableArc: {
        openingSituation: "The visitor arrives beside a marked path.",
        playerGoal: "Reach and activate the beacon.",
        meaningfulActions: ["explore", "observe the guide", "activate the beacon"],
        finalPayoff: "The fragment brightens and safely resolves.",
      },
      physicsMotifs: ["gentle gravity", "soft wind"],
    },
    budgets: {
      worldRadius: 32,
      worldHeight: 48,
      blockTypes: 4,
      terrainOperations: 2,
      structures: 3,
      entityDefinitions: 1,
      entityInstances: 1,
      meshPartsPerHero: 12,
      physicsFields: 0,
      dialogueNodes: 0,
      storyBeats: 1,
      particles: 180,
    },
    world: {
      radius: 32,
      height: 48,
      baseHeight: 8,
      boundary: "fog",
      terrain: [
        { kind: "fbm_height", scale: 0.055, amplitude: 3, octaves: 2 },
        { kind: "terrace", stepHeight: 1 },
      ],
      layers: [
        { depth: 1, block: "fragment_surface" },
        { depth: 4, block: "fragment_ground" },
      ],
      zones: [],
    },
    blocks: [
      {
        id: "air",
        displayName: "Air",
        color: 0,
        emissive: 0,
        opacity: 0,
        solid: false,
        breakable: false,
        materialPhysicsId: "normal_surface",
        visualPattern: "none",
        tags: ["air"],
      },
      {
        id: "fragment_ground",
        displayName: "Stable Dream Ground",
        color: theme.primary,
        secondaryColor: theme.secondary,
        emissive: 0,
        opacity: 1,
        solid: true,
        breakable: true,
        materialPhysicsId: "normal_surface",
        visualPattern: "gradient",
        tags: ["ground", "fragment"],
      },
      {
        id: "fragment_surface",
        displayName: "Dream Surface",
        color: theme.secondary,
        secondaryColor: theme.primary,
        emissive: theme.primary & 0x222222,
        opacity: 1,
        solid: true,
        breakable: true,
        materialPhysicsId: "normal_surface",
        visualPattern: "spots",
        tags: ["surface", "fragment"],
      },
      {
        id: "beacon_block",
        displayName: "Awakening Light",
        color: theme.accent,
        emissive: theme.accent,
        opacity: 1,
        solid: true,
        breakable: false,
        materialPhysicsId: "normal_surface",
        visualPattern: "stars",
        tags: ["beacon", "objective"],
      },
    ],
    structures: [
      {
        id: "fragment_landmark",
        kind: "landmark",
        position: [-8, 10, 7],
        height: 8,
        block: "fragment_surface",
        tags: ["anchor_landscape", "landmark"],
      },
      {
        id: "awakening_beacon",
        kind: "interactive_object",
        position: [8, 10, 4],
        height: 5,
        block: "beacon_block",
        shape: "beacon",
        interactionId: "activate_beacon",
        states: ["sleeping", "awake"],
        tags: ["anchor_beacon", "objective"],
      },
    ],
    player: {
      preferredSpawn: [0, 12, 0],
      scale: 1,
      startingItems: [],
      abilities: ["jump", "sprint"],
      objectiveSummary: "Follow the glow and activate the awakening beacon.",
    },
    physics: {
      player: {
        body: {
          radius: 0.35,
          height: 1.75,
          mass: 1,
          stepHeight: 0.5,
          maxSlopeDegrees: 45,
          groundSnapDistance: 0.12,
        },
        movement: {
          walkSpeed: 5,
          sprintSpeed: 8,
          groundAcceleration: 28,
          groundDeceleration: 30,
          airAcceleration: 7,
          groundFriction: 9,
          airDrag: 0.4,
          turnResponsiveness: 1,
        },
        jump: {
          jumpVelocity: 8,
          coyoteTimeMs: 110,
          jumpBufferMs: 120,
          variableHeight: true,
          releaseGravityMultiplier: 1.8,
          maxAirJumps: 0,
        },
        abilities: { crouch: false },
      },
      world: {
        gravity: [0, -20, 0],
        terminalVelocity: 45,
        globalTimeScale: 1,
        airDensity: 1,
        globalDrag: 0,
        wind: { direction: [1, 0, 0.25], strength: 0.3, turbulence: 0.15 },
        defaultBuoyancy: 0,
        voidBehaviour: "respawn",
      },
      materials: [
        {
          id: "normal_surface",
          friction: 0.8,
          restitution: 0.05,
          movementMultiplier: 1,
          jumpMultiplier: 1,
          sinkDepth: 0,
          sinkSpeed: 0,
          conveyorVelocity: [0, 0, 0],
          damagePerSecond: 0,
          healingPerSecond: 0,
          contactEffect: "none",
        },
      ],
      fields: [],
      transitions: [],
      dynamicBodies: { maximumActiveBodies: 0, sleepAfterMs: 2_000, simulationRadius: 20 },
      gameFeel: {
        headBob: 0.12,
        landingCompression: 0.12,
        fieldOfView: 75,
        sprintFovIncrease: 4,
        cameraRollResponse: 0.02,
        cameraShake: 0.04 * intensityScale,
        hitStopMs: 0,
        interactionPulse: 0.35,
      },
    },
    entities: [
      {
        id: "fragment_guide",
        displayName: "Fragment Guide",
        role: "hero",
        visual: {
          bodyPlan: "floating_object",
          scale: 1.4,
          proportions: {
            headScale: [1, 1, 1],
            torsoScale: [0.8, 0.8, 0.8],
            limbLength: 0.3,
            limbThickness: 0.25,
            stanceWidth: 0,
            posture: "floating",
          },
          palette: {
            primary: theme.primary,
            secondary: theme.secondary,
            accent: theme.accent,
            eye: theme.accent,
          },
          materials: [
            {
              id: "guide_material",
              preset: "emissive",
              color: theme.primary,
              roughness: 0.45,
              metalness: 0,
              opacity: 1,
              emissive: theme.accent,
            },
          ],
          features: [
            { kind: "antenna", style: "star", size: 0.8, materialSlot: "guide_material" },
            { kind: "wing", style: "small", size: 0.7, materialSlot: "guide_material" },
            { kind: "tail", style: "ribbon", size: 1, materialSlot: "guide_material" },
          ],
          face: {
            eyeStyle: "glowing",
            eyeScale: 0.8,
            eyeSpacing: 1,
            mouthStyle: "smile",
            defaultExpression: "curious",
          },
          animationStyle: {
            idle: "float",
            locomotion: "fly",
            emotion: "wave",
            speedMultiplier: 0.8,
            exaggeration: 1.1,
          },
          recognitionFeatures: ["glowing eyes", "star antenna", "small wings", "ribbon tail"],
        },
        spawn: { kind: "fixed", positions: [[3, 12, 3]] },
        behavior: { kind: "idle_bob", amplitude: 0.25, speed: 0.8 },
        tags: ["anchor_guide", "guide", "hero"],
      },
    ],
    playGraph: {
      experienceName: "The Stable Fragment",
      playerFantasy: "Wake a safe fragment of the remembered dream.",
      playerRole: "dream visitor",
      experienceTags: ["exploration", "transformation"],
      availableVerbs: [
        { mechanic: "observe", label: "Follow the guide", targetTags: ["guide"] },
        { mechanic: "activate", label: "Awaken the beacon", targetTags: ["objective"] },
      ],
      variables: [],
      beats: [
        {
          id: "awaken_fragment",
          title: "Awaken the Fragment",
          objectiveText: "Reach the glowing beacon and activate it.",
          startsWhen: { kind: "always" },
          completesWhen: { kind: "interacted", targetId: "activate_beacon" },
          onStart: [],
          onProgress: [],
          onComplete: [
            { kind: "transform_structure", structureId: "awakening_beacon", state: "awake" },
            { kind: "complete_experience", endingId: "fragment_awake" },
          ],
          optional: false,
        },
      ],
      endings: [
        {
          id: "fragment_awake",
          title: "The Fragment Holds",
          narration: "The beacon answers, and the remembered world becomes steady enough to keep.",
          condition: { kind: "interacted", targetId: "activate_beacon" },
          effects: [],
        },
      ],
      failurePolicy: "soft_reset",
    },
    dialogues: [],
    atmosphere: {
      skyTop: theme.primary,
      skyBottom: theme.secondary,
      fogColor: theme.secondary,
      fogNear: 18,
      fogFar: 58,
      ambientLight: 0xffffff,
      ambientIntensity: 1,
      sunColor: theme.accent,
      sunIntensity: 1.1,
      particleKind: theme.particle,
      particleDensity: 0.35 * intensityScale,
      wobbleStrength: 0.03 * intensityScale,
      pulseSpeed: 0.35,
      patches: [],
    },
    audio: {
      mood: theme.mood,
      ambientIntensity: 0.35,
      footstepProfile: "soft_fragment",
      cues: [],
    },
  };
}

function abortError(): DOMException {
  return new DOMException("Dream generation was aborted", "AbortError");
}

function assertNotAborted(signal: AbortSignal): void {
  if (signal.aborted) throw abortError();
}

export class MockLocalGenerationProvider implements DreamGenerationProvider {
  async generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    onProgress?: DreamGenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    assertNotAborted(signal);
    await Promise.resolve();
    const sanitized = sanitizeDreamSpec(createLocalCandidate(request));
    assertNotAborted(signal);
    if (!sanitized.success) {
      throw new Error("Built-in local DreamSpec failed validation");
    }
    const result: DreamGenerationResult = {
      core: sanitized.spec,
      issues: sanitized.issues,
      metadata: {
        strategy: "mock-local",
        modelAliases: [],
        requestDurationMs: 0,
        validationDurationMs: 0,
        fallbackUsed: false,
        repairCount: sanitized.issues.filter(({ repaired }) => repaired).length,
        requestId: request.clientRequestId,
      },
    };
    onProgress?.({ phase: "core-ready", result });
    return result;
  }
}

function isAbortFailure(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function categorizeFallback(error: unknown): GenerationFailureCategory {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "invalid_response" || code === "invalid_json") return "invalid_output";
  if (code === "http_401") return "authentication";
  if (code === "http_429") return "rate_limit";
  if (code === "http_408" || code === "http_504") return "timeout";
  if (error instanceof TypeError) return "network";
  return "unknown";
}

export class FallbackGenerationProvider implements DreamGenerationProvider {
  constructor(
    private readonly primary: DreamGenerationProvider,
    private readonly local: DreamGenerationProvider = new MockLocalGenerationProvider(),
  ) {}

  async generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    onProgress?: DreamGenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    assertNotAborted(signal);
    try {
      const primary = await this.primary.generate(request, signal, onProgress);
      const sanitized = sanitizeDreamSpec(primary.core);
      if (!sanitized.success) {
        throw new Error("Primary provider returned an invalid DreamSpec");
      }
      return {
        ...primary,
        core: sanitized.spec,
        issues: [...primary.issues, ...sanitized.issues],
        metadata: {
          ...primary.metadata,
          repairCount:
            primary.metadata.repairCount +
            sanitized.issues.filter(({ repaired }) => repaired).length,
        },
      };
    } catch (error) {
      if (signal.aborted || isAbortFailure(error)) throw error;
      const fallbackReason = categorizeFallback(error);
      const fallback = await this.local.generate(
        { ...request, strategy: "mock-local" },
        signal,
        onProgress,
      );
      const fallbackIssue: DreamIssue = {
        code: "provider_fallback",
        severity: "warning",
        path: "generation.strategy",
        message: "The primary generator failed; a deterministic stable fragment was used",
        repaired: true,
      };
      return {
        ...fallback,
        issues: [...fallback.issues, fallbackIssue],
        metadata: {
          ...fallback.metadata,
          requestedStrategy: request.strategy,
          actualStrategy: "mock-local",
          fallbackUsed: true,
          fallbackReason,
          repairCount: fallback.metadata.repairCount + 1,
          attemptCount: 0,
        },
      };
    }
  }
}
