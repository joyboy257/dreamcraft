import { describe, expect, it } from "vitest";
import {
  CHUNK_SIZE,
  chunkKey,
  floorDiv,
  floorMod,
  worldToChunk,
} from "./chunkMath";

describe("chunk coordinate math", () => {
  it.each([
    [0, 0, 0],
    [15, 0, 15],
    [16, 1, 0],
    [-1, -1, 15],
    [-16, -1, 0],
    [-17, -2, 15],
  ])("maps world x=%i to chunk=%i local=%i", (world, chunk, local) => {
    expect(worldToChunk(world)).toEqual({ chunk, local });
  });

  it("keeps floor division and modulo complementary for negatives", () => {
    for (let value = -CHUNK_SIZE * 3; value <= CHUNK_SIZE * 3; value += 1) {
      expect(floorDiv(value, CHUNK_SIZE) * CHUNK_SIZE + floorMod(value, CHUNK_SIZE)).toBe(value);
    }
  });

  it("uses an unambiguous signed chunk key", () => {
    expect(chunkKey(-1, 2)).toBe("-1,2");
    expect(chunkKey(-1, 2)).not.toBe(chunkKey(1, -2));
  });
});
