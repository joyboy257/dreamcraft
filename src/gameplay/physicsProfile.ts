export type PhysicsVector = readonly [number, number, number];

export interface PhysicsComfortSettings {
  readonly reducedMotion?: boolean;
  readonly stableHorizon?: boolean;
  readonly reducedFovChanges?: boolean;
}

export interface RuntimePlayerAbilities {
  readonly dash?: {
    readonly speed: number;
    readonly durationMs: number;
    readonly cooldownMs: number;
  };
  readonly glide?: { readonly fallSpeed: number; readonly gravityScale: number };
  readonly flight?: { readonly speed: number };
  readonly swim?: {
    readonly speed: number;
    readonly buoyancy: number;
    readonly drag: number;
  };
}

export type RuntimeFieldShape =
  | { readonly kind: "sphere"; readonly center: PhysicsVector; readonly radius: number }
  | { readonly kind: "box"; readonly center: PhysicsVector; readonly size: PhysicsVector }
  | {
      readonly kind: "cylinder";
      readonly center: PhysicsVector;
      readonly radius: number;
      readonly height: number;
    };

export type RuntimeFieldEffect =
  | { readonly kind: "gravity"; readonly vector: PhysicsVector }
  | { readonly kind: "wind"; readonly vector: PhysicsVector; readonly turbulence: number }
  | {
      readonly kind: "vortex";
      readonly center: PhysicsVector;
      readonly pullStrength: number;
      readonly spinStrength: number;
    }
  | { readonly kind: "time_scale"; readonly scale: number }
  | { readonly kind: "zero_gravity"; readonly damping: number }
  | { readonly kind: "buoyancy"; readonly strength: number; readonly drag: number }
  | { readonly kind: "repel" | "attract"; readonly center: PhysicsVector; readonly strength: number }
  | { readonly kind: "launch"; readonly impulse: PhysicsVector }
  | { readonly kind: "movement_scale"; readonly horizontal: number; readonly vertical: number };

export interface RuntimePhysicsField {
  readonly id: string;
  readonly shape: RuntimeFieldShape;
  readonly priority: number;
  readonly blendDistance: number;
  readonly enabled: boolean;
  readonly effect: RuntimeFieldEffect;
}

export type SurfaceContactEffect =
  | "none"
  | "bounce"
  | "launch"
  | "stick"
  | "slide"
  | "slow"
  | "speed"
  | "float"
  | "teleport"
  | "transform";

export interface RuntimeSurfacePhysics {
  readonly id: string;
  readonly friction: number;
  readonly restitution: number;
  readonly movementMultiplier: number;
  readonly jumpMultiplier: number;
  readonly sinkDepth: number;
  readonly sinkSpeed: number;
  readonly conveyorVelocity: PhysicsVector;
  readonly damagePerSecond: number;
  readonly healingPerSecond: number;
  readonly crumbleAfterMs?: number;
  readonly respawnAfterMs?: number;
  readonly contactEffect: SurfaceContactEffect;
}

export type RuntimePhysicsChange =
  | { readonly target: "world.gravity"; readonly value: PhysicsVector }
  | { readonly target: "world.globalTimeScale" | "world.wind.strength"; readonly value: number };

export interface RuntimePhysicsTransition {
  readonly id: string;
  readonly durationMs: number;
  readonly easing: "linear" | "smooth" | "dream_wobble";
  readonly changes: readonly RuntimePhysicsChange[];
}

export interface RuntimePhysicsProfile {
  readonly player: {
    readonly radius: number;
    readonly height: number;
    readonly walkSpeed: number;
    readonly sprintSpeed: number;
    readonly jumpVelocity: number;
    readonly coyoteTimeMs: number;
    readonly jumpBufferMs: number;
    readonly abilities: RuntimePlayerAbilities;
  };
  readonly world: {
    readonly gravity: PhysicsVector;
    readonly terminalVelocity: number;
    readonly globalTimeScale: number;
    readonly globalDrag: number;
    readonly windDirection: PhysicsVector;
    readonly windStrength: number;
    readonly windTurbulence: number;
    readonly defaultBuoyancy: number;
  };
  readonly materials: readonly RuntimeSurfacePhysics[];
  readonly fields: readonly RuntimePhysicsField[];
  readonly transitions: readonly RuntimePhysicsTransition[];
  readonly gameFeel: {
    readonly headBob: number;
    readonly fieldOfView: number;
    readonly sprintFovIncrease: number;
    readonly cameraRollResponse: number;
    readonly cameraShake: number;
  };
}

