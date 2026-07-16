import { describe, expect, it } from "vitest";
import { MockLocalGenerationProvider, compileDreamDescriptor, type DreamSpecV1 } from "../dream";
import { compileVoxelStructures } from "./structureMaterializer";
import { compileEntityInstances } from "./entityMaterializer";

describe("compileEntityInstances", () => {
  it("keeps every authored fixed family member visible at entry", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a lottery family celebration",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "entity-materializer",
    }, new AbortController().signal);
    const family: DreamSpecV1["entities"][number] = {
      ...generated.core.entities[0]!,
      id: "family_member",
      role: "companion" as const,
      spawn: { kind: "fixed", positions: [[-8, 12, -5], [-5, 12, -5], [-2, 12, -5]] },
      tags: ["family", "anchor_guide"],
    };
    const manifest = compileDreamDescriptor({
      ...generated.core,
      entities: [generated.core.entities[0]!, family],
    }, generated.issues);
    const structures = compileVoxelStructures(manifest.spec.structures, {
      seed: manifest.seed,
      radius: manifest.generator.radius,
      height: manifest.generator.height,
      spawn: manifest.spawn,
      surfaceAt: () => 8,
    });
    const instances = compileEntityInstances(manifest, structures, () => 8);
    const familyInstances = instances.filter(({ entityId }) => entityId === "family_member");

    expect(familyInstances).toHaveLength(3);
    expect(familyInstances.every(({ visibleAtEntry }) => visibleAtEntry)).toBe(true);
    expect(familyInstances.map(({ position }) => [position[0], position[2]])).toEqual([[-8, -5], [-5, -5], [-2, -5]]);
  });

  it("keeps an entity hidden only when the play graph explicitly spawns it later", async () => {
    const generated = await new MockLocalGenerationProvider().generate({
      dreamText: "a flooded school",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "staged-entity",
    }, new AbortController().signal);
    const lateEntity: DreamSpecV1["entities"][number] = {
      ...generated.core.entities[0]!,
      id: "late-companion",
      role: "companion" as const,
      spawn: { kind: "fixed", positions: [[6, 12, 4]] },
      tags: ["companion"],
    };
    const manifest = compileDreamDescriptor({
      ...generated.core,
      entities: [generated.core.entities[0]!, lateEntity],
      playGraph: {
        ...generated.core.playGraph,
        beats: generated.core.playGraph.beats.map((beat, index) => index === 0 ? {
          ...beat,
          onComplete: [...beat.onComplete, { kind: "spawn_entity" as const, entityId: "late-companion", position: [6, 12, 4] as [number, number, number] }],
        } : beat),
      },
    }, generated.issues);
    const instances = compileEntityInstances(manifest, [], () => 8);

    expect(instances.find(({ entityId }) => entityId === "late-companion")?.visibleAtEntry).toBe(false);
  });
});
