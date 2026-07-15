import { describe, expect, it } from "vitest";

import {
  compileDreamDescriptor,
  MockLocalGenerationProvider,
  sampleCompiledBlock,
} from "../../src/dream";
import {
  DreamGenerationService,
  type StructuredModelGateway,
} from "../../src/server/generation/service";

const G3_VALIDATION_DREAMS = [
  "A moonlit kitchen where teacups floated around a patient moth.",
  "A flooded school repeated forever while paper boats carried messages home.",
  "My family danced in golden rain while the city became an orchestra.",
  "A friendly whale carried a library through a violet thunderstorm.",
  "I found my childhood dog beside a glowing tree in a quiet memory forest.",
  "A tiny train crossed the rings of Saturn to deliver a forgotten birthday cake.",
  "Gravity changed direction whenever a choir of stone birds began to sing.",
  "An underwater village asked me to repair its lighthouse before sunrise.",
  "I raced a paper dragon across rooftops while the streets folded like ribbons.",
  "A shy moon lived inside a teapot and needed help finding its silver crown.",
] as const;

function mockGateway(): StructuredModelGateway {
  const local = new MockLocalGenerationProvider();
  return {
    generate: async (input, signal) => {
      const result = await local.generate(
        {
          dreamText: input.dreamText,
          intensity: input.intensity,
          strategy: "mock-local",
          clientRequestId: input.requestId,
        },
        signal,
      );
      if (input.kind === "director") {
        return {
          type: "success",
          value: result.core.blueprint,
          model: input.model,
          usage: { inputTokens: 700, outputTokens: 500 },
        };
      }
      if (input.kind === "enrichment") {
        return {
          type: "success",
          value: {
            version: 1,
            dialogueText: [],
            endingNarration: [],
          },
          model: input.model,
          usage: { inputTokens: 600, outputTokens: 200 },
        };
      }
      return {
        type: "success",
        value: result.core,
        model: input.model,
        usage: {
          inputTokens: input.kind === "single-sol" ? 2_000 : 1_300,
          outputTokens: 2_000,
        },
      };
    },
  };
}

describe("G3 mocked strategy benchmark", () => {
  it("keeps ten varied prompts playable for both strategies without promoting the experiment", async () => {
    const gateway = mockGateway();
    const services = {
      "single-sol": new DreamGenerationService({
        gateway,
        liveEnabled: true,
        directorEnabled: false,
        models: {
          sol: "gpt-5.6-sol",
          terra: "gpt-5.6-terra",
          luna: "gpt-5.6-luna",
        },
        timeoutMs: 2_000,
      }),
      "director-parallel": new DreamGenerationService({
        gateway,
        liveEnabled: true,
        directorEnabled: true,
        models: {
          sol: "gpt-5.6-sol",
          terra: "gpt-5.6-terra",
          luna: "gpt-5.6-luna",
        },
        timeoutMs: 2_000,
      }),
    } as const;
    const scores: Record<keyof typeof services, number[]> = {
      "single-sol": [],
      "director-parallel": [],
    };
    const costs: Record<keyof typeof services, number> = {
      "single-sol": 0,
      "director-parallel": 0,
    };

    for (const [strategy, service] of Object.entries(services) as Array<
      [keyof typeof services, DreamGenerationService]
    >) {
      for (const [index, dreamText] of G3_VALIDATION_DREAMS.entries()) {
        const startedAt = performance.now();
        let coreReadyAt: number | null = null;
        const result = await service.generate(
          {
            dreamText,
            intensity: index % 3 === 0 ? "fever" : index % 2 === 0 ? "vivid" : "calm",
            strategy,
            clientRequestId: `mock-eval-${strategy}-${index}`,
          },
          new AbortController().signal,
          (event) => {
            if (event.phase === "core-ready" && coreReadyAt === null) {
              coreReadyAt = performance.now();
            }
          },
        );
        const manifest = compileDreamDescriptor(result.core, result.issues);
        const spawnGround = sampleCompiledBlock(
          manifest.generator,
          manifest.spawn[0],
          manifest.spawn[1] - 1,
          manifest.spawn[2],
        );
        const qualityScore = [
          manifest.anchorStaging.length >= 3,
          spawnGround !== "air",
          result.core.entities.some(
            (entity) =>
              entity.tags.includes("hero") &&
              entity.visual.recognitionFeatures.length >= 3,
          ),
          result.core.playGraph.beats.length > 0,
          result.core.playGraph.endings.length > 0,
        ].filter(Boolean).length;

        expect(result.metadata.fallbackUsed).toBe(false);
        expect(qualityScore).toBe(5);
        scores[strategy].push(
          (coreReadyAt ?? performance.now()) - startedAt,
        );
        const usage = result.metadata.usage;
        if (usage) {
          costs[strategy] +=
            (usage.inputTokens * 5 + usage.outputTokens * 30) /
            1_000_000;
        }
      }
    }

    expect(scores["single-sol"]).toHaveLength(10);
    expect(scores["director-parallel"]).toHaveLength(10);
    expect(Math.max(...scores["single-sol"])).toBeLessThan(2_000);
    expect(Math.max(...scores["director-parallel"])).toBeLessThan(2_000);
    expect(costs["director-parallel"]).toBeGreaterThan(costs["single-sol"]);
  });
});
