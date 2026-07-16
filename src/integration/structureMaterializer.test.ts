import { describe, expect, it } from "vitest";
import { compileVoxelStructures, type VoxelStructureSource } from "./structureMaterializer";

const source: VoxelStructureSource = {
  seed: 42,
  radius: 64,
  height: 64,
  spawn: [0, 8, 0],
  surfaceAt: () => 7,
};

describe("compileVoxelStructures", () => {
  it("keeps authored structure identity, palette, dimensions, and safe position", () => {
    const [room] = compileVoxelStructures([
      {
        id: "moonlit-kitchen",
        kind: "kitchen",
        position: [14, 99, -8],
        width: 12,
        height: 8,
        depth: 10,
        block: "moonstone",
        tags: ["kitchen", "central-object"],
      },
    ], source);

    expect(room).toMatchObject({
      id: "moonlit-kitchen",
      kind: "kitchen",
      blockId: "moonstone",
      tags: ["kitchen", "central-object"],
      position: [14, 8, -8],
      dimensions: [12, 8, 10],
    });
  });

  it("repairs a structure that would block the spawn and bounds large dimensions", () => {
    const [platform] = compileVoxelStructures([
      {
        id: "unsafe-platform",
        kind: "platform",
        position: [0, 8, 0],
        width: 200,
        height: 200,
        depth: 200,
        tags: [],
      },
    ], source);

    expect(platform).toBeDefined();
    expect(Math.hypot(platform!.position[0], platform!.position[2])).toBeGreaterThanOrEqual(5);
    expect(platform!.dimensions.every((dimension) => dimension <= 24)).toBe(true);
  });
});
