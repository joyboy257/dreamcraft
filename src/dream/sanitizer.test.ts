import example from "../../schemas/dream-spec-v1.example.json";
import { describe, expect, it } from "vitest";

import { DREAM_LIMITS } from "./limits";
import { sanitizeDreamSpec } from "./sanitizer";

describe("sanitizeDreamSpec", () => {
  it("returns structural issues instead of throwing for malformed input", () => {
    const result = sanitizeDreamSpec({ version: 1, title: "Incomplete" });

    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.code === "invalid_structure")).toBe(
      true,
    );
  });

  it("truncates arrays and clamps requested budgets to hard limits", () => {
    const candidate = structuredClone(example);
    const sourceBlock = candidate.blocks[1]!;
    candidate.blocks = Array.from({ length: 24 }, (_, index) => ({
      ...sourceBlock,
      id: `block_${index}`,
      displayName: `Block ${index}`,
    }));
    candidate.budgets.blockTypes = 24;
    candidate.budgets.structures = 99;
    candidate.budgets.particles = 50_000;
    candidate.world.radius = 64;
    candidate.world.height = 64;

    const result = sanitizeDreamSpec(candidate);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.spec.blocks).toHaveLength(DREAM_LIMITS.blockTypes);
    expect(result.spec.budgets.blockTypes).toBe(DREAM_LIMITS.blockTypes);
    expect(result.spec.budgets.structures).toBe(DREAM_LIMITS.structures);
    expect(result.spec.budgets.particles).toBe(DREAM_LIMITS.particles);
    expect(result.issues.some((issue) => issue.repaired)).toBe(true);
  });

  it("clamps an invalid preferred spawn into world bounds", () => {
    const candidate = structuredClone(example);
    candidate.player.preferredSpawn = [10_000, -500, Number.MAX_VALUE];

    const result = sanitizeDreamSpec(candidate);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const [x, y, z] = result.spec.player.preferredSpawn;
    expect(Math.abs(x)).toBeLessThanOrEqual(result.spec.world.radius - 2);
    expect(y).toBeGreaterThanOrEqual(1);
    expect(y).toBeLessThanOrEqual(result.spec.world.height - 3);
    expect(Math.abs(z)).toBeLessThanOrEqual(result.spec.world.radius - 2);
    expect(Math.hypot(x, z)).toBeLessThanOrEqual(result.spec.world.radius - 2);
  });

  it("adds a deterministic safe completion path when no ending is reachable", () => {
    const candidate = structuredClone(example);
    candidate.playGraph.beats = [];
    candidate.playGraph.endings = [];

    const result = sanitizeDreamSpec(candidate);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.spec.playGraph.beats).toHaveLength(1);
    expect(result.spec.playGraph.endings).toHaveLength(1);
    expect(result.spec.playGraph.beats[0]?.onComplete).toContainEqual({
      kind: "complete_experience",
      endingId: result.spec.playGraph.endings[0]?.id,
    });
    expect(result.issues.some(({ code }) => code === "completion_path_added")).toBe(true);
  });

  it("adds a completing beat when a reachable ending has no gameplay path", () => {
    const candidate = structuredClone(example);
    candidate.playGraph.beats = [];
    const ending = candidate.playGraph.endings[0]! as { condition: unknown };
    ending.condition = { kind: "always" };

    const result = sanitizeDreamSpec(candidate);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.spec.playGraph.beats[0]?.onComplete).toContainEqual({
      kind: "complete_experience",
      endingId: candidate.playGraph.endings[0]!.id,
    });
  });

  it("clamps nested geometry and path work budgets", () => {
    const candidate = structuredClone(example);
    const path = candidate.world.terrain.find(({ kind }) => kind === "path_bias") as {
      points: number[][];
    };
    path.points = Array.from({ length: 128 }, (_, index) => [index, index % 7]);
    candidate.structures[0]!.width = 1_000_000;
    candidate.entities[0]!.visual.scale = 1_000_000;

    const result = sanitizeDreamSpec(candidate);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const repairedPath = result.spec.world.terrain.find(({ kind }) => kind === "path_bias");
    expect(repairedPath?.kind === "path_bias" ? repairedPath.points : []).toHaveLength(
      DREAM_LIMITS.pathPoints,
    );
    expect(result.spec.structures[0]?.width).toBe(DREAM_LIMITS.structureDimension);
    expect(result.spec.entities[0]?.visual.scale).toBe(DREAM_LIMITS.entityScale);
  });

  it("keeps reserved air and solid ground inside the requested block budget", () => {
    const candidate = structuredClone(example);
    candidate.budgets.blockTypes = 2;
    candidate.blocks = candidate.blocks.slice(1, 3).map((block, index) => ({
      ...block,
      id: `mist_${index}`,
      solid: false,
      opacity: 0.5,
    }));

    const result = sanitizeDreamSpec(candidate);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.spec.blocks.length).toBeLessThanOrEqual(result.spec.budgets.blockTypes);
    expect(result.spec.blocks.some(({ id, solid }) => id === "air" && !solid)).toBe(true);
    expect(result.spec.blocks.some(({ solid }) => solid)).toBe(true);
  });
});
