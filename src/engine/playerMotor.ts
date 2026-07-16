export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SolidWorld {
  isSolid(x: number, y: number, z: number): boolean;
}

export interface PlayerMotorConfig {
  radius: number;
  height: number;
  walkSpeed: number;
  sprintSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  gravity: number;
  jumpVelocity: number;
  terminalVelocity: number;
  coyoteTimeMs: number;
  jumpBufferMs: number;
  voidY: number;
  globalDrag: number;
  dash?: { speed: number; durationMs: number; cooldownMs: number };
  glide?: { fallSpeed: number; gravityScale: number };
  flight?: { speed: number };
  swim?: { speed: number; buoyancy: number; drag: number };
}

export interface PlayerInput {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  jump: boolean;
  moveY?: number;
  dash?: boolean;
  glide?: boolean;
  fly?: boolean;
  swim?: boolean;
}

export interface PlayerSurfaceReaction {
  readonly friction: number;
  readonly restitution: number;
  readonly movementMultiplier: number;
  readonly jumpMultiplier: number;
  readonly conveyorVelocity: readonly [number, number, number];
  readonly contactEffect: "none" | "bounce" | "launch" | "stick" | "slide" | "slow" | "speed" | "float" | "teleport" | "transform";
}

export interface PlayerMotorEnvironment {
  readonly gravity?: readonly [number, number, number];
  readonly wind?: readonly [number, number, number];
  readonly force?: readonly [number, number, number];
  readonly timeScale?: number;
  readonly buoyancy?: number;
  readonly drag?: number;
  readonly movementScale?: { readonly horizontal: number; readonly vertical: number };
  readonly swimming?: boolean;
  readonly surface?: PlayerSurfaceReaction;
}

export interface PlayerState {
  position: Vec3;
  velocity: Vec3;
  grounded: boolean;
  recoveries: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerMotorConfig = {
  radius: 0.32,
  height: 1.75,
  walkSpeed: 5.2,
  sprintSpeed: 8,
  groundAcceleration: 32,
  airAcceleration: 10,
  gravity: 24,
  jumpVelocity: 8.2,
  terminalVelocity: 38,
  coyoteTimeMs: 120,
  jumpBufferMs: 140,
  voidY: -12,
  globalDrag: 0,
};

const COLLISION_EPSILON = 0.000_01;

function moveToward(current: number, target: number, maximumDelta: number): number {
  if (Math.abs(target - current) <= maximumDelta) return target;
  return current + Math.sign(target - current) * maximumDelta;
}

function isFiniteVector(value: Vec3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
}

function clamp(value: number | undefined, fallback: number, minimum: number, maximum: number): number {
  const finite = value !== undefined && Number.isFinite(value) ? value : fallback;
  return Math.min(maximum, Math.max(minimum, finite));
}

function safeTuple(
  value: readonly [number, number, number] | undefined,
  fallback: readonly [number, number, number],
  maximumMagnitude: number,
): readonly [number, number, number] {
  if (!value || value.some((part) => !Number.isFinite(part))) return fallback;
  const magnitude = Math.hypot(...value);
  if (magnitude === 0 || magnitude <= maximumMagnitude) return value;
  const scale = maximumMagnitude / magnitude;
  return [value[0] * scale, value[1] * scale, value[2] * scale];
}

export function playerIntersectsSolid(
  position: Vec3,
  config: Pick<PlayerMotorConfig, "radius" | "height">,
  world: SolidWorld,
): boolean {
  const minX = Math.floor(position.x - config.radius + COLLISION_EPSILON);
  const maxX = Math.floor(position.x + config.radius - COLLISION_EPSILON);
  const minY = Math.floor(position.y + COLLISION_EPSILON);
  const maxY = Math.floor(position.y + config.height - COLLISION_EPSILON);
  const minZ = Math.floor(position.z - config.radius + COLLISION_EPSILON);
  const maxZ = Math.floor(position.z + config.radius - COLLISION_EPSILON);

  for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        if (world.isSolid(x, y, z)) return true;
      }
    }
  }
  return false;
}

export class PlayerMotor {
  readonly state: PlayerState;
  private readonly spawn: Vec3;
  private readonly config: PlayerMotorConfig;
  private lastGroundedAt = Number.NEGATIVE_INFINITY;
  private jumpQueuedAt = Number.NEGATIVE_INFINITY;
  private lastDashAt = Number.NEGATIVE_INFINITY;
  private dashUntil = Number.NEGATIVE_INFINITY;
  private dashHeld = false;

  constructor(spawn: Vec3, config: Partial<PlayerMotorConfig> = {}) {
    this.spawn = { ...spawn };
    this.config = { ...DEFAULT_PLAYER_CONFIG, ...config };
    this.state = {
      position: { ...spawn },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: false,
      recoveries: 0,
    };
  }

