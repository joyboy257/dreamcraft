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
});
