import { describe, expect, it } from "vitest";
import { prepareSafeSpawn } from "./spawnSafety";

describe("prepareSafeSpawn", () => {
  it("builds a bounded platform and clears the forward arrival corridor", () => {
    const blocks = new Map<string, number>();
    const key = (x: number, y: number, z: number): string => `${x}:${y}:${z}`;
    blocks.set(key(0, 9, -1), 4);
    blocks.set(key(3, 9, -1), 4);

    prepareSafeSpawn({
      getBlock: (x, y, z) => blocks.get(key(x, y, z)) ?? 0,
      setBlock: (x, y, z, block) => {
        if (block === 0) blocks.delete(key(x, y, z));
        else blocks.set(key(x, y, z), block);
        return true;
      },
    }, 6);

    expect(blocks.get(key(0, 6, -1))).toBe(2);
    expect(blocks.has(key(0, 9, -1))).toBe(false);
    expect(blocks.get(key(3, 9, -1))).toBe(4);
  });
});
