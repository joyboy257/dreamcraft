# Dream Physics DSL

## Goal

Dream physics should be expressive enough to represent surreal rules without exposing an arbitrary simulation language.

A dream can combine:

- Player motor feel
- Global gravity/wind/time
- Surface reactions
- Local fields
- Entity auras
- Story-triggered transitions
- Limited dynamic props
- User comfort overrides

## Top-level specification

```ts
interface DreamPhysicsSpec {
  player: PlayerMotorSpec;
  world: WorldPhysicsSpec;
  materials: SurfacePhysicsSpec[];
  fields: PhysicsFieldSpec[];
  transitions: PhysicsTransitionSpec[];
  dynamicBodies: DynamicBodyRules;
  gameFeel: GameFeelSpec;
}
```

## Player motor

```ts
interface PlayerMotorSpec {
  body: {
    radius: number;
    height: number;
    mass: number;
    stepHeight: number;
    maxSlopeDegrees: number;
    groundSnapDistance: number;
  };

  movement: {
    walkSpeed: number;
    sprintSpeed: number;
    groundAcceleration: number;
    groundDeceleration: number;
    airAcceleration: number;
    groundFriction: number;
    airDrag: number;
    turnResponsiveness: number;
  };

  jump: {
    jumpVelocity: number;
    coyoteTimeMs: number;
    jumpBufferMs: number;
    variableHeight: boolean;
    releaseGravityMultiplier: number;
    maxAirJumps: 0 | 1 | 2;
  };

  abilities: {
    crouch: boolean;
    dash?: DashSpec;
    glide?: GlideSpec;
    hover?: HoverSpec;
    wallJump?: WallJumpSpec;
    flight?: FlightSpec;
    swim?: SwimSpec;
  };
}
```

The shell implements abilities. The model selects bounded parameters.

## World physics

```ts
interface WorldPhysicsSpec {
  gravity: Vec3;
  terminalVelocity: number;
  globalTimeScale: number;
  airDensity: number;
  globalDrag: number;
  wind: {
    direction: Vec3;
    strength: number;
    turbulence: number;
  };
  defaultBuoyancy: number;
  voidBehaviour:
    | "respawn"
    | "soft_reset"
    | "endless_fall"
    | "teleport_above"
    | "dream_transition";
}
```

Gravity is a vector. The MVP may restrict arbitrary gravity orientation to designated zones while retaining downwards gravity as the stable default.

## Surface physics

```ts
interface SurfacePhysicsSpec {
  id: string;
  friction: number;
  restitution: number;
  movementMultiplier: number;
  jumpMultiplier: number;
  sinkDepth: number;
  sinkSpeed: number;
  conveyorVelocity: Vec3;
  damagePerSecond: number;
  healingPerSecond: number;
  crumbleAfterMs?: number;
  respawnAfterMs?: number;
  contactEffect:
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
}
```

Examples:

- Cotton candy: sink + soft bounce
- Licorice: sticky/high friction
- Ice: low friction
- Cloud: sink + launch
- Clock tile: temporary time-scale effect
- Money block: collectible burst effect

## Local fields

```ts
interface PhysicsFieldSpec {
  id: string;
  shape: FieldShape;
  priority: number;
  blendDistance: number;
  enabled: boolean;
  effect: FieldEffect;
}
```

```ts
type FieldEffect =
  | { kind: "gravity"; vector: Vec3 }
  | { kind: "wind"; vector: Vec3; turbulence: number }
  | { kind: "vortex"; center: Vec3; pullStrength: number; spinStrength: number }
  | { kind: "time_scale"; scale: number }
  | { kind: "zero_gravity"; damping: number }
  | { kind: "buoyancy"; strength: number; drag: number }
  | { kind: "repel"; center: Vec3; strength: number }
  | { kind: "attract"; center: Vec3; strength: number }
  | { kind: "launch"; impulse: Vec3 }
  | { kind: "movement_scale"; horizontal: number; vertical: number };
```

Only the highest-priority few overlapping fields apply. Blend across the boundary to avoid abrupt discomfort except when a deliberate snap is essential and comfort mode permits it.

## Entity auras

A trusted behavior may attach a field to an entity state:

```ts
interface EntityPhysicsAuraSpec {
  radius: number;
  activeWhen: "always" | "chasing" | "interacting" | "angry" | "story_active";
  effect: FieldEffect;
}
```

Examples:

- Nightmare slows time nearby
- Balloon creature creates upward buoyancy
- Black-hole cat attracts loose props
- Gummy guardian creates jelly-like drag

## Story transitions

```ts
interface PhysicsTransitionSpec {
  id: string;
  durationMs: number;
  easing: "linear" | "smooth" | "dream_wobble";
  changes: PhysicsChangeSpec[];
}
```

The DreamPlayGraph triggers transitions. A transition may modify global gravity/time/wind, enable fields, or change material properties.

Example climax:

```text
Chest opens
→ gravity fades
→ confetti rises
→ candy blocks become bouncy
→ guardian enters dance state
```

## Dynamic props

```ts
interface DynamicBodyRules {
  maximumActiveBodies: number;
  sleepAfterMs: number;
  simulationRadius: number;
}
```

```ts
interface SimpleDynamicBodySpec {
  shape: "sphere" | "aabb";
  mass: number;
  gravityScale: number;
  drag: number;
  restitution: number;
  friction: number;
  playerCanPush: boolean;
  maxSpeed: number;
}
```

Use for a small number of rolling, bouncing, floating, or stackable props. Do not simulate every voxel.

## Game feel

```ts
interface GameFeelSpec {
  headBob: number;
  landingCompression: number;
  fieldOfView: number;
  sprintFovIncrease: number;
  cameraRollResponse: number;
  cameraShake: number;
  hitStopMs: number;
  interactionPulse: number;
}
```

User comfort settings override generated values:

- Reduced camera shake
- Reduced roll
- Stable horizon
- Reduced FOV changes
- Reduced particle motion
- Reduced wobble

## Resolution order

```text
Base motor
→ global physics
→ active local fields by priority/blend
→ contacted surface
→ ability/story modifier
→ user comfort override
→ hard safety clamps
```

## Initial hard limits

```ts
const PHYSICS_LIMITS = {
  gravityMagnitude: [0, 50],
  globalTimeScale: [0.35, 1.75],
  walkSpeed: [1.5, 14],
  sprintSpeed: [2, 22],
  jumpVelocity: [2, 22],
  fieldCount: 12,
  maxOverlappingFields: 3,
  dynamicBodies: 32,
  terminalVelocity: [5, 80],
  transitionDurationMs: [100, 12_000],
};
```

Every frame checks non-finite state and clamps maximum velocity/acceleration. Invalid state triggers safe recovery rather than propagating NaNs into the camera or renderer.

## MVP vocabulary

Implement before stretch work:

- Gravity vectors
- Wind/turbulence
- Buoyancy and swim
- Time scale
- Vortex
- Attract/repel
- Bounce/sticky/slippery/conveyor/crumble materials
- Dash, glide, flight
- Coyote time and jump buffering
- Story transitions

Defer ropes, ragdolls, vehicles, fluid simulation, destructible meshes, and full arbitrary rigid bodies.
