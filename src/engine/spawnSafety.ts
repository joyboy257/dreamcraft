import { CHUNK_HEIGHT } from "./chunkMath";
import type { BlockId } from "./localGenerator";

export interface EditableSpawnWorld {
  getBlock(x: number, y: number, z: number): BlockId;
  setBlock(x: number, y: number, z: number, block: BlockId): boolean;
}

/** Creates a small, bounded platform and clear sightline in front of arrival. */
export function prepareSafeSpawn(
  world: EditableSpawnWorld,
  surfaceY: number,
): void {
  for (let z = -8; z <= 2; z += 1) {
    for (let x = -2; x <= 2; x += 1) {
      world.setBlock(x, surfaceY, z, 2);
      for (let y = surfaceY + 1; y < CHUNK_HEIGHT; y += 1) {
        if (world.getBlock(x, y, z) !== 0) world.setBlock(x, y, z, 0);
      }
    }
  }
}
