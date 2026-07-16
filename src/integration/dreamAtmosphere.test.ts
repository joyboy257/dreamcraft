import { describe, expect, it } from "vitest";

import example from "../../schemas/dream-spec-v1.example.json";
import { DreamSpecV1Schema } from "../dream/schema";
import {
  compileDreamAtmosphere,
  sampleAtmosphereTransition,
} from "./dreamAtmosphere";

const spec = DreamSpecV1Schema.parse(example);

describe("compileDreamAtmosphere", () => {
  it("turns trusted DreamSpec atmosphere into a bounded desktop runtime plan", () => {
    const plan = compileDreamAtmosphere(spec, { quality: "high" });

    expect(plan.initial.fog.far).toBeGreaterThan(plan.initial.fog.near);
    expect(plan.particles.count).toBeLessThanOrEqual(500);
    expect(plan.particles.kind).toMatch(/^(ash|bubbles|dust|embers|fireflies|mist|motes|petals|rain|snow|sparkles|stars)$/);
    expect(plan.patches).toHaveLength(spec.atmosphere.patches.length);
    expect(plan.patches.length).toBeLessThanOrEqual(8);
  });

  it("applies reduced-motion and reduced-quality caps after generated values", () => {
    const candidate = structuredClone(spec);
    candidate.budgets.particles = 500;
    candidate.atmosphere.particleDensity = 100_000;
    candidate.atmosphere.wobbleStrength = 100;
    candidate.atmosphere.pulseSpeed = 100;

    const plan = compileDreamAtmosphere(candidate, {
      quality: "reduced",
      reducedMotion: true,
    });

    expect(plan.particles.count).toBeLessThanOrEqual(48);
    expect(plan.particles.speed).toBe(0);
    expect(plan.motion).toEqual({ pulseHz: 0, wobbleStrength: 0 });
    expect(plan.transitionDurationMs).toBe(0);
  });

  it("interpolates colors, fog, and light without overshooting either state", () => {
    const plan = compileDreamAtmosphere(spec, { quality: "balanced" });
    const patch = plan.patches[0];
    expect(patch).toBeDefined();

    const halfway = sampleAtmosphereTransition(plan.initial, patch!.state, 0.5);

    expect(halfway.fog.near).toBeGreaterThanOrEqual(Math.min(plan.initial.fog.near, patch!.state.fog.near));
    expect(halfway.fog.near).toBeLessThanOrEqual(Math.max(plan.initial.fog.near, patch!.state.fog.near));
    expect(halfway.ambient.intensity).toBeGreaterThanOrEqual(0);
    expect(halfway.sky.top).toBeGreaterThanOrEqual(0);
    expect(halfway.sky.top).toBeLessThanOrEqual(0xffffff);
  });
});
