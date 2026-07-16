import { describe, expect, it } from "vitest";
import example from "../../schemas/dream-spec-v1.example.json";
import { prepareDreamRuntime } from "../../src/app/materialization";
import {
  compileDreamDescriptor,
  DREAM_LIMITS,
  sampleCompiledBlock,
  sanitizeDreamSpec,
} from "../../src/dream";
import { CHUNK_VOLUME } from "../../src/engine/chunkMath";

function assertPlayableOrRejected(candidate: unknown): "playable" | "rejected" {
  const sanitized = sanitizeDreamSpec(candidate);
  if (!sanitized.success) {
    expect(sanitized.issues.some(({ severity }) => severity === "error")).toBe(true);
    return "rejected";
  }
  const manifest = compileDreamDescriptor(sanitized.spec, sanitized.issues);
  const prepared = prepareDreamRuntime(manifest);
  const [x, y, z] = manifest.spawn;
  expect(prepared.spawnChunk.voxelCount).toBe(CHUNK_VOLUME);
  expect(prepared.stagedAnchorCount).toBeGreaterThanOrEqual(3);
  expect(sampleCompiledBlock(manifest.generator, x, y - 1, z)).not.toBe("air");
  expect(sampleCompiledBlock(manifest.generator, x, y, z)).toBe("air");
  expect(sampleCompiledBlock(manifest.generator, x, y + 1, z)).toBe("air");
  return "playable";
}

describe("G6 hostile fixture aggregation", () => {
  it("repairs or rejects invalid references, hostile terrain, spawn, and budgets", () => {
    const invalidReferences = structuredClone(example);
    invalidReferences.entities[0]!.dialogueId = "missing_dialogue";
    invalidReferences.playGraph.beats[0]!.completesWhen = {
      kind: "interacted",
      targetId: "missing_interaction",
    };

    const allAir = structuredClone(example);
    for (const block of allAir.blocks) block.solid = false;

    const allSolid = structuredClone(example);
    for (const block of allSolid.blocks) {
      block.solid = true;
      block.opacity = 1;
    }
    allSolid.world.baseHeight = allSolid.world.height;

    const invalidSpawn = structuredClone(example);
    invalidSpawn.player.preferredSpawn = [10_000, -500, Number.MAX_VALUE];

    const overBudget = structuredClone(example);
    const sourceStructure = overBudget.structures[1]!;
    overBudget.structures = [
      ...overBudget.structures,
      ...Array.from({ length: 45 }, (_, index) => ({
        ...sourceStructure,
        id: `hostile_structure_${index}`,
      })),
    ];
    overBudget.budgets.structures = 99;
    overBudget.budgets.particles = 50_000;

    expect({
      invalidReferences: assertPlayableOrRejected(invalidReferences),
      allAir: assertPlayableOrRejected(allAir),
      allSolid: assertPlayableOrRejected(allSolid),
      invalidSpawn: assertPlayableOrRejected(invalidSpawn),
      overBudget: assertPlayableOrRejected(overBudget),
    }).toEqual({
      invalidReferences: "rejected",
      allAir: "playable",
      allSolid: "playable",
      invalidSpawn: "playable",
      overBudget: "playable",
    });

    const repairedBudget = sanitizeDreamSpec(overBudget);
    expect(repairedBudget.success).toBe(true);
    if (repairedBudget.success) {
      expect(repairedBudget.spec.structures.length).toBeLessThanOrEqual(DREAM_LIMITS.structures);
      expect(repairedBudget.spec.budgets.particles).toBe(DREAM_LIMITS.particles);
    }
  });
});
