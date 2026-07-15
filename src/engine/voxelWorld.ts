import {
  CHUNK_HEIGHT,
  CHUNK_SIZE,
  chunkKey,
  voxelIndex,
  worldToChunk,
} from "./chunkMath";
import type { BlockId, ChunkGenerator, ChunkVoxelData } from "./localGenerator";

export interface ChunkCoordinate {
  x: number;
  z: number;
}

export interface VoxelWorldOptions {
  radius: number;
}

const MAX_WORLD_RADIUS = 128;

export class VoxelWorld {
  private readonly chunks = new Map<string, ChunkVoxelData>();
  private readonly edits = new Map<string, BlockId>();
  private readonly dirtyChunks = new Map<string, ChunkCoordinate>();
  readonly radius: number;

  constructor(
    private readonly generator: ChunkGenerator,
    options: VoxelWorldOptions,
  ) {
    this.radius = Math.max(16, Math.min(MAX_WORLD_RADIUS, Math.trunc(options.radius)));
  }

  isInBounds(x: number, y: number, z: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      Number.isInteger(z) &&
      x >= -this.radius &&
      x < this.radius &&
      z >= -this.radius &&
      z < this.radius &&
      y >= 0 &&
      y < CHUNK_HEIGHT
    );
  }

  ensureChunk(chunkX: number, chunkZ: number): ChunkVoxelData {
    const key = chunkKey(chunkX, chunkZ);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const generated = this.generator.generate({ chunkX, chunkZ });
    for (let localZ = 0; localZ < CHUNK_SIZE; localZ += 1) {
      for (let localX = 0; localX < CHUNK_SIZE; localX += 1) {
        for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
          const worldX = chunkX * CHUNK_SIZE + localX;
          const worldZ = chunkZ * CHUNK_SIZE + localZ;
          const edited = this.edits.get(this.editKey(worldX, y, worldZ));
          if (edited !== undefined) generated.voxels[voxelIndex(localX, y, localZ)] = edited;
        }
      }
    }
    this.chunks.set(key, generated);
    this.markDirty(chunkX, chunkZ);
    return generated;
  }

  getLoadedChunk(chunkX: number, chunkZ: number): ChunkVoxelData | undefined {
    return this.chunks.get(chunkKey(chunkX, chunkZ));
  }

  getBlock(x: number, y: number, z: number): BlockId {
    if (!this.isInBounds(x, y, z)) return 0;
    const xCoordinate = worldToChunk(x);
    const zCoordinate = worldToChunk(z);
    const chunk = this.ensureChunk(xCoordinate.chunk, zCoordinate.chunk);
    return chunk.voxels[voxelIndex(xCoordinate.local, y, zCoordinate.local)] ?? 0;
  }

  isSolid(x: number, y: number, z: number): boolean {
    return this.getBlock(x, y, z) !== 0;
  }

  setBlock(x: number, y: number, z: number, block: BlockId): boolean {
    if (!this.isInBounds(x, y, z) || !Number.isInteger(block) || block < 0 || block > 65_535) {
      return false;
    }
    const xCoordinate = worldToChunk(x);
    const zCoordinate = worldToChunk(z);
    const chunk = this.ensureChunk(xCoordinate.chunk, zCoordinate.chunk);
    const index = voxelIndex(xCoordinate.local, y, zCoordinate.local);
    if (chunk.voxels[index] === block) return false;

    chunk.voxels[index] = block;
    this.edits.set(this.editKey(x, y, z), block);
    this.markDirty(xCoordinate.chunk, zCoordinate.chunk);
    if (xCoordinate.local === 0) this.markDirty(xCoordinate.chunk - 1, zCoordinate.chunk);
    if (xCoordinate.local === CHUNK_SIZE - 1) this.markDirty(xCoordinate.chunk + 1, zCoordinate.chunk);
    if (zCoordinate.local === 0) this.markDirty(xCoordinate.chunk, zCoordinate.chunk - 1);
    if (zCoordinate.local === CHUNK_SIZE - 1) this.markDirty(xCoordinate.chunk, zCoordinate.chunk + 1);
    return true;
  }

  getSurfaceY(x: number, z: number): number | null {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y -= 1) {
      if (this.isSolid(x, y, z)) return y;
    }
    return null;
  }

  unloadChunk(chunkX: number, chunkZ: number): boolean {
    this.dirtyChunks.delete(chunkKey(chunkX, chunkZ));
    return this.chunks.delete(chunkKey(chunkX, chunkZ));
  }

  getLoadedChunks(): readonly ChunkVoxelData[] {
    return [...this.chunks.values()];
  }

  getEditCount(): number {
    return this.edits.size;
  }

  consumeDirtyChunks(): ChunkCoordinate[] {
    const dirty = [...this.dirtyChunks.values()];
    this.dirtyChunks.clear();
    return dirty;
  }

  clear(): void {
    this.chunks.clear();
    this.edits.clear();
    this.dirtyChunks.clear();
  }

  private editKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  private markDirty(x: number, z: number): void {
    this.dirtyChunks.set(chunkKey(x, z), { x, z });
  }
}
