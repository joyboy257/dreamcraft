import { describe, expect, it } from "vitest";
import type { SemanticAnchorStaging } from "../dream";
import { createSemanticObjective } from "./dummyWorldObjects";

const supportedStructureObjective: SemanticAnchorStaging = {
  anchorId: "moonlit-kitchen",
  concept: "giant moonlit cup to fill",
  sourcePhrase: "giant moonlit cup",
  representation: "prop",
  gameplayRole: "objective",
  importance: 5,
  mustAppear: true,
  position: [10, 9, -4],
  source: "structure",
  sourceId: "giant-cup",
};

describe("createSemanticObjective", () => {
  it("creates a semantic physical target when an authored objective is supported", () => {
    const objective = createSemanticObjective(supportedStructureObjective, 0xf4d58d);

    expect(objective.kind).toBe("prop");
    expect(objective.root.name).toContain("giant-cup");
    objective.dispose();
  });

  it("uses the legacy beacon only for an unrepaired fallback anchor", () => {
    const objective = createSemanticObjective({
      ...supportedStructureObjective,
      source: "fallback",
      sourceId: null,
    }, 0xf4d58d);

    expect(objective.kind).toBe("fallback");
    expect(objective.root.name).toBe("moonwell-beacon");
    objective.dispose();
  });
});
