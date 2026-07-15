export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;
export const CHUNK_AREA = CHUNK_SIZE * CHUNK_SIZE;
export const CHUNK_VOLUME = CHUNK_AREA * CHUNK_HEIGHT;

export interface ChunkAxisCoordinate {
  chunk: number;
  local: number;
}

export function floorDiv(value: number, divisor: number): number {
  if (!Number.isInteger(value) || !Number.isInteger(divisor) || divisor <= 0) {
    throw new RangeError("Chunk coordinates require integers and a positive divisor.");
  }
  return Math.floor(value / divisor);
}

export function floorMod(value: number, divisor: number): number {
  return value - floorDiv(value, divisor) * divisor;
}

export function worldToChunk(value: number): ChunkAxisCoordinate {
  return {
    chunk: floorDiv(value, CHUNK_SIZE),
    local: floorMod(value, CHUNK_SIZE),
  };
}

export function chunkKey(chunkX: number, chunkZ: number): string {
  return `${chunkX},${chunkZ}`;
}

export function voxelIndex(localX: number, y: number, localZ: number): number {
  if (
    localX < 0 ||
    localX >= CHUNK_SIZE ||
    y < 0 ||
    y >= CHUNK_HEIGHT ||
    localZ < 0 ||
    localZ >= CHUNK_SIZE
  ) {
    throw new RangeError("Voxel coordinate is outside its chunk.");
  }
  return y * CHUNK_AREA + localZ * CHUNK_SIZE + localX;
}

export function chunkOrigin(chunk: number): number {
  return chunk * CHUNK_SIZE;
}
