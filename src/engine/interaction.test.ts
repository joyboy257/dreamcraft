import { describe, expect, it } from "vitest";
import {
  editTargetedBlock,
  raycastVoxel,
  resolveCenterTarget,
} from "./interaction";

const blockAt = (x: number, y: number, z: number): number =>
  x === 0 && y === 1 && z === -3 ? 2 : 0;

describe("center interaction", () => {
  it("raycasts the first voxel and reports its entered face", () => {
    const hit = raycastVoxel(
      { origin: { x: 0.5, y: 1.5, z: 0.5 }, direction: { x: 0, y: 0, z: -1 } },
      blockAt,
      6,
    );

    expect(hit).toMatchObject({
      block: { x: 0, y: 1, z: -3 },
      normal: { x: 0, y: 0, z: 1 },
      blockId: 2,
    });
  });

  it("gives a centered interactive entity priority over a voxel", () => {
    const target = resolveCenterTarget(
      { origin: { x: 0.5, y: 1.5, z: 0.5 }, direction: { x: 0, y: 0, z: -1 } },
      [{ id: "guide", position: { x: 0.5, y: 1.5, z: -1.5 }, radius: 0.5, prompt: "Listen" }],
      blockAt,
      6,
    );

    expect(target).toEqual({ kind: "entity", entityId: "guide", prompt: "Listen", distance: 1.5 });
  });

  it("breaks the hit block and places on the adjacent face", () => {
    const changes: Array<[number, number, number, number]> = [];
    const world = {
      getBlock: blockAt,
      setBlock: (x: number, y: number, z: number, block: number) => {
        changes.push([x, y, z, block]);
        return true;
      },
    };
    const hit = raycastVoxel(
      { origin: { x: 0.5, y: 1.5, z: 0.5 }, direction: { x: 0, y: 0, z: -1 } },
      blockAt,
      6,
    );
    expect(hit).not.toBeNull();
    if (!hit) return;

    expect(editTargetedBlock("break", hit, world, 5)).toBe(true);
    expect(editTargetedBlock("place", hit, world, 5)).toBe(true);
    expect(changes).toEqual([
      [0, 1, -3, 0],
      [0, 1, -2, 5],
    ]);
  });
});
