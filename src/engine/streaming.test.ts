import { describe, expect, it } from "vitest";
import { chunksAround, shouldUnloadChunk } from "./streaming";

describe("chunk streaming schedule", () => {
  it("prioritizes the player chunk before surrounding rings", () => {
    const chunks = chunksAround({ x: -2, z: 3 }, 2);

    expect(chunks).toHaveLength(25);
    expect(chunks[0]).toEqual({ x: -2, z: 3 });
    expect(chunks.slice(1, 9).every((chunk) => Math.max(Math.abs(chunk.x + 2), Math.abs(chunk.z - 3)) === 1)).toBe(true);
  });

  it("unloads only beyond the retained padding ring", () => {
    expect(shouldUnloadChunk({ x: 3, z: 0 }, { x: 0, z: 0 }, 2, 1)).toBe(false);
    expect(shouldUnloadChunk({ x: 4, z: 0 }, { x: 0, z: 0 }, 2, 1)).toBe(true);
  });
});
