import { describe, expect, it } from "vitest";

import {
  FallbackGenerationProvider,
  MockLocalGenerationProvider,
  type DreamGenerationProvider,
} from "./provider";

const request = {
  dreamText: "I flew through a blue library with a kind moon.",
  intensity: "vivid" as const,
  strategy: "mock-local" as const,
  clientRequestId: "test-request",
};

describe("MockLocalGenerationProvider", () => {
  it("produces deterministic validated local results", async () => {
    const provider = new MockLocalGenerationProvider();

    const first = await provider.generate(request, new AbortController().signal);
    const second = await provider.generate(request, new AbortController().signal);

    expect(first.core).toEqual(second.core);
    expect(first.metadata.fallbackUsed).toBe(false);
    expect(first.metadata.strategy).toBe("mock-local");
  });

  it("honors an already-aborted request", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      new MockLocalGenerationProvider().generate(request, controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("FallbackGenerationProvider", () => {
  it("returns the deterministic local fragment when a primary provider fails", async () => {
    const failingProvider: DreamGenerationProvider = {
      generate: () => Promise.reject(new Error("network unavailable")),
    };
    const provider = new FallbackGenerationProvider(
      failingProvider,
      new MockLocalGenerationProvider(),
    );

    const result = await provider.generate(
      { ...request, strategy: "single-sol" },
      new AbortController().signal,
    );

    expect(result.metadata.fallbackUsed).toBe(true);
    expect(result.metadata.strategy).toBe("mock-local");
    expect(result.issues.some((issue) => issue.code === "provider_fallback")).toBe(
      true,
    );
  });
});
