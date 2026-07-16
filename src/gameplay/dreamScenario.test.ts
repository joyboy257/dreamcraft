import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider } from "../dream";
import { compileDreamScenario } from "./dreamScenario";

const CASES = [
  ["a candy forest where every jump bounces", "celebration_ritual"],
  ["a flying city threaded by strong sky winds", "flight"],
  ["a flooded school nightmare where I escape a shadow", "pursuit"],
  ["a talking moon teapot guarded by a grumpy spoon", "guarded_objective"],
  ["a memory where I find my lost dog and bring him home", "social_reunion"],
  ["my family wins the lottery and dances on a bright stage", "performance"],
] as const;

describe("compileDreamScenario", () => {
  it.each(CASES)("keeps %s mechanically distinct", async (dreamText, expected) => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText,
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: `scenario-${expected}`,
    }, new AbortController().signal);

    expect(compileDreamScenario(generated.core).kind).toBe(expected);
  });

  it("produces a unique mechanic, movement, and visual fingerprint for the G4 corpus", async () => {
    const fingerprints = await Promise.all(CASES.map(async ([dreamText]) => {
      const generated = await new MockLocalGenerationProvider().generate({
        dreamText,
        intensity: "vivid",
        strategy: "mock-local",
        clientRequestId: dreamText,
      }, new AbortController().signal);
      const scenario = compileDreamScenario(generated.core);
      return `${scenario.mechanic}:${scenario.movementSignature}:${scenario.visualSignature}`;
    }));

    expect(new Set(fingerprints)).toHaveLength(CASES.length);
  });
});
