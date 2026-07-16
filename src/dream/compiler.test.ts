import example from "../../schemas/dream-spec-v1.example.json";
import { describe, expect, it } from "vitest";

import {
  compileDreamDescriptor,
  sampleCompiledBlock,
  sampleSurfaceHeight,
} from "./compiler";
import { sanitizeDreamSpec } from "./sanitizer";

function compile(candidate: unknown) {
  const sanitized = sanitizeDreamSpec(candidate);
  expect(sanitized.success).toBe(true);
  if (!sanitized.success) throw new Error("fixture failed to sanitize");
  return compileDreamDescriptor(sanitized.spec, sanitized.issues);
}

function allNumbersFinite(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allNumbersFinite);
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(allNumbersFinite);
  }
  return true;
}

describe("compileDreamDescriptor", () => {
  it("is deterministic and stages required anchors near safe spawn", () => {
    const first = compile(example);
    const second = compile(example);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first.spec.playGraph.endings.length).toBeGreaterThan(0);
    expect(first.anchorStaging).toHaveLength(3);
    for (const anchor of first.anchorStaging) {
      const dx = anchor.position[0] - first.spawn[0];
      const dz = anchor.position[2] - first.spawn[2];
      expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(28);
    }
  });

  it("preserves the high-priority prompt-to-world grounding contract", () => {
    const manifest = compile(example);
    const forest = manifest.anchorStaging.find(({ anchorId }) => anchorId === "anchor_forest");

    expect(forest).toMatchObject({
      concept: "candy-cane forest with licorice trees",
      sourcePhrase: "candy-cane forest with licorice trees",
      representation: "structure",
      gameplayRole: "landmark",
      importance: 5,
      mustAppear: true,
      source: "structure",
    });
    expect(forest?.sourceId).toBeTruthy();
  });

  it("rejects a must-appear high-priority anchor without a physical binding", () => {
    const candidate = structuredClone(example);
    candidate.structures.forEach((structure) => {
      structure.tags = structure.tags.filter((tag) => tag !== "anchor_forest");
    });

    const sanitized = sanitizeDreamSpec(candidate);
    expect(sanitized.success).toBe(false);
    expect(sanitized.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "required_semantic_anchor_unrepresented", severity: "error" }),
    ]));
  });

  it("repairs an all-air request with emergency ground", () => {
    const candidate = structuredClone(example);
    for (const block of candidate.blocks) block.solid = false;

    const manifest = compile(candidate);
    const [x, y, z] = manifest.spawn;

    expect(manifest.emergencyPlatform).not.toBeNull();
    expect(sampleCompiledBlock(manifest.generator, x, y - 1, z)).not.toBe("air");
    expect(sampleCompiledBlock(manifest.generator, x, y, z)).toBe("air");
    expect(sampleCompiledBlock(manifest.generator, x, y + 1, z)).toBe("air");
  });

  it("repairs an all-solid request with spawn headroom", () => {
    const candidate = structuredClone(example);
    candidate.blocks[0]!.solid = true;
    candidate.blocks[0]!.opacity = 1;
    candidate.world.baseHeight = candidate.world.height;

    const manifest = compile(candidate);
    const [x, y, z] = manifest.spawn;

    expect(sampleCompiledBlock(manifest.generator, x, y - 1, z)).not.toBe("air");
    expect(sampleCompiledBlock(manifest.generator, x, y, z)).toBe("air");
    expect(sampleCompiledBlock(manifest.generator, x, y + 1, z)).toBe("air");
  });

  it("keeps extreme finite terrain operands from producing non-finite output", () => {
    const candidate = structuredClone(example);
    const fbm = candidate.world.terrain.find(({ kind }) => kind === "fbm_height") as {
      scale: number;
      amplitude: number;
    };
    fbm.scale = Number.MAX_VALUE;
    fbm.amplitude = Number.MAX_VALUE;
    candidate.player.preferredSpawn = [16, 12, 16];

    const manifest = compile(candidate);

    expect(manifest.spawn.every(Number.isFinite)).toBe(true);
    expect(sampleSurfaceHeight(manifest.generator, 16, 16)).toBeTypeOf("number");
    expect(Number.isFinite(sampleSurfaceHeight(manifest.generator, 16, 16))).toBe(true);
    expect(allNumbersFinite(manifest)).toBe(true);
  });

  it("keeps a diagonal extreme spawn over solid ground inside radial terrain", () => {
    const candidate = structuredClone(example);
    candidate.player.preferredSpawn = [10_000, 12, 10_000];

    const manifest = compile(candidate);
    const [x, y, z] = manifest.spawn;

    expect(Math.hypot(x, z)).toBeLessThanOrEqual(manifest.generator.radius);
    expect(sampleCompiledBlock(manifest.generator, x, y - 1, z)).not.toBe("air");
    expect(sampleCompiledBlock(manifest.generator, x, y, z)).toBe("air");
  });
});
