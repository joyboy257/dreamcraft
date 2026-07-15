import { CHUNK_HEIGHT } from "./chunkMath";
import type { BlockId } from "./localGenerator";

export interface EditableSpawnWorld {
  getBlock(x: number, y: number, z: number): BlockId;
  setBlock(x: number, y: number, z: number, block: BlockId): boolean;
}

export interface SafeSpawnOptions {
  centerX?: number;
  centerZ?: number;
  blockId?: BlockId;
}

/** Creates a small, bounded platform and clear sightline in front of arrival. */
export function prepareSafeSpawn(
  world: EditableSpawnWorld,
  surfaceY: number,
  options: SafeSpawnOptions = {},
): void {
  const centerX = Math.floor(options.centerX ?? 0);
  const centerZ = Math.floor(options.centerZ ?? 0);
  const blockId = options.blockId ?? 2;
  for (let z = centerZ - 8; z <= centerZ + 2; z += 1) {
    for (let x = centerX - 2; x <= centerX + 2; x += 1) {
      world.setBlock(x, surfaceY, z, blockId);
      for (let y = surfaceY + 1; y < CHUNK_HEIGHT; y += 1) {
        if (world.getBlock(x, y, z) !== 0) world.setBlock(x, y, z, 0);
      }
    }
  }
}
