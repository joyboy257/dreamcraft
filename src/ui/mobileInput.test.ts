import { describe, expect, it } from "vitest";
import { joystickVector } from "./mobileInput";

describe("analogue joystick", () => {
  it("applies a deadzone and a curved, clamped response", () => {
    expect(joystickVector({ x: 51, y: 50 }, { x: 50, y: 50 }, 50)).toEqual({ x: 0, y: 0 });
    expect(joystickVector({ x: 200, y: 50 }, { x: 50, y: 50 }, 50).x).toBeCloseTo(1);
    expect(joystickVector({ x: 50, y: 0 }, { x: 50, y: 50 }, 50).y).toBeLessThan(-0.9);
  });
});
