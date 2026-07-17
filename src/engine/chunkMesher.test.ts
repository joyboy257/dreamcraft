import { describe, expect, it } from "vitest";
import { CHUNK_VOLUME, voxelIndex } from "./chunkMath";
import { meshChunk } from "./chunkMesher";

describe("meshChunk", () => {
  it("emits six faces for an isolated voxel in one combined payload", () => {
    const voxels = new Uint16Array(CHUNK_VOLUME);
    voxels[voxelIndex(1, 1, 1)] = 2;

    const mesh = meshChunk({
      chunkX: 0,
      chunkZ: 0,
      voxels,
      getNeighbor: () => 0,
    });

    expect(mesh.faceCount).toBe(6);
    expect(mesh.positions).toHaveLength(6 * 4 * 3);
    expect(mesh.uvs).toHaveLength(6 * 4 * 2);
    expect(mesh.indices).toHaveLength(6 * 6);
  });

  it("maps each face into the requested nearest-filter atlas tile", () => {
    const voxels = new Uint16Array(CHUNK_VOLUME);
    voxels[voxelIndex(1, 1, 1)] = 2;
    const mesh = meshChunk({ chunkX: 0, chunkZ: 0, voxels, getNeighbor: () => 0, blockAtlasTiles: { 2: [4, 1] } });
    expect(Math.min(...mesh.uvs)).toBeGreaterThan(4 / 16);
    expect(Math.max(...mesh.uvs)).toBeLessThan(1 - 1 / 16);
  });

  it("culls the shared face between adjacent solid voxels", () => {
    const voxels = new Uint16Array(CHUNK_VOLUME);
    voxels[voxelIndex(1, 1, 1)] = 2;
    voxels[voxelIndex(2, 1, 1)] = 3;

    const mesh = meshChunk({
      chunkX: 0,
      chunkZ: 0,
      voxels,
      getNeighbor: () => 0,
    });

    expect(mesh.faceCount).toBe(10);
  });

  it("consults adjacent chunks when culling a boundary face", () => {
    const voxels = new Uint16Array(CHUNK_VOLUME);
    voxels[voxelIndex(15, 1, 1)] = 2;

    const mesh = meshChunk({
      chunkX: 0,
      chunkZ: 0,
      voxels,
      getNeighbor: (x, y, z) => (x === 16 && y === 1 && z === 1 ? 2 : 0),
    });

    expect(mesh.faceCount).toBe(5);
  });
});
