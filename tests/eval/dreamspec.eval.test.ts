import { describe, expect, it } from "vitest";
import example from "../../schemas/dream-spec-v1.example.json";
import {
  compileDreamDescriptor,
  MockLocalGenerationProvider,
  sampleCompiledBlock,
  sanitizeDreamSpec,
} from "../../src/dream";
import { adaptDreamManifest } from "../../src/integration/dreamRuntimeAdapter";

const REPRESENTATIVE_DREAMS = [
  "A candy forest where trees sing whenever I jump.",
  "A flying city carried by whales above a violet storm.",
  "A flooded school repeated forever while paper boats brought messages from my childhood dog.",
  "A talking moon lived inside a teapot and asked me to repair its crown.",
  "I found my lost dog in a quiet memory forest beside our old home.",
  "My family celebrated beneath golden rain while buildings became instruments.",
] as const;

describe("DreamSpec representative corpus", () => {
  it("compiles varied local dreams into bounded playable runtime descriptors", async () => {
    const provider = new MockLocalGenerationProvider();
    const manifests = await Promise.all(REPRESENTATIVE_DREAMS.map(async (dreamText, index) => {
      const result = await provider.generate({
        dreamText,
        intensity: index % 2 === 0 ? "vivid" : "fever",
        strategy: "mock-local",
        clientRequestId: `eval-${index}`,
      }, new AbortController().signal);
      const manifest = compileDreamDescriptor(result.core, result.issues);
      const runtime = adaptDreamManifest(manifest);
      const spawnGround = sampleCompiledBlock(
        manifest.generator,
        manifest.spawn[0],
        manifest.spawn[1] - 1,
        manifest.spawn[2],
      );
      const chunk = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });

      expect(spawnGround).not.toBe("air");
      expect(manifest.anchorStaging.length).toBeGreaterThanOrEqual(3);
      expect(chunk.voxels.some((block) => block !== 0)).toBe(true);
      expect(JSON.stringify(manifest)).not.toMatch(/javascript:|data:text\/html|<script/i);
      return manifest;
    }));

    expect(new Set(manifests.map(({ seed }) => seed)).size).toBe(REPRESENTATIVE_DREAMS.length);
  });

  it("keeps a hostile maximum path workload within the chunk latency budget", () => {
    const candidate = structuredClone(example);
    const path = candidate.world.terrain.find(({ kind }) => kind === "path_bias") as {
      points: number[][];
    };
    path.points = Array.from({ length: 128 }, (_, index) => [index - 64, index % 11]);
    const sanitized = sanitizeDreamSpec(candidate);
    expect(sanitized.success).toBe(true);
    if (!sanitized.success) return;
    const runtime = adaptDreamManifest(compileDreamDescriptor(sanitized.spec, sanitized.issues));

    const startedAt = performance.now();
    const chunk = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });
    const elapsedMs = performance.now() - startedAt;

    expect(chunk.voxels.some((block) => block !== 0)).toBe(true);
    expect(elapsedMs).toBeLessThan(250);
  });
});
