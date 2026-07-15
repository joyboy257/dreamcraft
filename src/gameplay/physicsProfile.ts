export type PhysicsVector = readonly [number, number, number];

export interface PhysicsComfortSettings {
  readonly reducedMotion?: boolean;
  readonly stableHorizon?: boolean;
  readonly reducedFovChanges?: boolean;
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
  };
  readonly world: {
    readonly gravity: PhysicsVector;
    readonly terminalVelocity: number;
    readonly globalTimeScale: number;
    readonly globalDrag: number;
    readonly windDirection: PhysicsVector;
    readonly windStrength: number;
  };
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
  },
  world: {
    gravity: [0, -20, 0],
    terminalVelocity: 42,
    globalTimeScale: 1,
    globalDrag: 0.02,
    windDirection: [1, 0, 0],
    windStrength: 0,
  },
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
    },
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
