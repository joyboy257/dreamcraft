import { describe, expect, it } from "vitest";

import { PHYSICS_LIMITS, createSafePhysicsProfile } from "./physicsProfile";

describe("createSafePhysicsProfile", () => {
  it("clamps hostile or non-finite physics inputs", () => {
    const profile = createSafePhysicsProfile({
      player: {
        radius: -10,
        walkSpeed: 500,
        sprintSpeed: Number.NaN,
        jumpVelocity: Number.POSITIVE_INFINITY,
      },
      world: {
        gravity: [500, 0, 0],
        globalTimeScale: 0,
        terminalVelocity: 500,
        windDirection: [0, 0, 0],
        windStrength: -3,
      },
      gameFeel: {
        fieldOfView: 180,
        cameraShake: 9,
      },
    });

    expect(profile.player.radius).toBe(PHYSICS_LIMITS.playerRadius[0]);
    expect(profile.player.walkSpeed).toBe(PHYSICS_LIMITS.walkSpeed[1]);
    expect(profile.player.sprintSpeed).toBe(profile.player.walkSpeed);
    expect(profile.player.jumpVelocity).toBe(7.8);
    expect(Math.hypot(...profile.world.gravity)).toBeCloseTo(
      PHYSICS_LIMITS.gravityMagnitude[1],
    );
    expect(profile.world.globalTimeScale).toBe(
      PHYSICS_LIMITS.globalTimeScale[0],
    );
    expect(profile.world.terminalVelocity).toBe(
      PHYSICS_LIMITS.terminalVelocity[1],
    );
    expect(profile.world.windDirection).toEqual([1, 0, 0]);
    expect(profile.world.windStrength).toBe(0);
    expect(profile.gameFeel.fieldOfView).toBe(PHYSICS_LIMITS.fieldOfView[1]);
    expect(profile.gameFeel.cameraShake).toBe(PHYSICS_LIMITS.cameraShake[1]);
  });

  it("applies comfort settings after generated values", () => {
    const profile = createSafePhysicsProfile(
      {
        gameFeel: {
          headBob: 0.1,
          sprintFovIncrease: 10,
          cameraRollResponse: 0.15,
          cameraShake: 0.3,
        },
      },
      { reducedMotion: true, stableHorizon: true },
    );

    expect(profile.gameFeel).toMatchObject({
      headBob: 0,
      sprintFovIncrease: 0,
      cameraRollResponse: 0,
      cameraShake: 0,
    });
  });
});
