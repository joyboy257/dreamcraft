import { describe, expect, it } from "vitest";
import {
  createLocalPreview,
  MAX_DREAM_LENGTH,
  normalizeDreamText,
  stableDreamSeed,
} from "./localPreview";

describe("deterministic local preview", () => {
  it("produces the same unsigned seed for the same normalized dream", () => {
    const first = createLocalPreview("  A city of bells.  ");
    const second = createLocalPreview("A city of bells.");

    expect(first.seed).toBe(second.seed);
    expect(first.strategy).toBe("mock-local");
    expect(first.seed).toBeGreaterThanOrEqual(0);
  });

  it("removes unsafe control characters and enforces the input bound", () => {
    const normalized = normalizeDreamText(`\u0000${"x".repeat(1_500)}`);
    expect(normalized).toHaveLength(MAX_DREAM_LENGTH);
    expect(normalized).not.toContain("\u0000");
  });

  it("rejects an empty dream instead of creating a misleading preview", () => {
    expect(() => createLocalPreview(" \n ")).toThrow(/remembered detail/i);
  });

  it("changes the seed when the dream meaningfully changes", () => {
    expect(stableDreamSeed("moon city")).not.toBe(
      stableDreamSeed("flooded school"),
    );
  });
});
