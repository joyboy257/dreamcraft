import type { ChunkCoordinate } from "./voxelWorld";

export function chunksAround(center: ChunkCoordinate, radius: number): ChunkCoordinate[] {
  const safeRadius = Math.max(0, Math.min(4, Math.trunc(radius)));
  const chunks: ChunkCoordinate[] = [];
  for (let z = center.z - safeRadius; z <= center.z + safeRadius; z += 1) {
    for (let x = center.x - safeRadius; x <= center.x + safeRadius; x += 1) {
      chunks.push({ x, z });
    }
  }
  chunks.sort((left, right) => {
    const leftRing = Math.max(Math.abs(left.x - center.x), Math.abs(left.z - center.z));
    const rightRing = Math.max(Math.abs(right.x - center.x), Math.abs(right.z - center.z));
    if (leftRing !== rightRing) return leftRing - rightRing;
    const leftDistance = (left.x - center.x) ** 2 + (left.z - center.z) ** 2;
    const rightDistance = (right.x - center.x) ** 2 + (right.z - center.z) ** 2;
    return leftDistance - rightDistance;
  });
  return chunks;
}

export function shouldUnloadChunk(
  chunk: ChunkCoordinate,
  center: ChunkCoordinate,
  renderRadius: number,
  padding = 1,
): boolean {
  const retainRadius = Math.max(0, renderRadius) + Math.max(0, padding);
  return Math.max(Math.abs(chunk.x - center.x), Math.abs(chunk.z - center.z)) > retainRadius;
}
