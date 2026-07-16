import type { BlockId } from "./localGenerator";

export interface MutableBlockWorld {
  setBlock(x: number, y: number, z: number, block: BlockId): boolean;
}

interface ScheduledBlock {
  x: number;
  y: number;
  z: number;
  block: BlockId;
  crumbleAt: number;
  respawnAt: number;
  removed: boolean;
}

export class CrumbleScheduler {
  readonly #blocks = new Map<string, ScheduledBlock>();

  schedule(
    position: readonly [number, number, number],
    block: BlockId,
    nowMs: number,
    crumbleAfterMs: number,
    respawnAfterMs: number,
  ): void {
    const key = position.join(",");
    if (this.#blocks.has(key) || block === 0) return;
    const crumbleAt = nowMs + Math.max(100, Math.min(60_000, crumbleAfterMs));
    this.#blocks.set(key, {
      x: position[0], y: position[1], z: position[2], block,
      crumbleAt,
      respawnAt: crumbleAt + Math.max(100, Math.min(60_000, respawnAfterMs)),
      removed: false,
    });
  }

  update(world: MutableBlockWorld, nowMs: number): void {
    for (const [key, scheduled] of this.#blocks) {
      if (!scheduled.removed && nowMs >= scheduled.crumbleAt) {
        world.setBlock(scheduled.x, scheduled.y, scheduled.z, 0);
        scheduled.removed = true;
      } else if (scheduled.removed && nowMs >= scheduled.respawnAt) {
        world.setBlock(scheduled.x, scheduled.y, scheduled.z, scheduled.block);
        this.#blocks.delete(key);
      }
    }
  }

  clear(): void {
    this.#blocks.clear();
  }
}
