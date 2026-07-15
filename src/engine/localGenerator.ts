import {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  CHUNK_VOLUME,
  chunkOrigin,
  voxelIndex,
} from "./chunkMath";

export type BlockId = number;

export interface ChunkGenerationRequest {
  chunkX: number;
  chunkZ: number;
}

export interface ChunkVoxelData extends ChunkGenerationRequest {
  voxels: Uint16Array;
}

export interface ChunkGenerator {
  generate(request: ChunkGenerationRequest): ChunkVoxelData;
}

function hash2d(seed: number, x: number, z: number): number {
  let hash = (seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(z, 0x27d4eb2d)) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function terrainHeight(seed: number, x: number, z: number): number {
  const broad = Math.sin((x + (seed & 31)) * 0.075) + Math.cos((z - (seed & 15)) * 0.068);
  const detail = (hash2d(seed, Math.floor(x / 3), Math.floor(z / 3)) & 3) - 1;
  return Math.max(2, Math.min(CHUNK_HEIGHT - 5, 6 + Math.round(broad * 1.5) + detail));
}

export function createLocalGenerator(seed: number): ChunkGenerator {
  const safeSeed = Number.isFinite(seed) ? Math.trunc(seed) >>> 0 : 0;

  return {
    generate: ({ chunkX, chunkZ }) => {
      const voxels = new Uint16Array(CHUNK_VOLUME);
      const originX = chunkOrigin(chunkX);
      const originZ = chunkOrigin(chunkZ);

      for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
        for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
          const worldX = originX + localX;
          const worldZ = originZ + localZ;
          const height = terrainHeight(safeSeed, worldX, worldZ);

          for (let y = 0; y <= height; y += 1) {
            const block = y === height ? 2 : y >= height - 2 ? 3 : 1;
            voxels[voxelIndex(localX, y, localZ)] = block;
          }

          if (hash2d(safeSeed ^ 0xa511e9b3, worldX, worldZ) % 113 === 0) {
            for (let y = height + 1; y <= Math.min(height + 3, CHUNK_HEIGHT - 1); y += 1) {
              voxels[voxelIndex(localX, y, localZ)] = 4;
            }
          }
        }
      }

      return { chunkX, chunkZ, voxels };
    },
  };
}