  step(
    input: PlayerInput,
    deltaSeconds: number,
    nowMs: number,
    world: SolidWorld,
    environment: PlayerMotorEnvironment = {},
  ): void {
    if (!isFiniteVector(this.state.position) || !isFiniteVector(this.state.velocity) || this.state.position.y < this.config.voidY) {
      this.recover();
      return;
    }

    const timeScale = clamp(environment.timeScale, 1, 0.35, 1.75);
    const delta = Math.max(0, Math.min(0.05, Number.isFinite(deltaSeconds) ? deltaSeconds : 0)) * timeScale;
    if (input.jump) this.jumpQueuedAt = nowMs;

    this.state.grounded = playerIntersectsSolid(
      { ...this.state.position, y: this.state.position.y - 0.03 },
      this.config,
      world,
    );
    if (this.state.grounded) this.lastGroundedAt = nowMs;

    const moveX = clamp(input.moveX, 0, -1, 1);
    const moveY = clamp(input.moveY, 0, -1, 1);
    const moveZ = clamp(input.moveZ, 0, -1, 1);
    const magnitude = Math.hypot(moveX, moveZ);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const surface = this.state.grounded ? environment.surface : undefined;
    const contactMovement = surface?.contactEffect === "stick" ? 0
      : surface?.contactEffect === "slow" ? 0.5
        : surface?.contactEffect === "speed" ? 1.75
          : 1;
    const surfaceMovement = clamp(surface?.movementMultiplier, 1, 0, 4) * contactMovement;
    const horizontalScale = clamp(environment.movementScale?.horizontal, 1, 0, 4);
    const speed = (input.sprint ? this.config.sprintSpeed : this.config.walkSpeed) * surfaceMovement * horizontalScale;
    const conveyor = safeTuple(surface?.conveyorVelocity, [0, 0, 0], 30);
    const targetX = moveX * scale * speed + conveyor[0];
    const targetZ = moveZ * scale * speed + conveyor[2];
    const friction = surface?.contactEffect === "slide"
      ? 0.05
      : clamp(surface?.friction, 1, 0, 4);
    const acceleration = (this.state.grounded ? this.config.groundAcceleration : this.config.airAcceleration)
      * (this.state.grounded ? Math.max(0.1, friction) : 1);

    const dash = this.config.dash;
    const dashPressed = input.dash === true;
    if (dash && dashPressed && !this.dashHeld && nowMs - this.lastDashAt >= clamp(dash.cooldownMs, 700, 0, 10_000)) {
      const currentDirectionMagnitude = Math.hypot(moveX, moveZ);
      const dashX = currentDirectionMagnitude > 0 ? moveX / currentDirectionMagnitude : 0;
      const dashZ = currentDirectionMagnitude > 0 ? moveZ / currentDirectionMagnitude : 1;
      const dashSpeed = clamp(dash.speed, 12, 1, 30);
      this.state.velocity.x = dashX * dashSpeed;
      this.state.velocity.z = dashZ * dashSpeed;
      this.lastDashAt = nowMs;
      this.dashUntil = nowMs + clamp(dash.durationMs, 180, 50, 1_500);
    }
    this.dashHeld = dashPressed;
    if (nowMs >= this.dashUntil) {
      this.state.velocity.x = moveToward(this.state.velocity.x, targetX, acceleration * delta);
      this.state.velocity.z = moveToward(this.state.velocity.z, targetZ, acceleration * delta);
    }

    this.tryConsumeJump(nowMs, clamp(surface?.jumpMultiplier, 1, 0, 4));
    const flying = input.fly === true && this.config.flight !== undefined;
    const swimming = (environment.swimming === true || input.swim === true) && this.config.swim !== undefined;
    const gliding = input.glide === true && this.config.glide !== undefined && this.state.velocity.y < 0;
    const gravity = safeTuple(environment.gravity, [0, -this.config.gravity, 0], 50);
    const wind = safeTuple(environment.wind, [0, 0, 0], 60);
    const force = safeTuple(environment.force, [0, 0, 0], 80);
    let gravityScale = flying ? 0 : gliding ? clamp(this.config.glide?.gravityScale, 0.25, 0, 1) : 1;
    if (swimming) gravityScale *= 0.35;
    const configuredBuoyancy = swimming ? clamp(this.config.swim?.buoyancy, 12, -50, 50) : 0;
    const surfaceBuoyancy = surface?.contactEffect === "float" ? 10 : 0;
    const buoyancy = clamp(environment.buoyancy, 0, -50, 50) + configuredBuoyancy + surfaceBuoyancy;
    this.state.velocity.x += (gravity[0] * gravityScale + wind[0] + force[0]) * delta;
    this.state.velocity.y += (gravity[1] * gravityScale + wind[1] + force[1] + buoyancy) * delta;
    this.state.velocity.z += (gravity[2] * gravityScale + wind[2] + force[2]) * delta;

    if (flying) {
      const flightSpeed = clamp(this.config.flight?.speed, 10, 0.5, 18);
      this.state.velocity.y = moveY * flightSpeed;
    } else if (swimming) {
      const swimSpeed = clamp(this.config.swim?.speed, 6, 0.5, 18);
      this.state.velocity.y = moveToward(this.state.velocity.y, moveY * swimSpeed, this.config.airAcceleration * delta);
    }

    const totalDrag = clamp(environment.drag, 0, 0, 12)
      + clamp(this.config.globalDrag, 0, 0, 8)
      + (swimming ? clamp(this.config.swim?.drag, 2, 0, 8) : 0);
    const dragFactor = Math.exp(-totalDrag * delta);
    this.state.velocity.x *= dragFactor;
    this.state.velocity.y *= dragFactor;
    this.state.velocity.z *= dragFactor;
    if (gliding) {
      this.state.velocity.y = Math.max(this.state.velocity.y, -clamp(this.config.glide?.fallSpeed, 4, 0.5, 20));
    }
    const terminalVelocity = clamp(this.config.terminalVelocity, 38, 5, 80);
    this.state.velocity.x = clamp(this.state.velocity.x, 0, -80, 80);
    this.state.velocity.y = clamp(this.state.velocity.y, 0, -terminalVelocity, 80);
    this.state.velocity.z = clamp(this.state.velocity.z, 0, -80, 80);

    const maximumMotion = Math.max(
      Math.abs(this.state.velocity.x * delta),
      Math.abs(this.state.velocity.y * delta),
      Math.abs(this.state.velocity.z * delta),
    );
    const substeps = Math.max(1, Math.min(12, Math.ceil(maximumMotion / 0.2)));
    const subDelta = delta / substeps;
    for (let step = 0; step < substeps; step += 1) {
      this.moveAxis("x", this.state.velocity.x * subDelta, world);
      this.moveAxis("z", this.state.velocity.z * subDelta, world);
      const movingDown = this.state.velocity.y <= 0;
      const impactVelocity = this.state.velocity.y;
      if (!this.moveAxis("y", this.state.velocity.y * subDelta, world)) {
        if (movingDown) {
          const restitution = clamp(environment.surface?.restitution, 0, 0, 2);
          const launch = environment.surface?.contactEffect === "launch";
          const shouldBounce = environment.surface?.contactEffect === "bounce" || restitution > 0;
          if (launch) {
            this.state.velocity.y = clamp(this.config.jumpVelocity, 8.2, 2, 22)
              * clamp(environment.surface?.jumpMultiplier, 1, 0, 4);
            this.state.grounded = false;
          } else if (shouldBounce && Math.abs(impactVelocity) > 0.5) {
            this.state.velocity.y = Math.abs(impactVelocity) * Math.max(0.1, restitution);
            this.state.grounded = false;
          } else {
            this.state.grounded = true;
            this.lastGroundedAt = nowMs;
            this.state.velocity.y = 0;
          }
        } else {
          this.state.velocity.y = 0;
        }
      }
    }
    this.tryConsumeJump(nowMs, clamp(environment.surface?.jumpMultiplier, 1, 0, 4));
    if (!isFiniteVector(this.state.position) || !isFiniteVector(this.state.velocity)) this.recover();
  }

