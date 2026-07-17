import { describe, expect, it } from "vitest";
import { DREAM_LIBRARY, getDreamLibraryCapability, selectDreamLibraryCapabilities } from "./index";

describe("DreamLibrary registry", () => {
  it("ships all material and reference-dream capabilities as renderable contracts", () => {
    expect(DREAM_LIBRARY.filter(({ category }) => category === "material")).toHaveLength(22);
    for (const id of ["school", "kitchen", "celebration", "water", "moth", "dog", "family", "giant-cup", "paper-boat", "lottery-ticket"]) {
      expect(getDreamLibraryCapability(id)?.rendered).toBe(true);
    }
  });

  it("rejects an unavailable high-priority capability instead of silently substituting one", () => {
    expect(() => selectDreamLibraryCapabilities("school", ["paper-boat", "unicorn-city"])).toThrow(/unicorn-city/);
    expect(selectDreamLibraryCapabilities("kitchen", ["giant-cup", "moth"]).capabilityIds).toEqual(["kitchen", "giant-cup", "moth"]);
  });
});
