import { describe, expect, it } from "vitest";
import { compileDreamDescriptor } from "../../src/dream";
import { worldToChunk } from "../../src/engine/chunkMath";
import { adaptDreamManifest } from "../../src/integration/dreamRuntimeAdapter";
import { evaluateSemanticFidelity } from "../../src/integration/semanticFidelity";
import { createG71ReferenceDreams } from "../fixtures/g7-1-referenceDreams";

describe("G7.1 semantic-fidelity reference dreams", () => {
  it("keeps each curated dream physically grounded on the production compiler/runtime path", async () => {
    const fixtures = await createG71ReferenceDreams();

    for (const fixture of fixtures) {
      const manifest = compileDreamDescriptor(fixture.spec);
      const runtime = adaptDreamManifest(manifest);
      const report = evaluateSemanticFidelity(manifest, runtime);

      expect(runtime.scenario.kind).toBe(fixture.expectedScenario);
      expect(report.highPriorityCoverage).toBeGreaterThanOrEqual(0.8);
      expect(report.centralObjectCovered).toBe(true);
      expect(report.mechanicAligned).toBe(true);
      expect(report.objectiveAligned).toBe(true);
      expect(report.entitiesRecognizable).toBe(true);
      expect(report.endingAligned).toBe(true);
      expect(report.unrelatedGenericBeacon).toBe(false);
      expect(report.unsupported).toEqual([]);
      expect(runtime.entityInstances.length).toBeLessThanOrEqual(12);

      const chunks = new Map<string, { chunkX: number; chunkZ: number }>();
      for (const structure of runtime.voxelStructures) {
        const x = worldToChunk(structure.position[0]);
        const z = worldToChunk(structure.position[2]);
        chunks.set(`${x.chunk},${z.chunk}`, { chunkX: x.chunk, chunkZ: z.chunk });
      }
      const startedAt = performance.now();
      for (const chunk of chunks.values()) runtime.generator.generate(chunk);
      const chunkMaterializationMs = performance.now() - startedAt;
      expect(chunkMaterializationMs).toBeLessThan(250);
    }
  });

  it("fails a supported objective that regresses to fallback beacon staging", async () => {
    const [fixture] = await createG71ReferenceDreams();
    const manifest = compileDreamDescriptor(fixture!.spec);
    const corruptedManifest = {
      ...manifest,
      anchorStaging: manifest.anchorStaging.map((anchor) => anchor.gameplayRole === "objective" ? {
        ...anchor,
        source: "fallback" as const,
        sourceId: null,
      } : anchor),
    };
    const runtime = adaptDreamManifest(corruptedManifest);
    const report = evaluateSemanticFidelity(corruptedManifest, runtime);

    expect(report.unrelatedGenericBeacon).toBe(true);
    expect(report.objectiveAligned).toBe(false);
  });
});
