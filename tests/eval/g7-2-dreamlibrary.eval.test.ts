import { describe, expect, it } from "vitest";
import { compileDreamDescriptor, MockLocalGenerationProvider } from "../../src/dream";
import { adaptDreamManifest } from "../../src/integration/dreamRuntimeAdapter";
import { createDreamLibraryWorld } from "../../src/dreamlibrary";
import { createG71ReferenceDreams } from "../fixtures/g7-1-referenceDreams";

describe("G7.2 DreamLibrary acceptance", () => {
  it("keeps the three reference dreams recognisable through runtime capabilities", async () => {
    const expectations = {
      "moonlit-kitchen": ["dreamlibrary-kitchen-kit", "giant-cup", "dreamlibrary-moth", "moon-door"],
      "flooded-school": ["dreamlibrary-school-kit", "dreamlibrary-water-volume", "locker-1", "paper-boat-1", "written-message-1", "dreamlibrary-dog"],
      "lottery-family": ["dreamlibrary-celebration-kit", "jackpot-board", "family--4.5", "family-instrument-1", "lottery-ticket"],
    } as const;
    for (const reference of await createG71ReferenceDreams()) {
      const runtime = adaptDreamManifest(compileDreamDescriptor(reference.spec, []));
      const world = createDreamLibraryWorld(reference.spec, runtime.dreamLibrary);
      for (const name of expectations[reference.id]) expect(world.root.getObjectByName(name)).toBeTruthy();
      const highPriority = runtime.dreamLibrary.anchors.filter((anchor) => reference.spec.blueprint.semanticAnchors.some(({ id, importance, mustAppear }) => id === anchor.anchorId && importance >= 4 && mustAppear));
      expect(highPriority.every(({ renderedInstanceId }) => renderedInstanceId.startsWith("dreamlibrary-"))).toBe(true);
      world.dispose();
    }
  });

  it("gives the local reference prompts different actions, dialogue arcs, and water physics", async () => {
    const provider = new MockLocalGenerationProvider();
    const cases = [
      ["A flooded school repeated forever while paper boats carried messages from my childhood dog.", "flooded_school", 3],
      ["I was tiny in a moonlit kitchen where teacups floated and a patient moth guarded the sugar bowl.", "stable_fragment", 1],
      ["My family won the lottery and celebrated as buildings became instruments.", "lottery_family", 4],
    ] as const;
    for (const [dreamText, expectedScenario, minimumBeats] of cases) {
      const result = await provider.generate({ dreamText, intensity: "vivid", strategy: "mock-local", clientRequestId: `g7-2-${expectedScenario}` }, new AbortController().signal);
      if (expectedScenario !== "stable_fragment") {
        expect(result.core.blueprint.summary).toContain(expectedScenario.replaceAll("_", " "));
      }
      expect(result.core.playGraph.beats.length).toBeGreaterThanOrEqual(minimumBeats);
      expect(result.core.dialogues[0]?.nodes.map(({ id }) => id)).toEqual(["opening", "middle", "ending"]);
      if (expectedScenario === "flooded_school") {
        const runtime = adaptDreamManifest(compileDreamDescriptor(result.core, result.issues));
        expect(runtime.waterVolumes).toHaveLength(1);
        expect(runtime.playerConfig.swim).toBeDefined();
      }
    }
  });
});
