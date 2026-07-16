import { describe, expect, it, vi } from "vitest";
import { CrumbleScheduler } from "./crumbleScheduler";

describe("CrumbleScheduler", () => {
  it("removes a scheduled voxel once and restores its original block", () => {
    const scheduler = new CrumbleScheduler();
    const setBlock = vi.fn(() => true);
    scheduler.schedule([2, 3, 4], 7, 1_000, 200, 500);

    scheduler.update({ setBlock }, 1_199);
    expect(setBlock).not.toHaveBeenCalled();
    scheduler.update({ setBlock }, 1_200);
    expect(setBlock).toHaveBeenLastCalledWith(2, 3, 4, 0);
    scheduler.update({ setBlock }, 1_700);
    expect(setBlock).toHaveBeenLastCalledWith(2, 3, 4, 7);
    expect(setBlock).toHaveBeenCalledTimes(2);
  });
});
