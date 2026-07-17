import { describe, expect, it } from "vitest";
import { compileDreamDescriptor } from "../dream";
import { createDreamLibraryShowcases } from "../dreamlibrary";
import { adaptDreamManifest } from "./dreamRuntimeAdapter";
import { evaluateSemanticFidelity } from "./semanticFidelity";

describe("evaluateSemanticFidelity", () => {
  it("counts a DreamLibrary-bound showcase anchor as visibly represented", async () => {
    const kitchen = (await createDreamLibraryShowcases()).find(({ id }) => id === "moonlit-kitchen")!;
    const manifest = compileDreamDescriptor(kitchen.spec, []);
    const report = evaluateSemanticFidelity(manifest, adaptDreamManifest(manifest));
    const cup = report.evidence.find(({ sourceId }) => sourceId === "giant-cup");

    expect(cup?.visiblyRepresented).toBe(true);
    expect(cup?.reason).toBe("DreamLibrary capability: giant-cup");
  });
});
