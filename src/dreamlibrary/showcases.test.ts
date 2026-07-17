import { describe, expect, it } from "vitest";
import { createDreamLibraryShowcases } from "./showcases";

describe("DreamLibrary showcase templates", () => {
  it("ships the three interactive reference dreams as deterministic authored templates", async () => {
    const showcases = await createDreamLibraryShowcases();

    expect(showcases.map(({ id }) => id)).toEqual([
      "moonlit-kitchen",
      "flooded-school",
      "lottery-family",
    ]);
    for (const showcase of showcases) {
      expect(showcase.spec.blueprint.semanticAnchors.length).toBeGreaterThanOrEqual(5);
      expect(showcase.spec.playGraph.beats).toHaveLength(1);
      expect(showcase.spec.dialogues[0]?.nodes).toHaveLength(3);
    }
  });

  it("keeps each template's signature capability and gameplay objective in its own spec", async () => {
    const showcases = await createDreamLibraryShowcases();
    const byId = new Map(showcases.map((showcase) => [showcase.id, showcase]));

    expect(byId.get("moonlit-kitchen")?.spec.structures.map(({ id }) => id)).toContain("giant-cup");
    expect(byId.get("flooded-school")?.spec.structures.map(({ id }) => id)).toContain("exit-stairwell");
    expect(byId.get("lottery-family")?.spec.structures.map(({ id }) => id)).toContain("celebration-stage");
  });
});
