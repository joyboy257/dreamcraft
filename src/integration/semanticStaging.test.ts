import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider, compileDreamDescriptor } from "../dream";
import { compileRuntimeStaging } from "./semanticStaging";

describe("compileRuntimeStaging", () => {
  it("produces a readable three-point path from safe spawn to the focal objective", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a flying city above clouds",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "staging",
    }, new AbortController().signal);
    const manifest = compileDreamDescriptor(generated.core, generated.issues);
    const staging = compileRuntimeStaging(manifest);

    expect(staging.objectivePath).toHaveLength(3);
    expect(staging.objectivePath[0]).toEqual(manifest.spawn);
    expect(staging.objectivePath[2]).toEqual(staging.objective);
    expect(staging.cameraTarget[1]).toBeGreaterThan(staging.landmark[1]);
    expect(staging.heroScale).toBeGreaterThanOrEqual(0.5);
    expect(staging.guide).toEqual(manifest.anchorStaging.find(({ anchorId }) => anchorId === "anchor_guide")?.position);
    expect(staging.objective).toEqual(manifest.anchorStaging.find(({ anchorId }) => anchorId === "anchor_beacon")?.position);
    expect(staging.objectiveAnchor.anchorId).toBe("anchor_beacon");
    expect(staging.cameraAnchor.anchorId).toBe("anchor_guide");
    for (const position of [staging.guide, staging.objective, staging.landmark]) {
      expect(Math.hypot(position[0] - manifest.spawn[0], position[2] - manifest.spawn[2]))
        .toBeLessThanOrEqual(28);
    }
  });
});