  recover(): void {
    this.state.position = { ...this.spawn };
    this.state.velocity = { x: 0, y: 0, z: 0 };
    this.state.grounded = false;
    this.state.recoveries += 1;
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpQueuedAt = Number.NEGATIVE_INFINITY;
    this.lastDashAt = Number.NEGATIVE_INFINITY;
    this.dashUntil = Number.NEGATIVE_INFINITY;
    this.dashHeld = false;
  }

  private tryConsumeJump(nowMs: number, jumpMultiplier = 1): void {
    const buffered = nowMs - this.jumpQueuedAt <= this.config.jumpBufferMs;
    const canJump = this.state.grounded || nowMs - this.lastGroundedAt <= this.config.coyoteTimeMs;
    if (!buffered || !canJump) return;

    this.state.velocity.y = clamp(this.config.jumpVelocity, 8.2, 2, 22)
      * clamp(jumpMultiplier, 1, 0, 4);
    this.state.grounded = false;
    this.jumpQueuedAt = Number.NEGATIVE_INFINITY;
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
  }

  private moveAxis(axis: keyof Vec3, distance: number, world: SolidWorld): boolean {
    if (distance === 0) return true;
    const before = this.state.position[axis];
    this.state.position[axis] = before + distance;
    if (!playerIntersectsSolid(this.state.position, this.config, world)) return true;

    this.state.position[axis] = before;
    if (axis !== "y") this.state.velocity[axis] = 0;
    return false;
  }
}
