import { describe, expect, it } from "vitest";

import {
  PHYSICS_LIMITS,
  applyPhysicsTransition,
  createSafePhysicsProfile,
  resolvePhysicsAtPoint,
  resolveSurfaceReaction,
} from "./physicsProfile";

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

  it("resolves the three highest-priority local fields into finite forces", () => {
    const profile = createSafePhysicsProfile({
      world: {
        gravity: [0, -10, 0],
        globalTimeScale: 1,
        windDirection: [1, 0, 0],
        windStrength: 2,
        windTurbulence: 0.25,
      },
      fields: [
        {
          id: "slow",
          shape: { kind: "sphere", center: [0, 0, 0], radius: 10 },
          priority: 5,
          blendDistance: 0,
          enabled: true,
          effect: { kind: "time_scale", scale: 0.5 },
        },
        {
          id: "vortex",
          shape: { kind: "sphere", center: [0, 0, 0], radius: 10 },
          priority: 4,
          blendDistance: 0,
          enabled: true,
          effect: {
            kind: "vortex",
            center: [0, 0, 0],
            pullStrength: 8,
            spinStrength: 4,
          },
        },
        {
          id: "float",
          shape: { kind: "sphere", center: [0, 0, 0], radius: 10 },
          priority: 3,
          blendDistance: 0,
          enabled: true,
          effect: { kind: "buoyancy", strength: 12, drag: 1 },
        },
        {
          id: "ignored-fourth",
          shape: { kind: "sphere", center: [0, 0, 0], radius: 10 },
          priority: 2,
          blendDistance: 0,
          enabled: true,
          effect: { kind: "repel", center: [0, 0, 0], strength: 30 },
        },
      ],
    });

    const resolved = resolvePhysicsAtPoint(profile, [2, 0, 0], 1_000);

    expect(resolved.activeFieldIds).toEqual(["slow", "vortex", "float"]);
    expect(resolved.gravity).toEqual([0, -10, 0]);
    expect(resolved.timeScale).toBe(0.5);
    expect(resolved.buoyancy).toBe(12);
    expect(resolved.drag).toBeGreaterThan(1);
    expect(resolved.force.every(Number.isFinite)).toBe(true);
    expect(resolved.force).not.toEqual([0, 0, 0]);
  });

  it("keeps attract and repel fields directional and bounded near their centers", () => {
    const baseField = {
      shape: { kind: "sphere" as const, center: [0, 0, 0] as const, radius: 10 },
      priority: 1,
      blendDistance: 0,
      enabled: true,
    };
    const attract = createSafePhysicsProfile({
      fields: [
        {
          ...baseField,
          id: "attract",
          effect: { kind: "attract", center: [0, 0, 0], strength: 10 },
        },
      ],
    });
    const repel = createSafePhysicsProfile({
      fields: [
        {
          ...baseField,
          id: "repel",
          effect: { kind: "repel", center: [0, 0, 0], strength: 10 },
        },
      ],
    });

    expect(resolvePhysicsAtPoint(attract, [2, 0, 0]).force[0]).toBeLessThan(0);
    expect(resolvePhysicsAtPoint(repel, [2, 0, 0]).force[0]).toBeGreaterThan(0);
    expect(resolvePhysicsAtPoint(attract, [0, 0, 0]).force).toEqual([0, 0, 0]);
  });

  it("recovers non-finite point state before it reaches the motor or camera", () => {
    const resolved = resolvePhysicsAtPoint(
      createSafePhysicsProfile({ world: { windTurbulence: 1 } }),
      [Number.NaN, Number.POSITIVE_INFINITY, 0],
      Number.NaN,
    );

    expect([
      ...resolved.gravity,
      ...resolved.wind,
      ...resolved.force,
      resolved.timeScale,
      resolved.buoyancy,
      resolved.drag,
    ].every(Number.isFinite)).toBe(true);
  });

  it("clamps abilities, field effects, and material reactions at the trusted boundary", () => {
    const profile = createSafePhysicsProfile({
      player: {
        abilities: {
          dash: { speed: 500, durationMs: 5, cooldownMs: -1 },
          glide: { fallSpeed: 500, gravityScale: -2 },
          flight: { speed: Number.POSITIVE_INFINITY },
          swim: { speed: 50, buoyancy: 500, drag: 50 },
        },
      },
      materials: [
        {
          id: "hostile",
          friction: 99,
          restitution: 99,
          movementMultiplier: -4,
          jumpMultiplier: 20,
          sinkDepth: 20,
          sinkSpeed: 20,
          conveyorVelocity: [Number.NaN, 0, 0],
          damagePerSecond: 500,
          healingPerSecond: 500,
          crumbleAfterMs: 1,
          respawnAfterMs: 100_000,
          contactEffect: "bounce",
        },
      ],
      fields: Array.from({ length: 20 }, (_, index) => ({
        id: `field-${index}`,
        shape: { kind: "sphere" as const, center: [0, 0, 0] as const, radius: 1_000 },
        priority: 1_000,
        blendDistance: 1_000,
        enabled: true,
        effect: { kind: "attract" as const, center: [0, 0, 0] as const, strength: 1_000 },
      })),
    });

    expect(profile.fields).toHaveLength(PHYSICS_LIMITS.fieldCount);
    expect(profile.player.abilities.dash).toEqual({ speed: 30, durationMs: 50, cooldownMs: 0 });
    expect(profile.player.abilities.glide).toEqual({ fallSpeed: 20, gravityScale: 0 });
    expect(profile.player.abilities.flight).toEqual({ speed: 10 });
    expect(profile.player.abilities.swim).toEqual({ speed: 18, buoyancy: 50, drag: 8 });
    expect(resolveSurfaceReaction(profile, "hostile")).toMatchObject({
      friction: 4,
      restitution: 2,
      movementMultiplier: 0,
      jumpMultiplier: 4,
      conveyorVelocity: [0, 0, 0],
      damagePerSecond: 100,
      healingPerSecond: 100,
      crumbleAfterMs: 100,
      respawnAfterMs: 60_000,
    });
  });

  it("interpolates story transitions without mutating the source profile", () => {
    const profile = createSafePhysicsProfile({
      world: { gravity: [0, -20, 0], globalTimeScale: 1, windStrength: 0 },
      transitions: [
        {
          id: "climax",
          durationMs: 1_000,
          easing: "linear",
          changes: [
            { target: "world.gravity", value: [0, 8, 0] },
            { target: "world.globalTimeScale", value: 0.5 },
            { target: "world.wind.strength", value: 12 },
          ],
        },
      ],
    });

    const halfway = applyPhysicsTransition(profile, "climax", 500);

    expect(halfway.world.gravity).toEqual([0, -6, 0]);
    expect(halfway.world.globalTimeScale).toBe(0.75);
    expect(halfway.world.windStrength).toBe(6);
    expect(profile.world.gravity).toEqual([0, -20, 0]);
  });
});