export interface PhysicsProfileOverrides {
  readonly player?: Partial<RuntimePhysicsProfile["player"]>;
  readonly world?: Partial<RuntimePhysicsProfile["world"]>;
  readonly gameFeel?: Partial<RuntimePhysicsProfile["gameFeel"]>;
  readonly materials?: readonly RuntimeSurfacePhysics[];
  readonly fields?: readonly RuntimePhysicsField[];
  readonly transitions?: readonly RuntimePhysicsTransition[];
}

export const PHYSICS_LIMITS = {
  playerRadius: [0.2, 1] as const,
  playerHeight: [1, 3] as const,
  walkSpeed: [1.5, 14] as const,
  sprintSpeed: [2, 22] as const,
  jumpVelocity: [2, 22] as const,
  graceTimeMs: [0, 300] as const,
  gravityMagnitude: [0, 50] as const,
  terminalVelocity: [5, 80] as const,
  globalTimeScale: [0.35, 1.75] as const,
  globalDrag: [0, 8] as const,
  windStrength: [0, 30] as const,
  windTurbulence: [0, 1] as const,
  buoyancy: [-50, 50] as const,
  fieldForce: [-50, 50] as const,
  fieldRadius: [0.1, 128] as const,
  fieldBlendDistance: [0, 32] as const,
  fieldPriority: [-100, 100] as const,
  fieldCount: 12,
  maxOverlappingFields: 3,
  materialCount: 20,
  transitionCount: 12,
  transitionDurationMs: [100, 12_000] as const,
  dashSpeed: [1, 30] as const,
  abilitySpeed: [0.5, 18] as const,
  dashDurationMs: [50, 1_500] as const,
  dashCooldownMs: [0, 10_000] as const,
  glideFallSpeed: [0.5, 20] as const,
  abilityDrag: [0, 8] as const,
  headBob: [0, 0.15] as const,
  fieldOfView: [55, 95] as const,
  sprintFovIncrease: [0, 12] as const,
  cameraRollResponse: [0, 0.2] as const,
  cameraShake: [0, 0.35] as const,
} as const;

