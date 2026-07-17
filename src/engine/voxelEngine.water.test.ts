import { describe, expect, it } from "vitest";
import { containsWaterVolume } from "./voxelEngine";

describe("DreamLibrary water volume", () => {
  const floodedHall = { center: [0, 10, -9] as const, size: [24, 7, 14] as const, buoyancy: 9, drag: 1.2 };
  it("only enables swimming inside the visible flooded-school volume", () => {
    expect(containsWaterVolume(floodedHall, { x: 0, y: 10, z: -9 })).toBe(true);
    expect(containsWaterVolume(floodedHall, { x: 0, y: 10, z: 10 })).toBe(false);
  });
});
