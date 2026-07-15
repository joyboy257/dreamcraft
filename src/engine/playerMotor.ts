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
}

export interface PlayerInput {
  moveX: number;
  moveZ: number;
  sprint: boolean;
  jump: boolean;
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
};

const COLLISION_EPSILON = 0.000_01;

function moveToward(current: number, target: number, maximumDelta: number): number {
  if (Math.abs(target - current) <= maximumDelta) return target;
  return current + Math.sign(target - current) * maximumDelta;
}

function isFiniteVector(value: Vec3): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
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

  step(input: PlayerInput, deltaSeconds: number, nowMs: number, world: SolidWorld): void {
    if (!isFiniteVector(this.state.position) || !isFiniteVector(this.state.velocity) || this.state.position.y < this.config.voidY) {
      this.recover();
      return;
    }

    const delta = Math.max(0, Math.min(0.05, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
    if (input.jump) this.jumpQueuedAt = nowMs;

    this.state.grounded = playerIntersectsSolid(
      { ...this.state.position, y: this.state.position.y - 0.03 },
      this.config,
      world,
    );
    if (this.state.grounded) this.lastGroundedAt = nowMs;

    const magnitude = Math.hypot(input.moveX, input.moveZ);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const speed = input.sprint ? this.config.sprintSpeed : this.config.walkSpeed;
    const targetX = input.moveX * scale * speed;
    const targetZ = input.moveZ * scale * speed;
    const acceleration = this.state.grounded ? this.config.groundAcceleration : this.config.airAcceleration;
    this.state.velocity.x = moveToward(this.state.velocity.x, targetX, acceleration * delta);
    this.state.velocity.z = moveToward(this.state.velocity.z, targetZ, acceleration * delta);

    this.tryConsumeJump(nowMs);
    this.state.velocity.y = Math.max(
      -this.config.terminalVelocity,
      this.state.velocity.y - this.config.gravity * delta,
    );

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
      if (!this.moveAxis("y", this.state.velocity.y * subDelta, world)) {
        if (movingDown) {
          this.state.grounded = true;
          this.lastGroundedAt = nowMs;
        }
        this.state.velocity.y = 0;
      }
    }
    this.tryConsumeJump(nowMs);
  }

  recover(): void {
    this.state.position = { ...this.spawn };
    this.state.velocity = { x: 0, y: 0, z: 0 };
    this.state.grounded = false;
    this.state.recoveries += 1;
    this.lastGroundedAt = Number.NEGATIVE_INFINITY;
    this.jumpQueuedAt = Number.NEGATIVE_INFINITY;
  }

  private tryConsumeJump(nowMs: number): void {
    const buffered = nowMs - this.jumpQueuedAt <= this.config.jumpBufferMs;
    const canJump = this.state.grounded || nowMs - this.lastGroundedAt <= this.config.coyoteTimeMs;
    if (!buffered || !canJump) return;

    this.state.velocity.y = this.config.jumpVelocity;
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
