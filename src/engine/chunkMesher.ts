import {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  chunkOrigin,
  voxelIndex,
} from "./chunkMath";
import type { BlockId } from "./localGenerator";

export interface ChunkMeshRequest {
  chunkX: number;
  chunkZ: number;
  voxels: Uint16Array;
  getNeighbor: (worldX: number, y: number, worldZ: number) => BlockId;
}

export interface ChunkMeshData {
  protocol: 1;
  chunkX: number;
  chunkZ: number;
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  faceCount: number;
}

interface Face {
  normal: readonly [number, number, number];
  corners: readonly (readonly [number, number, number])[];
}

const FACES: readonly Face[] = [
  { normal: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { normal: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { normal: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { normal: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { normal: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { normal: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];

const BLOCK_COLORS: Readonly<Record<number, readonly [number, number, number]>> = {
  1: [0.27, 0.22, 0.38],
  2: [0.38, 0.72, 0.57],
  3: [0.52, 0.34, 0.27],
  4: [0.73, 0.55, 0.88],
  5: [0.96, 0.69, 0.32],
  6: [0.36, 0.7, 0.94],
};

function colorFor(block: BlockId): readonly [number, number, number] {
  return BLOCK_COLORS[block] ?? [0.8, 0.8, 0.84];
}

export function meshChunk(request: ChunkMeshRequest): ChunkMeshData {
  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const originX = chunkOrigin(request.chunkX);
  const originZ = chunkOrigin(request.chunkZ);
  let faceCount = 0;

  for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
    for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        const block = request.voxels[voxelIndex(localX, y, localZ)] ?? 0;
        if (block === 0) continue;

        for (const face of FACES) {
          const [normalX, normalY, normalZ] = face.normal;
          const neighborX = localX + normalX;
          const neighborY = y + normalY;
          const neighborZ = localZ + normalZ;
          const insideChunk =
            neighborX >= 0 && neighborX < CHUNK_SIZE &&
            neighborY >= 0 && neighborY < CHUNK_HEIGHT &&
            neighborZ >= 0 && neighborZ < CHUNK_SIZE;
          const neighbor = insideChunk
            ? request.voxels[voxelIndex(neighborX, neighborY, neighborZ)] ?? 0
            : request.getNeighbor(originX + neighborX, neighborY, originZ + neighborZ);
          if (neighbor !== 0) continue;

          const vertexStart = positions.length / 3;
          const [red, green, blue] = colorFor(block);
          for (const [cornerX, cornerY, cornerZ] of face.corners) {
            positions.push(localX + cornerX, y + cornerY, localZ + cornerZ);
            normals.push(normalX, normalY, normalZ);
            colors.push(red, green, blue);
          }
          indices.push(
            vertexStart,
            vertexStart + 1,
            vertexStart + 2,
            vertexStart,
            vertexStart + 2,
            vertexStart + 3,
          );
          faceCount += 1;
        }
      }
    }
  }

  return {
    protocol: 1,
    chunkX: request.chunkX,
    chunkZ: request.chunkZ,
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: new Uint32Array(indices),
    faceCount,
  };
}
