import { describe, expect, it } from "vitest";
import example from "../../schemas/dream-spec-v1.example.json";
import {
  compileDreamDescriptor,
  MockLocalGenerationProvider,
  sampleCompiledBlock,
  sanitizeDreamSpec,
} from "../../src/dream";
import { adaptDreamManifest } from "../../src/integration/dreamRuntimeAdapter";
import { compileProceduralAudio } from "../../src/audio";

const REPRESENTATIVE_DREAMS = [
  "A candy forest where trees sing whenever I jump.",
  "A flying city carried by whales above a violet storm.",
  "A flooded school repeated forever while paper boats brought messages from my childhood dog.",
  "A talking moon lived inside a teapot and asked me to repair its crown.",
  "I found my lost dog in a quiet memory forest beside our old home.",
  "My family celebrated beneath golden rain while buildings became instruments.",
] as const;

describe("DreamSpec representative corpus", () => {
  it("compiles varied local dreams into bounded playable runtime descriptors", async () => {
    const provider = new MockLocalGenerationProvider();
    const manifests = await Promise.all(REPRESENTATIVE_DREAMS.map(async (dreamText, index) => {
      const result = await provider.generate({
        dreamText,
        intensity: index % 2 === 0 ? "vivid" : "fever",
        strategy: "mock-local",
        clientRequestId: `eval-${index}`,
      }, new AbortController().signal);
      const manifest = compileDreamDescriptor(result.core, result.issues);
      const runtime = adaptDreamManifest(manifest);
      const spawnGround = sampleCompiledBlock(
        manifest.generator,
        manifest.spawn[0],
        manifest.spawn[1] - 1,
        manifest.spawn[2],
      );
      const chunk = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });

      expect(spawnGround).not.toBe("air");
      expect(manifest.anchorStaging.length).toBeGreaterThanOrEqual(3);
      expect(chunk.voxels.some((block) => block !== 0)).toBe(true);
      expect(JSON.stringify(manifest)).not.toMatch(/javascript:|data:text\/html|<script/i);
      return manifest;
    }));

    expect(new Set(manifests.map(({ seed }) => seed)).size).toBe(REPRESENTATIVE_DREAMS.length);
  });

  it("keeps a hostile maximum path workload within the chunk latency budget", () => {
    const candidate = structuredClone(example);
    const path = candidate.world.terrain.find(({ kind }) => kind === "path_bias") as {
      points: number[][];
    };
    path.points = Array.from({ length: 128 }, (_, index) => [index - 64, index % 11]);
    const sanitized = sanitizeDreamSpec(candidate);
    expect(sanitized.success).toBe(true);
    if (!sanitized.success) return;
    const runtime = adaptDreamManifest(compileDreamDescriptor(sanitized.spec, sanitized.issues));

    const startedAt = performance.now();
    const chunk = runtime.generator.generate({ chunkX: 0, chunkZ: 0 });
    const elapsedMs = performance.now() - startedAt;

    expect(chunk.voxels.some((block) => block !== 0)).toBe(true);
    expect(elapsedMs).toBeLessThan(250);
  });

  it("gives the six G4 gate dreams distinct mechanics, silhouettes, atmosphere, and sound", async () => {
    const provider = new MockLocalGenerationProvider();
    const gateDreams = [
      "A candy forest where every jump bounces and sugar trees sing.",
      "A flying city threaded by strong sky winds above the clouds.",
      "A flooded school nightmare where I escape a hallway shadow.",
      "A talking moon teapot guarded by a grumpy silver spoon.",
      "A memory where I find my lost dog and bring him home.",
      "My family wins the lottery and dances on a bright stage.",
    ] as const;
    const fingerprints = await Promise.all(gateDreams.map(async (dreamText, index) => {
      const generated = await provider.generate({
        dreamText,
        intensity: "vivid",
        strategy: "mock-local",
        clientRequestId: `g4-gate-${index}`,
      }, new AbortController().signal);
      const runtime = adaptDreamManifest(compileDreamDescriptor(generated.core, generated.issues));
      const hero = runtime.heroEntity!;
      const physics = runtime.physicsProfile;
      return {
        scenario: runtime.scenario.kind,
        mechanic: runtime.scenario.mechanic,
        movement: runtime.scenario.movementSignature,
        silhouette: hero.visual.bodyPlan,
        particles: runtime.atmosphere.particles.kind,
        audio: compileProceduralAudio(generated.core.audio).mood,
        actionCount: runtime.story.awakenObjective.target,
        atmosphereTransition: runtime.story.transformation.atmospherePatchId,
        physics: JSON.stringify({
          gravity: physics.world.gravity,
          timeScale: physics.world.globalTimeScale,
          wind: physics.world.windStrength,
          buoyancy: physics.world.defaultBuoyancy,
          abilities: physics.player.abilities,
          contact: physics.materials[0]?.contactEffect,
          fields: physics.fields.map(({ effect }) => effect.kind),
          transition: physics.transitions[0]?.id,
        }),
      };
    }));

    for (const key of ["scenario", "mechanic", "movement", "silhouette", "particles", "physics"] as const) {
      expect(new Set(fingerprints.map((fingerprint) => fingerprint[key]))).toHaveLength(gateDreams.length);
    }
    expect(new Set(fingerprints.map(({ audio }) => audio))).toHaveLength(gateDreams.length);
    expect(fingerprints.map(({ actionCount }) => actionCount)).toEqual([3, 2, 3, 2, 2, 4]);
    expect(new Set(fingerprints.map(({ atmosphereTransition }) => atmosphereTransition)))
      .toHaveLength(gateDreams.length);
  });
});
