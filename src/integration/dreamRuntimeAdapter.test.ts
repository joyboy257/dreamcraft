import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider, compileDreamDescriptor, type DreamSpecV1 } from "../dream";
import { voxelIndex, worldToChunk } from "../engine/chunkMath";
import { adaptDreamManifest } from "./dreamRuntimeAdapter";
import { createDreamLibraryShowcases } from "../dreamlibrary";

describe("adaptDreamManifest", () => {
  it("turns a trusted descriptor into deterministic numeric voxel chunks", async () => {
    const result = await new MockLocalGenerationProvider().generate({
      dreamText: "A moonlit library floating above blue clouds",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "adapter-test",
    }, new AbortController().signal);
    const manifest = compileDreamDescriptor(result.core, result.issues);
    const runtime = adaptDreamManifest(manifest);
    const first = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });
    const second = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });

    expect(first.voxels).toEqual(second.voxels);
    expect(first.voxels[voxelIndex(0, 0, 0)]).not.toBe(0);
    expect(runtime.blockColors[runtime.safeSpawnBlock]).toBeDefined();
    expect(runtime.story.ending.title).toBe(result.core.playGraph.endings[0]?.title);
    expect(runtime.playerConfig.walkSpeed).toBe(result.core.physics.player.movement.walkSpeed);
    expect(runtime.scenario.kind).toBe("transformation");
    expect(runtime.staging.objectivePath[0]).toEqual(manifest.spawn);
    expect(runtime.atmosphere.particles.count).toBeLessThanOrEqual(250);
  });

  it("materializes an authored structure above its terrain surface", async () => {
    const result = await new MockLocalGenerationProvider().generate({
      dreamText: "A moonlit kitchen with a giant cup",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "structure-adapter-test",
    }, new AbortController().signal);
    const kitchenStructure: DreamSpecV1["structures"][number] = {
      id: "moonlit-kitchen",
      kind: "kitchen",
      position: [14, 0, -8],
      width: 10,
      height: 7,
      depth: 8,
      block: result.core.world.layers[0]?.block ?? "air",
      tags: ["kitchen"],
    };
    const core: DreamSpecV1 = {
      ...result.core,
      structures: [...result.core.structures, kitchenStructure],
    };
    const runtime = adaptDreamManifest(compileDreamDescriptor(core, result.issues));
    const kitchen = runtime.voxelStructures.find(({ id }) => id === "moonlit-kitchen");
    expect(kitchen).toBeDefined();
    const chunkX = worldToChunk(kitchen!.position[0]);
    const chunkZ = worldToChunk(kitchen!.position[2]);
    const chunk = runtime.generator.generate({ chunkX: chunkX.chunk, chunkZ: chunkZ.chunk });

    expect(chunk.voxels[voxelIndex(chunkX.local, kitchen!.position[1], chunkZ.local)]).not.toBe(0);
  });

  it("lets DreamLibrary render a showcase's signature structures instead of covering them with generic voxels", async () => {
    const kitchen = (await createDreamLibraryShowcases()).find(({ id }) => id === "moonlit-kitchen")!;
    const runtime = adaptDreamManifest(compileDreamDescriptor(kitchen.spec, []));
    const renderedByLibrary = new Set(
      runtime.dreamLibrary.anchors.flatMap(({ sourceId }) => sourceId ? [sourceId] : []),
    );

    expect(runtime.voxelStructures.some(({ id }) => renderedByLibrary.has(id))).toBe(false);
    expect([...renderedByLibrary]).toEqual(expect.arrayContaining(["moonlit-kitchen", "giant-cup"]));
  });
});
