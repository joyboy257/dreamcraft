import { describe, expect, it } from "vitest";
import { CHUNK_HEIGHT, CHUNK_VOLUME } from "./chunkMath";
import { createLocalGenerator } from "./localGenerator";
import { VoxelWorld } from "./voxelWorld";

describe("VoxelWorld", () => {
  it("generates deterministic chunks from a bounded seed", () => {
    const generator = createLocalGenerator(42);
    const first = generator.generate({ chunkX: -2, chunkZ: 3 });
    const second = generator.generate({ chunkX: -2, chunkZ: 3 });

    expect(first.voxels).toEqual(second.voxels);
    expect(first.voxels).toHaveLength(CHUNK_VOLUME);
  });

  it("applies sparse edits across negative chunk coordinates", () => {
    const world = new VoxelWorld(createLocalGenerator(7), { radius: 32 });
    world.setBlock(-1, 4, -17, 6);

    expect(world.getBlock(-1, 4, -17)).toBe(6);
    expect(world.getEditCount()).toBe(1);
  });

  it("treats coordinates outside world bounds as air and rejects edits", () => {
    const world = new VoxelWorld(createLocalGenerator(7), { radius: 16 });

    expect(world.getBlock(100, 3, 0)).toBe(0);
    expect(world.getBlock(0, CHUNK_HEIGHT, 0)).toBe(0);
    expect(world.setBlock(100, 3, 0, 2)).toBe(false);
  });

  it("marks a neighboring chunk dirty when a border voxel changes", () => {
    const world = new VoxelWorld(createLocalGenerator(7), { radius: 32 });
    world.ensureChunk(0, 0);
    world.ensureChunk(-1, 0);
    world.consumeDirtyChunks();

    world.setBlock(0, 4, 0, 0);

    expect(world.consumeDirtyChunks()).toEqual(
      expect.arrayContaining([
        { x: 0, z: 0 },
        { x: -1, z: 0 },
      ]),
    );
  });
});
