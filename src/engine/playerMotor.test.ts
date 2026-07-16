import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYER_CONFIG, PlayerMotor, playerIntersectsSolid } from "./playerMotor";

function flatWorld(blockAtY = 0) {
  return {
    isSolid: (_x: number, y: number) => y <= blockAtY,
  };
}

describe("player collision and motor", () => {
  it("detects AABB overlap without treating a touching floor as overlap", () => {
    const world = flatWorld(0);

    expect(playerIntersectsSolid({ x: 0.5, y: 1, z: 0.5 }, DEFAULT_PLAYER_CONFIG, world)).toBe(false);
    expect(playerIntersectsSolid({ x: 0.5, y: 0.9, z: 0.5 }, DEFAULT_PLAYER_CONFIG, world)).toBe(true);
  });

  it("lands on solid voxels and never tunnels through the floor", () => {
    const motor = new PlayerMotor({ x: 0.5, y: 4, z: 0.5 });
    const world = flatWorld(0);

    for (let frame = 0; frame < 180; frame += 1) {
      motor.step({ moveX: 0, moveZ: 0, sprint: false, jump: false }, 1 / 60, frame * 16.7, world);
    }

    expect(motor.state.position.y).toBeCloseTo(1, 4);
    expect(motor.state.grounded).toBe(true);
  });

  it("honors buffered jump input as soon as the player lands", () => {
    const motor = new PlayerMotor({ x: 0.5, y: 1.08, z: 0.5 });
    const world = flatWorld(0);

    motor.step({ moveX: 0, moveZ: 0, sprint: false, jump: true }, 1 / 60, 0, world);
    for (let frame = 1; frame < 8 && motor.state.velocity.y <= 0; frame += 1) {
      motor.step(
        { moveX: 0, moveZ: 0, sprint: false, jump: false },
        1 / 60,
        frame * 16.7,
        world,
      );
    }

    expect(motor.state.velocity.y).toBeGreaterThan(0);
    expect(motor.state.grounded).toBe(false);
  });

  it("recovers non-finite or void state to its safe spawn", () => {
    const motor = new PlayerMotor({ x: 2, y: 8, z: 3 });
    motor.state.position.x = Number.NaN;

    motor.step({ moveX: 0, moveZ: 0, sprint: false, jump: false }, 1 / 60, 0, flatWorld());

    expect(motor.state.position).toEqual({ x: 2, y: 8, z: 3 });
    expect(motor.state.recoveries).toBe(1);
  });

  it("applies bounded gravity vectors, wind, buoyancy, drag, and time scale", () => {
    const motor = new PlayerMotor(
      { x: 0, y: 8, z: 0 },
      { gravity: 0, airAcceleration: 0, globalDrag: 0 },
    );

    motor.step(
      { moveX: 0, moveZ: 0, sprint: false, jump: false },
      0.05,
      0,
      { isSolid: () => false },
      {
        gravity: [10, -20, 0],
        wind: [0, 0, 4],
        force: [2, 0, 0],
        timeScale: 0.5,
        buoyancy: 8,
        drag: 1,
      },
    );

    expect(motor.state.velocity.x).toBeGreaterThan(0);
    expect(motor.state.velocity.y).toBeLessThan(0);
    expect(motor.state.velocity.z).toBeGreaterThan(0);
    expect(Object.values(motor.state.velocity).every(Number.isFinite)).toBe(true);
    expect(motor.state.position.y).toBeGreaterThan(7.9);
  });

  it("supports dash cooldown plus glide, flight, and swimming controls", () => {
    const motor = new PlayerMotor(
      { x: 0, y: 8, z: 0 },
      {
        gravity: 20,
        dash: { speed: 14, durationMs: 180, cooldownMs: 600 },
        glide: { fallSpeed: 3, gravityScale: 0.2 },
        flight: { speed: 9 },
        swim: { speed: 5, buoyancy: 16, drag: 2 },
      },
    );
    const emptyWorld = { isSolid: () => false };

    motor.step(
      { moveX: 1, moveZ: 0, sprint: false, jump: false, dash: true },
      1 / 60,
      0,
      emptyWorld,
    );
    expect(motor.state.velocity.x).toBeGreaterThan(10);

    motor.state.velocity.y = -20;
    motor.step(
      { moveX: 0, moveZ: 0, sprint: false, jump: false, glide: true },
      1 / 60,
      100,
      emptyWorld,
    );
    expect(motor.state.velocity.y).toBeGreaterThanOrEqual(-3);

    motor.step(
      { moveX: 0, moveY: 1, moveZ: 0, sprint: false, jump: false, fly: true },
      0.05,
      200,
      emptyWorld,
    );
    expect(motor.state.velocity.y).toBeGreaterThan(0);

    motor.step(
      { moveX: 0, moveY: 1, moveZ: 0, sprint: false, jump: false, swim: true },
      0.05,
      300,
      emptyWorld,
      { swimming: true },
    );
    expect(motor.state.velocity.y).toBeGreaterThan(0);
    expect(Object.values(motor.state.velocity).every(Number.isFinite)).toBe(true);
  });

  it("applies bounded sticky, slippery, conveyor, and bounce surface reactions", () => {
    const motor = new PlayerMotor({ x: 0.5, y: 2, z: 0.5 }, { gravity: 30 });
    const surface = {
      friction: 0.05,
      restitution: 0.8,
      movementMultiplier: 0.5,
      jumpMultiplier: 1,
      conveyorVelocity: [3, 0, 0] as const,
      contactEffect: "bounce" as const,
    };

    for (let frame = 0; frame < 30; frame += 1) {
      motor.step(
        { moveX: 0, moveZ: 0, sprint: false, jump: false },
        1 / 60,
        frame * 16.7,
        flatWorld(0),
        { surface },
      );
    }

    expect(motor.state.position.x).toBeGreaterThan(0.5);
    expect(motor.state.position.y).toBeGreaterThan(1);
    expect(motor.state.grounded).toBe(false);
  });
});
