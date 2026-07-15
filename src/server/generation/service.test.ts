import { describe, expect, it, vi } from "vitest";

import { MockLocalGenerationProvider } from "../../dream/provider";
import {
  DreamGenerationService,
  type StructuredModelGateway,
} from "./service";
import type { GenerationFailureCategory } from "../../dream/provider";

async function validDreamSpec() {
  const local = await new MockLocalGenerationProvider().generate(
    {
      dreamText: "A flooded school where paper boats carried messages home.",
      intensity: "vivid",
      strategy: "mock-local",
      clientRequestId: "fixture-request",
    },
    new AbortController().signal,
  );
  return local.core;
}

describe("DreamGenerationService", () => {
  it("returns a server-validated single-Sol result from a structured model gateway", async () => {
    const core = await validDreamSpec();
    const gateway: StructuredModelGateway = {
      generate: async () => ({
        type: "success",
        value: core,
        model: "gpt-5.6-sol",
        providerRequestId: "provider-safe-id",
        usage: { inputTokens: 900, outputTokens: 4_200 },
      }),
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A flooded school where paper boats carried messages home.",
        intensity: "vivid",
        strategy: "single-sol",
        clientRequestId: "client-safe-id",
      },
      new AbortController().signal,
    );

    expect(result.core).toEqual(core);
    expect(result.metadata).toMatchObject({
      strategy: "single-sol",
      requestedStrategy: "single-sol",
      actualStrategy: "single-sol",
      modelAliases: ["gpt-5.6-sol"],
      fallbackUsed: false,
      requestId: "client-safe-id",
      providerRequestId: "provider-safe-id",
      usage: { inputTokens: 900, outputTokens: 4_200 },
    });
  });

  it("retries one transient failure exactly once and preserves request correlation", async () => {
    const core = await validDreamSpec();
    const seenRequestIds: string[] = [];
    let attempts = 0;
    const gateway: StructuredModelGateway = {
      generate: async (input) => {
        attempts += 1;
        seenRequestIds.push(input.requestId);
        if (attempts === 1) {
          return { type: "failure", category: "network", retryable: true };
        }
        return {
          type: "success",
          value: core,
          model: "gpt-5.6-sol",
          providerRequestId: "provider-second-attempt",
        };
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A city of bells under a violet ocean.",
        intensity: "fever",
        strategy: "single-sol",
        clientRequestId: "same-request-id",
      },
      new AbortController().signal,
    );

    expect(attempts).toBe(2);
    expect(seenRequestIds).toEqual(["same-request-id", "same-request-id"]);
    expect(result.metadata.attemptCount).toBe(2);
    expect(result.metadata.fallbackUsed).toBe(false);
  });

  it("falls back deterministically after the single transient retry is exhausted", async () => {
    let attempts = 0;
    const gateway: StructuredModelGateway = {
      generate: async () => {
        attempts += 1;
        return { type: "failure", category: "server", retryable: true };
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });
    const request = {
      dreamText: "I met a patient moon inside a clockwork garden.",
      intensity: "calm" as const,
      strategy: "single-sol" as const,
      clientRequestId: "fallback-request",
    };

    const first = await service.generate(request, new AbortController().signal);
    const second = await service.generate(request, new AbortController().signal);

    expect(attempts).toBe(4);
    expect(first.core).toEqual(second.core);
    expect(first.metadata).toMatchObject({
      strategy: "mock-local",
      requestedStrategy: "single-sol",
      actualStrategy: "mock-local",
      fallbackUsed: true,
      fallbackReason: "server",
      attemptCount: 2,
      requestId: "fallback-request",
    });
    expect(
      first.issues.filter(({ code }) => code === "provider_fallback"),
    ).toHaveLength(1);
  });

  it("uses the one retry budget for a mocked timeout and then falls back", async () => {
    let calls = 0;
    const service = new DreamGenerationService({
      gateway: {
        generate: async () => {
          calls += 1;
          return { type: "failure", category: "timeout", retryable: true };
        },
      },
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A slow clock floated over a quiet salt desert.",
        intensity: "calm",
        strategy: "single-sol",
        clientRequestId: "timeout-request",
      },
      new AbortController().signal,
    );

    expect(calls).toBe(2);
    expect(result.metadata).toMatchObject({
      fallbackUsed: true,
      fallbackReason: "timeout",
      attemptCount: 2,
    });
  });

  it("turns an elapsed request deadline into a timeout fallback", async () => {
    let calls = 0;
    const service = new DreamGenerationService({
      gateway: {
        generate: (_input, signal) => {
          calls += 1;
          return new Promise((_resolve, reject) => {
            signal.addEventListener(
              "abort",
              () =>
                reject(
                  signal.reason instanceof Error
                    ? signal.reason
                    : new DOMException("Timed out", "TimeoutError"),
                ),
              { once: true },
            );
          });
        },
      },
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 10,
    });

    const result = await service.generate(
      {
        dreamText: "A patient hourglass waited beside a frozen river.",
        intensity: "calm",
        strategy: "single-sol",
        clientRequestId: "deadline-timeout",
      },
      new AbortController().signal,
    );

    expect(calls).toBe(1);
    expect(result.metadata).toMatchObject({
      fallbackUsed: true,
      fallbackReason: "timeout",
      attemptCount: 1,
    });
  });

  it("uses the local fallback without touching the gateway when live API access is disabled", async () => {
    let calls = 0;
    const gateway: StructuredModelGateway = {
      generate: async () => {
        calls += 1;
        return { type: "failure", category: "unknown", retryable: false };
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: false,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A lantern whale drifted over my old neighborhood.",
        intensity: "vivid",
        strategy: "single-sol",
        clientRequestId: "disabled-request",
      },
      new AbortController().signal,
    );

    expect(calls).toBe(0);
    expect(result.metadata).toMatchObject({
      requestedStrategy: "single-sol",
      actualStrategy: "mock-local",
      fallbackUsed: true,
      fallbackReason: "api_disabled",
      attemptCount: 0,
    });
  });

  it("propagates an in-flight user cancellation without retrying or falling back", async () => {
    let calls = 0;
    const gateway: StructuredModelGateway = {
      generate: (_input, signal) => {
        calls += 1;
        return new Promise((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true },
          );
        });
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });
    const controller = new AbortController();
    const pending = service.generate(
      {
        dreamText: "A staircase unfolded into a garden.",
        intensity: "calm",
        strategy: "single-sol",
        clientRequestId: "cancel-request",
      },
      controller.signal,
    );

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toBe(1);
  });

  it("does not retry invalid structured output and falls back through the trusted compiler path", async () => {
    let calls = 0;
    const gateway: StructuredModelGateway = {
      generate: async () => {
        calls += 1;
        return {
          type: "success",
          value: { version: 1, title: "Looks plausible but is incomplete" },
          model: "gpt-5.6-sol",
        };
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A mirror train crossed a field of sleeping birds.",
        intensity: "vivid",
        strategy: "single-sol",
        clientRequestId: "invalid-request",
      },
      new AbortController().signal,
    );

    expect(calls).toBe(1);
    expect(result.metadata).toMatchObject({
      fallbackUsed: true,
      fallbackReason: "invalid_output",
      attemptCount: 1,
    });
  });

  it.each<GenerationFailureCategory>([
    "refusal",
    "rate_limit",
    "authentication",
    "quota",
    "invalid_output",
  ])("falls back without retrying a deterministic %s failure", async (category) => {
    let calls = 0;
    const gateway: StructuredModelGateway = {
      generate: async () => {
        calls += 1;
        return { type: "failure", category, retryable: false };
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A safe bounded test dream with one guide and one ending.",
        intensity: "calm",
        strategy: "single-sol",
        clientRequestId: `failure-${category}`,
      },
      new AbortController().signal,
    );

    expect(calls).toBe(1);
    expect(result.metadata).toMatchObject({
      fallbackUsed: true,
      fallbackReason: category,
      attemptCount: 1,
    });
  });

  it("emits a playable director core before optional enrichment settles", async () => {
    const core = await validDreamSpec();
    let releaseEnrichment!: (
      outcome: Awaited<ReturnType<StructuredModelGateway["generate"]>>,
    ) => void;
    const kinds: string[] = [];
    const gateway: StructuredModelGateway = {
      generate: async (input) => {
        kinds.push(input.kind);
        if (input.kind === "director") {
          return {
            type: "success",
            value: core.blueprint,
            model: "gpt-5.6-sol",
          };
        }
        if (input.kind === "core") {
          return { type: "success", value: core, model: "gpt-5.6-terra" };
        }
        return new Promise((resolve) => {
          releaseEnrichment = resolve;
        });
      },
    };
    const service = new DreamGenerationService({
      gateway,
      liveEnabled: true,
      directorEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });
    const progress: string[] = [];
    let settled = false;
    const pending = service.generate(
      {
        dreamText: "A city learned to sing while my family danced in golden rain.",
        intensity: "fever",
        strategy: "director-parallel",
        clientRequestId: "director-request",
      },
      new AbortController().signal,
      (event) => progress.push(event.phase),
    ).finally(() => {
      settled = true;
    });

    await vi.waitFor(() => expect(progress).toContain("core-ready"));
    expect(settled).toBe(false);
    expect(releaseEnrichment).toBeTypeOf("function");
    releaseEnrichment({
      type: "success",
      value: {
        version: 1,
        dialogueText: [],
        endingNarration: [
          { endingIndex: 0, narration: "The whole city holds the final golden note." },
        ],
      },
      model: "gpt-5.6-luna",
    });
    const result = await pending;

    expect(kinds).toEqual(["director", "core", "enrichment"]);
    expect(progress).toEqual(["requesting", "blueprint-ready", "core-ready", "enrichment-ready"]);
    expect(result.core.playGraph.endings[0]!.narration).toBe(
      "The whole city holds the final golden note.",
    );
    expect(result.metadata).toMatchObject({
      requestedStrategy: "director-parallel",
      actualStrategy: "director-parallel",
      fallbackUsed: false,
      modelAliases: ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"],
    });
  });

  it("discards invalid optional enrichment without losing the playable director core", async () => {
    const core = await validDreamSpec();
    const phases: string[] = [];
    const service = new DreamGenerationService({
      gateway: {
        generate: async (input) => {
          if (input.kind === "director") {
            return { type: "success", value: core.blueprint, model: input.model };
          }
          if (input.kind === "core") {
            return { type: "success", value: core, model: input.model };
          }
          return {
            type: "success",
            value: { version: 1, world: { radius: 999_999 } },
            model: input.model,
          };
        },
      },
      liveEnabled: true,
      directorEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A safe city folded itself into a paper bird.",
        intensity: "vivid",
        strategy: "director-parallel",
        clientRequestId: "invalid-enrichment",
      },
      new AbortController().signal,
      (event) => phases.push(event.phase),
    );

    expect(result.core).toEqual(core);
    expect(result.metadata.modelAliases).toEqual([
      "gpt-5.6-sol",
      "gpt-5.6-terra",
    ]);
    expect(phases).not.toContain("enrichment-ready");
    expect(result.metadata.fallbackUsed).toBe(false);
  });

  it("keeps director-parallel behind the server feature flag with zero gateway calls", async () => {
    let calls = 0;
    const service = new DreamGenerationService({
      gateway: {
        generate: async () => {
          calls += 1;
          return { type: "failure", category: "unknown", retryable: false };
        },
      },
      liveEnabled: true,
      directorEnabled: false,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "A feature flag guarded a city of glass moths.",
        intensity: "calm",
        strategy: "director-parallel",
        clientRequestId: "director-disabled",
      },
      new AbortController().signal,
    );

    expect(calls).toBe(0);
    expect(result.metadata).toMatchObject({
      requestedStrategy: "director-parallel",
      actualStrategy: "mock-local",
      fallbackReason: "api_disabled",
    });
  });

  it("shares exactly one retry across concurrent director branches", async () => {
    const core = await validDreamSpec();
    const calls: string[] = [];
    const service = new DreamGenerationService({
      gateway: {
        generate: async (input) => {
          calls.push(input.kind);
          if (input.kind === "director") {
            return { type: "success", value: core.blueprint, model: input.model };
          }
          return { type: "failure", category: "server", retryable: true };
        },
      },
      liveEnabled: true,
      directorEnabled: true,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
      timeoutMs: 1_000,
    });

    const result = await service.generate(
      {
        dreamText: "Two roads raced beneath a single careful retry budget.",
        intensity: "fever",
        strategy: "director-parallel",
        clientRequestId: "shared-retry",
      },
      new AbortController().signal,
    );

    expect(calls).toHaveLength(4);
    expect(calls.filter((kind) => kind === "director")).toHaveLength(1);
    expect(result.metadata).toMatchObject({
      fallbackUsed: true,
      fallbackReason: "server",
      attemptCount: 4,
    });
  });
});