const DEFAULT_PROFILE: RuntimePhysicsProfile = {
  player: {
    radius: 0.36,
    height: 1.75,
    walkSpeed: 5.2,
    sprintSpeed: 8,
    jumpVelocity: 7.8,
    coyoteTimeMs: 110,
    jumpBufferMs: 120,
    abilities: {},
  },
  world: {
    gravity: [0, -20, 0],
    terminalVelocity: 42,
    globalTimeScale: 1,
    globalDrag: 0.02,
    windDirection: [1, 0, 0],
    windStrength: 0,
    windTurbulence: 0,
    defaultBuoyancy: 0,
  },
  materials: [
    {
      id: "default",
      friction: 0.8,
      restitution: 0,
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
  gameFeel: {
    headBob: 0.035,
    fieldOfView: 72,
    sprintFovIncrease: 5,
    cameraRollResponse: 0.025,
    cameraShake: 0.04,
  },
};

function clamp(
  value: number | undefined,
  fallback: number,
  limits: readonly [number, number],
): number {
  const safeValue = value !== undefined && Number.isFinite(value) ? value : fallback;
  return Math.min(limits[1], Math.max(limits[0], safeValue));
}

function vectorOr(
  value: PhysicsVector | undefined,
  fallback: PhysicsVector,
): PhysicsVector {
  if (!value || value.length !== 3 || value.some((part) => !Number.isFinite(part))) {
    return [...fallback];
  }
  return [value[0], value[1], value[2]];
}

function clampMagnitude(
  vector: PhysicsVector,
  maximumMagnitude: number,
): PhysicsVector {
  const magnitude = Math.hypot(...vector);
  if (magnitude <= maximumMagnitude || magnitude === 0) return [...vector];
  const scale = maximumMagnitude / magnitude;
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function normalizedOr(vector: PhysicsVector, fallback: PhysicsVector): PhysicsVector {
  const magnitude = Math.hypot(...vector);
  if (magnitude < 0.000_001) return [...fallback];
  return [vector[0] / magnitude, vector[1] / magnitude, vector[2] / magnitude];
}

function cleanId(id: string, fallback: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
  return cleaned || fallback;
}

function clampSigned(value: number, fallback = 0): number {
  return clamp(value, fallback, PHYSICS_LIMITS.fieldForce);
}

function sanitizeAbilities(input: RuntimePlayerAbilities | undefined): RuntimePlayerAbilities {
  return {
    ...(input?.dash
      ? {
          dash: {
            speed: clamp(input.dash.speed, 12, PHYSICS_LIMITS.dashSpeed),
            durationMs: clamp(input.dash.durationMs, 180, PHYSICS_LIMITS.dashDurationMs),
            cooldownMs: clamp(input.dash.cooldownMs, 700, PHYSICS_LIMITS.dashCooldownMs),
          },
        }
      : {}),
    ...(input?.glide
      ? {
          glide: {
            fallSpeed: clamp(input.glide.fallSpeed, 4, PHYSICS_LIMITS.glideFallSpeed),
            gravityScale: clamp(input.glide.gravityScale, 0.25, [0, 1]),
          },
        }
      : {}),
    ...(input?.flight
      ? { flight: { speed: clamp(input.flight.speed, 10, PHYSICS_LIMITS.abilitySpeed) } }
      : {}),
    ...(input?.swim
      ? {
          swim: {
            speed: clamp(input.swim.speed, 6, PHYSICS_LIMITS.abilitySpeed),
            buoyancy: clamp(input.swim.buoyancy, 12, PHYSICS_LIMITS.buoyancy),
            drag: clamp(input.swim.drag, 2, PHYSICS_LIMITS.abilityDrag),
          },
        }
      : {}),
  };
}

function sanitizeMaterial(material: RuntimeSurfacePhysics, index: number): RuntimeSurfacePhysics {
  return {
    id: cleanId(material.id, `material-${index}`),
    friction: clamp(material.friction, 0.8, [0, 4]),
    restitution: clamp(material.restitution, 0, [0, 2]),
    movementMultiplier: clamp(material.movementMultiplier, 1, [0, 4]),
    jumpMultiplier: clamp(material.jumpMultiplier, 1, [0, 4]),
    sinkDepth: clamp(material.sinkDepth, 0, [0, 4]),
    sinkSpeed: clamp(material.sinkSpeed, 0, [0, 10]),
    conveyorVelocity: clampMagnitude(vectorOr(material.conveyorVelocity, [0, 0, 0]), 30),
    damagePerSecond: clamp(material.damagePerSecond, 0, [0, 100]),
    healingPerSecond: clamp(material.healingPerSecond, 0, [0, 100]),
    ...(material.crumbleAfterMs === undefined
      ? {}
      : { crumbleAfterMs: clamp(material.crumbleAfterMs, 1_000, [100, 60_000]) }),
    ...(material.respawnAfterMs === undefined
      ? {}
      : { respawnAfterMs: clamp(material.respawnAfterMs, 2_000, [100, 60_000]) }),
    contactEffect: material.contactEffect,
  };
}

function sanitizeShape(shape: RuntimeFieldShape): RuntimeFieldShape {
  const center = vectorOr(shape.center, [0, 0, 0]);
  if (shape.kind === "sphere") {
    return { kind: "sphere", center, radius: clamp(shape.radius, 1, PHYSICS_LIMITS.fieldRadius) };
  }
  if (shape.kind === "cylinder") {
    return {
      kind: "cylinder",
      center,
      radius: clamp(shape.radius, 1, PHYSICS_LIMITS.fieldRadius),
      height: clamp(shape.height, 2, [0.1, 256]),
    };
  }
  return {
    kind: "box",
    center,
    size: [
      clamp(Math.abs(shape.size[0]), 1, [0.1, 256]),
      clamp(Math.abs(shape.size[1]), 1, [0.1, 256]),
      clamp(Math.abs(shape.size[2]), 1, [0.1, 256]),
    ],
  };
}

function sanitizeEffect(effect: RuntimeFieldEffect): RuntimeFieldEffect {
  switch (effect.kind) {
    case "gravity":
      return { kind: "gravity", vector: clampMagnitude(vectorOr(effect.vector, [0, -20, 0]), 50) };
    case "wind":
      return {
        kind: "wind",
        vector: clampMagnitude(vectorOr(effect.vector, [0, 0, 0]), 30),
        turbulence: clamp(effect.turbulence, 0, PHYSICS_LIMITS.windTurbulence),
      };
    case "vortex":
      return {
        kind: "vortex",
        center: vectorOr(effect.center, [0, 0, 0]),
        pullStrength: clampSigned(effect.pullStrength),
        spinStrength: clampSigned(effect.spinStrength),
      };
    case "time_scale":
      return { kind: "time_scale", scale: clamp(effect.scale, 1, PHYSICS_LIMITS.globalTimeScale) };
    case "zero_gravity":
      return { kind: "zero_gravity", damping: clamp(effect.damping, 1, PHYSICS_LIMITS.abilityDrag) };
    case "buoyancy":
      return {
        kind: "buoyancy",
        strength: clampSigned(effect.strength),
        drag: clamp(effect.drag, 0, PHYSICS_LIMITS.abilityDrag),
      };
    case "repel":
    case "attract":
      return {
        kind: effect.kind,
        center: vectorOr(effect.center, [0, 0, 0]),
        strength: clampSigned(effect.strength),
      };
    case "launch":
      return { kind: "launch", impulse: clampMagnitude(vectorOr(effect.impulse, [0, 0, 0]), 50) };
    case "movement_scale":
      return {
        kind: "movement_scale",
        horizontal: clamp(effect.horizontal, 1, [0, 4]),
        vertical: clamp(effect.vertical, 1, [0, 4]),
      };
  }
}

function sanitizeField(field: RuntimePhysicsField, index: number): RuntimePhysicsField {
  return {
    id: cleanId(field.id, `field-${index}`),
    shape: sanitizeShape(field.shape),
    priority: Math.round(clamp(field.priority, 0, PHYSICS_LIMITS.fieldPriority)),
    blendDistance: clamp(field.blendDistance, 0, PHYSICS_LIMITS.fieldBlendDistance),
    enabled: field.enabled,
    effect: sanitizeEffect(field.effect),
  };
}

function sanitizeTransition(
  transition: RuntimePhysicsTransition,
  index: number,
): RuntimePhysicsTransition {
  return {
    id: cleanId(transition.id, `transition-${index}`),
    durationMs: clamp(transition.durationMs, 1_000, PHYSICS_LIMITS.transitionDurationMs),
    easing: transition.easing,
    changes: transition.changes.slice(0, 12).map((change) =>
      change.target === "world.gravity"
        ? { target: change.target, value: clampMagnitude(vectorOr(change.value, [0, -20, 0]), 50) }
        : {
            target: change.target,
            value: clamp(
              change.value,
              change.target === "world.globalTimeScale" ? 1 : 0,
              change.target === "world.globalTimeScale"
                ? PHYSICS_LIMITS.globalTimeScale
                : PHYSICS_LIMITS.windStrength,
            ),
          },
    ),
  };
}

/** Compiles raw values into a finite, comfort-aware runtime profile. */
export function createSafePhysicsProfile(
  overrides: PhysicsProfileOverrides = {},
  comfort: PhysicsComfortSettings = {},
): RuntimePhysicsProfile {
  const playerInput = overrides.player;
  const worldInput = overrides.world;
  const feelInput = overrides.gameFeel;
  const gravity = clampMagnitude(
    vectorOr(worldInput?.gravity, DEFAULT_PROFILE.world.gravity),
    PHYSICS_LIMITS.gravityMagnitude[1],
  );
  const windDirection = normalizedOr(
    vectorOr(worldInput?.windDirection, DEFAULT_PROFILE.world.windDirection),
    DEFAULT_PROFILE.world.windDirection,
  );

  const walkSpeed = clamp(
    playerInput?.walkSpeed,
    DEFAULT_PROFILE.player.walkSpeed,
    PHYSICS_LIMITS.walkSpeed,
  );
  const requestedSprintSpeed = clamp(
    playerInput?.sprintSpeed,
    DEFAULT_PROFILE.player.sprintSpeed,
    PHYSICS_LIMITS.sprintSpeed,
  );

  return {
    player: {
      radius: clamp(
        playerInput?.radius,
        DEFAULT_PROFILE.player.radius,
        PHYSICS_LIMITS.playerRadius,
      ),
      height: clamp(
        playerInput?.height,
        DEFAULT_PROFILE.player.height,
        PHYSICS_LIMITS.playerHeight,
      ),
      walkSpeed,
      sprintSpeed: Math.max(walkSpeed, requestedSprintSpeed),
      jumpVelocity: clamp(
        playerInput?.jumpVelocity,
        DEFAULT_PROFILE.player.jumpVelocity,
        PHYSICS_LIMITS.jumpVelocity,
      ),
      coyoteTimeMs: clamp(
        playerInput?.coyoteTimeMs,
        DEFAULT_PROFILE.player.coyoteTimeMs,
        PHYSICS_LIMITS.graceTimeMs,
      ),
      jumpBufferMs: clamp(
        playerInput?.jumpBufferMs,
        DEFAULT_PROFILE.player.jumpBufferMs,
        PHYSICS_LIMITS.graceTimeMs,
      ),
      abilities: sanitizeAbilities(playerInput?.abilities),
    },
    world: {
      gravity,
      terminalVelocity: clamp(
        worldInput?.terminalVelocity,
        DEFAULT_PROFILE.world.terminalVelocity,
        PHYSICS_LIMITS.terminalVelocity,
      ),
      globalTimeScale: clamp(
        worldInput?.globalTimeScale,
        DEFAULT_PROFILE.world.globalTimeScale,
        PHYSICS_LIMITS.globalTimeScale,
      ),
      globalDrag: clamp(
        worldInput?.globalDrag,
        DEFAULT_PROFILE.world.globalDrag,
        PHYSICS_LIMITS.globalDrag,
      ),
      windDirection,
      windStrength: clamp(
        worldInput?.windStrength,
        DEFAULT_PROFILE.world.windStrength,
        PHYSICS_LIMITS.windStrength,
      ),
      windTurbulence: clamp(
        worldInput?.windTurbulence,
        DEFAULT_PROFILE.world.windTurbulence,
        PHYSICS_LIMITS.windTurbulence,
      ),
      defaultBuoyancy: clamp(
        worldInput?.defaultBuoyancy,
        DEFAULT_PROFILE.world.defaultBuoyancy,
        PHYSICS_LIMITS.buoyancy,
      ),
    },
    materials: (overrides.materials?.length ? overrides.materials : DEFAULT_PROFILE.materials)
      .slice(0, PHYSICS_LIMITS.materialCount)
      .map(sanitizeMaterial),
    fields: (overrides.fields ?? DEFAULT_PROFILE.fields)
      .slice(0, PHYSICS_LIMITS.fieldCount)
      .map(sanitizeField),
    transitions: (overrides.transitions ?? DEFAULT_PROFILE.transitions)
      .slice(0, PHYSICS_LIMITS.transitionCount)
      .map(sanitizeTransition),
    gameFeel: {
      headBob: comfort.reducedMotion
        ? 0
        : clamp(
            feelInput?.headBob,
            DEFAULT_PROFILE.gameFeel.headBob,
            PHYSICS_LIMITS.headBob,
          ),
      fieldOfView: clamp(
        feelInput?.fieldOfView,
        DEFAULT_PROFILE.gameFeel.fieldOfView,
        PHYSICS_LIMITS.fieldOfView,
      ),
      sprintFovIncrease:
        comfort.reducedMotion || comfort.reducedFovChanges
          ? 0
          : clamp(
              feelInput?.sprintFovIncrease,
              DEFAULT_PROFILE.gameFeel.sprintFovIncrease,
              PHYSICS_LIMITS.sprintFovIncrease,
            ),
      cameraRollResponse:
        comfort.reducedMotion || comfort.stableHorizon
          ? 0
          : clamp(
              feelInput?.cameraRollResponse,
              DEFAULT_PROFILE.gameFeel.cameraRollResponse,
              PHYSICS_LIMITS.cameraRollResponse,
            ),
      cameraShake: comfort.reducedMotion
        ? 0
        : clamp(
            feelInput?.cameraShake,
            DEFAULT_PROFILE.gameFeel.cameraShake,
            PHYSICS_LIMITS.cameraShake,
          ),
    },
  };
}

export interface ResolvedPointPhysics {
  readonly gravity: PhysicsVector;
  readonly wind: PhysicsVector;
  readonly timeScale: number;
  readonly buoyancy: number;
  readonly drag: number;
  readonly force: PhysicsVector;
  readonly movementScale: { readonly horizontal: number; readonly vertical: number };
  readonly activeFieldIds: readonly string[];
}

function add(a: PhysicsVector, b: PhysicsVector): PhysicsVector {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVector(vector: PhysicsVector, scale: number): PhysicsVector {
  return [vector[0] * scale, vector[1] * scale, vector[2] * scale];
}

function direction(from: PhysicsVector, to: PhysicsVector): PhysicsVector {
  return normalizedOr([to[0] - from[0], to[1] - from[1], to[2] - from[2]], [0, 0, 0]);
}

function fieldWeight(shape: RuntimeFieldShape, position: PhysicsVector, blend: number): number {
  const x = Math.abs(position[0] - shape.center[0]);
  const y = Math.abs(position[1] - shape.center[1]);
  const z = Math.abs(position[2] - shape.center[2]);
  let edgeDistance: number;
  if (shape.kind === "sphere") edgeDistance = shape.radius - Math.hypot(x, y, z);
  else if (shape.kind === "cylinder") edgeDistance = Math.min(shape.radius - Math.hypot(x, z), shape.height / 2 - y);
  else edgeDistance = Math.min(shape.size[0] / 2 - x, shape.size[1] / 2 - y, shape.size[2] / 2 - z);
  if (edgeDistance < 0) return 0;
  return blend === 0 ? 1 : Math.min(1, edgeDistance / blend);
}

/** Resolves bounded world and local-field physics in documented priority order. */
export function resolvePhysicsAtPoint(
  profile: RuntimePhysicsProfile,
  position: PhysicsVector,
  elapsedMs = 0,
): ResolvedPointPhysics {
  const safePosition = vectorOr(position, [0, 0, 0]);
  const safeElapsedMs = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const turbulence = Math.sin(safeElapsedMs * 0.007 + safePosition[0] * 0.73 + safePosition[2] * 0.41)
    * profile.world.windTurbulence;
  let gravity = profile.world.gravity;
  let wind = scaleVector(profile.world.windDirection, profile.world.windStrength * (1 + turbulence));
  let timeScale = profile.world.globalTimeScale;
  let buoyancy = profile.world.defaultBuoyancy;
  let drag = profile.world.globalDrag;
  let force: PhysicsVector = [0, 0, 0];
  let horizontal = 1;
  let vertical = 1;
  const active = profile.fields
    .map((field) => ({ field, weight: field.enabled ? fieldWeight(field.shape, safePosition, field.blendDistance) : 0 }))
    .filter(({ weight }) => weight > 0)
    .sort((a, b) => b.field.priority - a.field.priority)
    .slice(0, PHYSICS_LIMITS.maxOverlappingFields);

  for (const { field, weight } of active) {
    const effect = field.effect;
    switch (effect.kind) {
      case "gravity":
        gravity = add(scaleVector(gravity, 1 - weight), scaleVector(effect.vector, weight));
        break;
      case "wind":
        wind = add(wind, scaleVector(effect.vector, weight * (1 + effect.turbulence * turbulence)));
        break;
      case "vortex": {
        const pull = direction(safePosition, effect.center);
        const spin: PhysicsVector = [-pull[2], 0, pull[0]];
        force = add(force, scaleVector(add(scaleVector(pull, effect.pullStrength), scaleVector(spin, effect.spinStrength)), weight));
        break;
      }
      case "time_scale":
        timeScale += (effect.scale - timeScale) * weight;
        break;
      case "zero_gravity":
        gravity = scaleVector(gravity, 1 - weight);
        drag += effect.damping * weight;
        break;
      case "buoyancy":
        buoyancy += effect.strength * weight;
        drag += effect.drag * weight;
        break;
      case "attract":
      case "repel": {
        const toward = direction(safePosition, effect.center);
        force = add(force, scaleVector(toward, effect.strength * weight * (effect.kind === "repel" ? -1 : 1)));
        break;
      }
      case "launch":
        force = add(force, scaleVector(effect.impulse, weight));
        break;
      case "movement_scale":
        horizontal *= 1 + (effect.horizontal - 1) * weight;
        vertical *= 1 + (effect.vertical - 1) * weight;
        break;
    }
  }

  return {
    gravity: clampMagnitude(gravity, 50),
    wind: clampMagnitude(wind, 60),
    timeScale: clamp(timeScale, 1, PHYSICS_LIMITS.globalTimeScale),
    buoyancy: clamp(buoyancy, 0, PHYSICS_LIMITS.buoyancy),
    drag: clamp(drag, 0, [0, 12]),
    force: clampMagnitude(force, 80),
    movementScale: { horizontal: clamp(horizontal, 1, [0, 4]), vertical: clamp(vertical, 1, [0, 4]) },
    activeFieldIds: active.map(({ field }) => field.id),
  };
}

export function resolveSurfaceReaction(
  profile: RuntimePhysicsProfile,
  materialId: string,
): RuntimeSurfacePhysics {
  return profile.materials.find(({ id }) => id === materialId) ?? profile.materials[0] ?? DEFAULT_PROFILE.materials[0]!;
}

function easedProgress(easing: RuntimePhysicsTransition["easing"], progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  if (easing === "linear") return clamped;
  const smooth = clamped * clamped * (3 - 2 * clamped);
  if (easing === "smooth") return smooth;
  return Math.min(1, Math.max(0, smooth + Math.sin(clamped * Math.PI * 4) * 0.025 * (1 - clamped)));
}

/** Produces a new profile at a story transition timestamp; the source remains immutable. */
export function applyPhysicsTransition(
  profile: RuntimePhysicsProfile,
  transitionId: string,
  elapsedMs: number,
): RuntimePhysicsProfile {
  const transition = profile.transitions.find(({ id }) => id === transitionId);
  if (!transition) return profile;
  const progress = easedProgress(transition.easing, elapsedMs / transition.durationMs);
  let gravity = profile.world.gravity;
  let globalTimeScale = profile.world.globalTimeScale;
  let windStrength = profile.world.windStrength;
  for (const change of transition.changes) {
    if (change.target === "world.gravity") {
      gravity = [
        gravity[0] + (change.value[0] - gravity[0]) * progress,
        gravity[1] + (change.value[1] - gravity[1]) * progress,
        gravity[2] + (change.value[2] - gravity[2]) * progress,
      ];
    } else if (change.target === "world.globalTimeScale") {
      globalTimeScale += (change.value - globalTimeScale) * progress;
    } else {
      windStrength += (change.value - windStrength) * progress;
    }
  }
  return {
    ...profile,
    world: { ...profile.world, gravity, globalTimeScale, windStrength },
  };
}
