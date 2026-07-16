import { sanitizeDreamSpec } from "./sanitizer";
import type { DreamCondition, DreamIssue, DreamSpecV1 } from "./schema";

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

type LocalScenarioPreset =
  | "candy_forest"
  | "flying_city"
  | "flooded_school"
  | "moon_teapot"
  | "lost_dog"
  | "lottery_family"
  | "stable_fragment";

function chooseLocalScenario(text: string): LocalScenarioPreset {
  if (/candy|sweet|sugar/.test(text) && /forest|tree|wood/.test(text)) return "candy_forest";
  if (/fly|flying|sky|cloud/.test(text) && /city|town|island/.test(text)) return "flying_city";
  if (/flood|underwater|water/.test(text) && /school|class|hall/.test(text)) return "flooded_school";
  if (/teapot|tea pot/.test(text) && /moon|talk|spoon/.test(text)) return "moon_teapot";
  if (/dog|pet|puppy/.test(text) && /lost|find|home|memory/.test(text)) return "lost_dog";
  if (/lottery|jackpot|won|win/.test(text) && /family|celebrat|dance|party/.test(text)) return "lottery_family";
  return "stable_fragment";
}

function applyLocalScenario(candidate: DreamSpecV1, text: string): DreamSpecV1 {
  const preset = chooseLocalScenario(text);
  const verb = (mechanic: DreamSpecV1["playGraph"]["availableVerbs"][number]["mechanic"], label: string) => ({
    mechanic,
    label,
    targetTags: ["objective"],
  });
  const hero = candidate.entities[0]!;
  const surface = candidate.physics.materials[0]!;

  switch (preset) {
    case "candy_forest":
      candidate.playGraph.experienceTags = ["exploration", "celebration"];
      candidate.playGraph.availableVerbs = [verb("dash", "Bounce through the candy grove"), verb("emote", "Wake the sugar festival")];
      candidate.playGraph.playerFantasy = "Bound between springy sweets and wake a forest celebration.";
      candidate.physics.player.abilities.dash = { speed: 13, durationMs: 260 };
      candidate.physics.world.gravity = [0, -16, 0];
      surface.restitution = 0.85;
      surface.jumpMultiplier = 1.35;
      surface.contactEffect = "bounce";
      hero.visual.bodyPlan = "plant_creature";
      hero.visual.animationStyle.locomotion = "hop";
      candidate.atmosphere.particleKind = "sugar_sparkles";
      candidate.audio.mood = "playful_festival";
      break;
    case "flying_city":
      candidate.playGraph.experienceTags = ["adventure", "exploration"];
      candidate.playGraph.availableVerbs = [verb("fly", "Ride the skyway"), verb("activate", "Light the cloud harbor")];
      candidate.playGraph.playerFantasy = "Fly between floating districts on visible wind lanes.";
      candidate.physics.player.abilities.flight = { speed: 11 };
      candidate.physics.player.abilities.glide = { fallSpeed: 2.4 };
      candidate.physics.world.gravity = [0, -8, 0];
      candidate.physics.world.wind = { direction: [1, 0.25, 0.2], strength: 4.5, turbulence: 0.55 };
      candidate.world.terrain = [
        { kind: "floating_islands", frequency: 0.28, minY: 8, maxY: 28 },
        { kind: "waves", direction: [1, 0.25], wavelength: 18, amplitude: 2 },
      ];
      hero.visual.bodyPlan = "bird";
      hero.visual.animationStyle.locomotion = "fly";
      candidate.atmosphere.particleKind = "mist_streamers";
      candidate.audio.mood = "airy_soaring";
      break;
    case "flooded_school":
      candidate.playGraph.experienceTags = ["pursuit", "survival"];
      candidate.playGraph.availableVerbs = [verb("evade", "Swim away from the hallway shadow"), verb("follow", "Reach the stairwell current")];
      candidate.playGraph.playerFantasy = "Swim through a flooded school while a shadow closes in.";
      candidate.physics.player.abilities.swim = { speed: 6.5 };
      candidate.physics.world.gravity = [0, -12, 0];
      candidate.physics.world.defaultBuoyancy = 9;
      candidate.physics.world.globalDrag = 1.2;
      candidate.physics.fields = [{
        id: "flood_buoyancy",
        shape: { kind: "box", center: [0, 12, 0], size: [48, 18, 48] },
        priority: 1,
        blendDistance: 2,
        enabled: true,
        effect: { kind: "buoyancy", strength: 9, drag: 1.2 },
      }];
      hero.visual.bodyPlan = "fish";
      hero.visual.animationStyle.locomotion = "swim";
      candidate.atmosphere.particleKind = "bubbles";
      candidate.audio.mood = "eerie_submerged";
      break;
    case "moon_teapot":
      candidate.playGraph.experienceTags = ["mystery", "transformation"];
      candidate.playGraph.availableVerbs = [verb("talk", "Question the moon teapot"), verb("repair", "Mend the guarded handle")];
      candidate.playGraph.playerFantasy = "Earn a talking moon teapot's trust and repair its guarded handle.";
      hero.displayName = "The Moon Teapot";
      hero.visual.bodyPlan = "floating_object";
      hero.visual.features = [
        { kind: "handle", style: "crescent", size: 1, materialSlot: "guide_material" },
        { kind: "spout", style: "singing", size: 1.2, materialSlot: "guide_material" },
      ];
      hero.visual.face = { eyeStyle: "glowing", eyeScale: 0.75, eyeSpacing: 1, mouthStyle: "speaker", defaultExpression: "mysterious" };
      hero.behavior = { kind: "guard", targetId: "awakening_beacon", warningRadius: 7, chaseRadius: 12, speed: 3 };
      candidate.physics.world.globalTimeScale = 0.8;
      candidate.atmosphere.particleKind = "moon_stars";
      candidate.audio.mood = "clockwork_conversation";
      break;
    case "lost_dog":
      candidate.playGraph.experienceTags = ["reunion", "social", "exploration"];
      candidate.playGraph.availableVerbs = [verb("follow", "Follow the familiar pawprints"), verb("deliver", "Bring the lost dog home")];
      candidate.playGraph.playerFantasy = "Recognize a beloved lost dog and guide it through a memory of home.";
      hero.displayName = "The Remembered Dog";
      hero.role = "companion";
      hero.visual.bodyPlan = "quadruped";
      hero.visual.features = [
        { kind: "ear", style: "floppy", size: 1, materialSlot: "guide_material" },
        { kind: "tail", style: "wagging", size: 1, materialSlot: "guide_material" },
      ];
      hero.visual.face = { eyeStyle: "round", eyeScale: 0.9, eyeSpacing: 1, mouthStyle: "smile", defaultExpression: "friendly" };
      hero.behavior = { kind: "follow", target: "player", distance: 2, speed: 5 };
      candidate.atmosphere.particleKind = "memory_petals";
      candidate.audio.mood = "gentle_memory_reunion";
      break;
    case "lottery_family":
      candidate.playGraph.experienceTags = ["celebration", "performance"];
      candidate.playGraph.availableVerbs = [verb("collect", "Gather the lucky stars"), verb("perform", "Lead the family dance")];
      candidate.playGraph.playerFantasy = "Turn impossible luck into a shared family performance.";
      hero.displayName = "The Family Band";
      hero.visual.bodyPlan = "humanoid";
      hero.visual.animationStyle.locomotion = "walk";
      hero.visual.animationStyle.emotion = "dance";
      hero.behavior = { kind: "perform", animation: "family_dance", triggerFlag: "celebration_started" };
      candidate.playGraph.variables = [{
        id: "celebration_started",
        displayName: "Celebration",
        type: "boolean",
        initialValue: false,
        showInHud: false,
      }];
      candidate.physics.world.gravity = [0, -18, 0];
      candidate.physics.world.wind.strength = 1.4;
      candidate.atmosphere.particleKind = "golden_dust";
      candidate.audio.mood = "rhythmic_triumph";
      candidate.audio.cues = [{ id: "finale", kind: "arpeggio", preset: "bright_family_fanfare" }];
      break;
    case "stable_fragment":
      break;
  }

  if (preset !== "stable_fragment") {
    const scenarioName = preset.replaceAll("_", " ");
    const finalAction = candidate.playGraph.availableVerbs.at(-1)!.label;
    candidate.blueprint.summary = `A deterministic ${preset.replaceAll("_", " ")} dream scenario.`;
    candidate.blueprint.playerFantasy = candidate.playGraph.playerFantasy;
    candidate.blueprint.playableArc.meaningfulActions = candidate.playGraph.availableVerbs.map(({ label }) => label);
    candidate.blueprint.semanticAnchors[0]!.concept = `${scenarioName} landmark`;
    candidate.playGraph.experienceName = candidate.title;
    candidate.playGraph.beats[0]!.title = finalAction;
    candidate.playGraph.beats[0]!.objectiveText = finalAction;
    candidate.playGraph.endings[0]!.title = `${scenarioName.replace(/\b\w/g, (letter) => letter.toUpperCase())} Remembered`;
    candidate.playGraph.endings[0]!.narration = `The ${scenarioName} changes in answer to what you did.`;
    candidate.physics.transitions = [{
      id: `${preset}_climax_physics`,
      durationMs: 1_200,
      easing: "dream_wobble",
      changes: [
        { target: "world.gravity", value: [0, candidate.physics.world.gravity[1] * 0.72, 0] },
        { target: "world.wind.strength", value: candidate.physics.world.wind.strength + 1.5 },
      ],
    }];
    candidate.atmosphere.patches = [{
      id: `${preset}_climax_atmosphere`,
      skyTop: candidate.entities[0]!.visual.palette.accent,
      skyBottom: candidate.entities[0]!.visual.palette.primary,
      fogColor: candidate.entities[0]!.visual.palette.secondary,
      particleKind: candidate.atmosphere.particleKind,
      particleDensity: Math.min(1, candidate.atmosphere.particleDensity + 0.2),
    }];
    const actionCount: Record<Exclude<LocalScenarioPreset, "stable_fragment">, number> = {
      candy_forest: 3,
      flying_city: 2,
      flooded_school: 3,
      moon_teapot: 2,
      lost_dog: 2,
      lottery_family: 4,
    };
    const conditionFor = (index: number): DreamCondition => {
      if (preset === "candy_forest") {
        const zoneId = "festival_circle";
        if (!candidate.world.zones.some(({ id }) => id === zoneId)) {
          candidate.world.zones.push({ id: zoneId, kind: "sphere", center: [0, 10, -6], radius: 5, tags: ["ritual"] });
        }
        return { kind: "object_placed", itemId: `sugar_note_${index + 1}`, zoneId };
      }
      if (preset === "flying_city") {
        const zoneId = `sky_harbor_${index + 1}`;
        candidate.world.zones.push({ id: zoneId, kind: "sphere", center: [0, 12, -6 - index * 2], radius: 4, tags: ["flight"] });
        return { kind: "zone_entered", zoneId };
      }
      if (preset === "flooded_school") {
        const zoneId = `flood_refuge_${index + 1}`;
        candidate.world.zones.push({ id: zoneId, kind: "box", center: [0, 10, -5 - index * 2], size: [5, 4, 5], tags: ["refuge"] });
        return { kind: "zone_entered", zoneId };
      }
      if (preset === "lost_dog") {
        const zoneId = index === 0 ? "pawprint_trail" : "remembered_home";
        candidate.world.zones.push({
          id: zoneId,
          kind: "sphere",
          center: index === 0 ? [6, 10, -6] : [10, 10, -10],
          radius: 3,
          tags: index === 0 ? ["trail"] : ["home"],
        });
        return { kind: "zone_entered", zoneId };
      }
      if (preset === "lottery_family") {
        const zoneId = `dance_step_${index + 1}`;
        const dancePositions = [[-4, 10, -6], [0, 10, -10], [4, 10, -6], [0, 10, -2]] as const;
        candidate.world.zones.push({
          id: zoneId,
          kind: "sphere",
          center: [...dancePositions[index]!] as [number, number, number],
          radius: 2.5,
          tags: ["performance", "dance"],
        });
        return { kind: "zone_entered", zoneId };
      }
      return { kind: "entity_state", entityId: hero.id, state: `handle_repaired_${index + 1}` };
    };
    const originalBeat = structuredClone(candidate.playGraph.beats[0]!);
    const conditions = Array.from({ length: actionCount[preset] }, (_, index) => conditionFor(index));
    candidate.budgets.storyBeats = conditions.length;
    candidate.playGraph.beats = conditions.map((condition, index) => ({
      ...structuredClone(originalBeat),
      id: `${preset}_beat_${index + 1}`,
      title: candidate.playGraph.availableVerbs[index % candidate.playGraph.availableVerbs.length]!.label,
      objectiveText: candidate.playGraph.availableVerbs[index % candidate.playGraph.availableVerbs.length]!.label,
      startsWhen: index === 0 ? { kind: "always" } : conditions[index - 1]!,
      completesWhen: condition,
      onComplete: index === conditions.length - 1
        ? originalBeat.onComplete
        : [{ kind: "show_message", text: `${index + 1}/${conditions.length} dream actions complete.` }],
    }));
    candidate.playGraph.endings[0]!.condition = conditions.at(-1)!;
  }
  return candidate;
}

function createLocalCandidate(request: DreamGenerationRequest): DreamSpecV1 {
  const normalized = normalizeDreamText(request.dreamText);
  const seed = stableStringHash(`${normalized}|${request.intensity}`) || 1;
  const theme = chooseTheme(normalized, seed);
  const title = localTitle(normalized, theme);
  const intensityScale = request.intensity === "calm" ? 0.65 : request.intensity === "fever" ? 1.25 : 1;

  const candidate: DreamSpecV1 = {
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
  return applyLocalScenario(candidate, normalized.toLowerCase());
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
      const summary = sanitized.issues.map(({ path, message }) => `${path}: ${message}`).join("; ");
      throw new Error(`Built-in local DreamSpec failed validation: ${summary}`);
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
