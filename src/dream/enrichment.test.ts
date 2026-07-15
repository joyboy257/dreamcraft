import { describe, expect, it } from "vitest";

import {
  DreamEnrichmentPatchSchema,
  applyDreamEnrichmentPatch,
} from "./enrichment";
import { MockLocalGenerationProvider } from "./provider";

async function validCore() {
  return (
    await new MockLocalGenerationProvider().generate(
      {
        dreamText: "A quiet lighthouse remembered every visitor.",
        intensity: "calm",
        strategy: "mock-local",
        clientRequestId: "enrichment-fixture",
      },
      new AbortController().signal,
    )
  ).core;
}

describe("trusted dream enrichment", () => {
  it("applies only bounded narrative slots without mutating the playable core", async () => {
    const core = await validCore();
    const patch = DreamEnrichmentPatchSchema.parse({
      version: 1,
      dialogueText: [],
      endingNarration: [
        { endingIndex: 0, narration: "The lighthouse keeps one warm window for you." },
      ],
    });

    const enriched = applyDreamEnrichmentPatch(core, patch);

    expect(enriched.success).toBe(true);
    if (!enriched.success) return;
    expect(enriched.spec.playGraph.endings[0]!.narration).toBe(
      "The lighthouse keeps one warm window for you.",
    );
    expect(core.playGraph.endings[0]!.narration).not.toBe(
      enriched.spec.playGraph.endings[0]!.narration,
    );
  });
});
