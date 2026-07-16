import * as THREE from "three";
import { describe, expect, it } from "vitest";

import example from "../../schemas/dream-spec-v1.example.json";
import { DreamSpecV1Schema } from "../dream/schema";
import { compileDreamAtmosphere } from "./dreamAtmosphere";
import { createThreeDreamAtmosphere } from "./threeDreamAtmosphere";

const spec = DreamSpecV1Schema.parse(example);

describe("createThreeDreamAtmosphere", () => {
  it("binds bounded procedural sky, fog, lights, and one particle Points object", () => {
    const scene = new THREE.Scene();
    const plan = compileDreamAtmosphere(spec, { quality: "high" });
    const controller = createThreeDreamAtmosphere(scene, plan, spec.seed);

    expect(scene.background).toBeInstanceOf(THREE.Color);
    expect(scene.fog).toBeInstanceOf(THREE.Fog);
    expect(scene.children.filter((child) => child instanceof THREE.Points)).toHaveLength(1);
    expect(controller.getParticleCount()).toBeLessThanOrEqual(500);

    controller.dispose();
    expect(scene.children).toHaveLength(0);
  });

  it("applies only known patches and completes a bounded transition", () => {
    const scene = new THREE.Scene();
    const plan = compileDreamAtmosphere(spec, { quality: "balanced" });
    const controller = createThreeDreamAtmosphere(scene, plan, spec.seed);

    expect(controller.transitionTo("unknown-patch")).toBe(false);
    expect(controller.transitionTo(plan.patches[0]!.id, 500)).toBe(true);
    for (let step = 0; step < 5; step += 1) controller.update(0.1);

    const fog = scene.fog as THREE.Fog;
    expect(fog.color.getHex()).toBe(plan.patches[0]!.state.fog.color);
    expect(controller.getParticleCount()).toBe(plan.patches[0]!.particles.count);
    controller.dispose();
  });
});
