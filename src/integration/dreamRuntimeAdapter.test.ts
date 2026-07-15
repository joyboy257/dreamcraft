import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider, compileDreamDescriptor } from "../dream";
import { voxelIndex } from "../engine/chunkMath";
import { adaptDreamManifest } from "./dreamRuntimeAdapter";

describe("adaptDreamManifest", () => {
  it("turns a trusted descriptor into deterministic numeric voxel chunks", async () => {
    const result = await new MockLocalGenerationProvider().generate({
      dreamText: "A moonlit library floating above blue clouds",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "adapter-test",
    }, new AbortController().signal);
    const runtime = adaptDreamManifest(compileDreamDescriptor(result.core, result.issues));
    const first = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });
    const second = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });

    expect(first.voxels).toEqual(second.voxels);
    expect(first.voxels[voxelIndex(0, 0, 0)]).not.toBe(0);
    expect(runtime.blockColors[runtime.safeSpawnBlock]).toBeDefined();
    expect(runtime.story.ending.title).toBe(result.core.playGraph.endings[0]?.title);
    expect(runtime.playerConfig.walkSpeed).toBe(result.core.physics.player.movement.walkSpeed);
  });
});
