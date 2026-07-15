import { describe, expect, it } from "vitest";

import {
  LastKnownGoodGenerationProvider,
  SafeDreamCache,
  warmBundledSampleCache,
} from "./cache";
import {
  MockLocalGenerationProvider,
  type DreamGenerationProvider,
} from "./provider";

class MemoryStorage {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("SafeDreamCache", () => {
  it("round-trips only an exact validated result without storing raw dream text", async () => {
    const storage = new MemoryStorage();
    const now = () => 10_000;
    const cache = new SafeDreamCache({ storage, now, capacity: 2, ttlMs: 60_000 });
    const request = {
      dreamText: "My private unrepeatable dream phrase.",
      intensity: "vivid" as const,
      strategy: "single-sol" as const,
      clientRequestId: "cache-request",
    };
    const result = await new MockLocalGenerationProvider().generate(
      { ...request, strategy: "mock-local" },
      new AbortController().signal,
    );

    cache.write(request, result);

    expect(cache.read(request)?.core).toEqual(result.core);
    expect(cache.read({ ...request, dreamText: "A different dream." })).toBeNull();
    expect([...storage.values.values()].join("\n")).not.toContain('"dreamText"');
  });

  it("uses an exact last-known-good result after a route failure", async () => {
    const storage = new MemoryStorage();
    const cache = new SafeDreamCache({ storage, now: () => 10_000 });
    const request = {
      dreamText: "A brass orchard sang my name in reverse.",
      intensity: "fever" as const,
      strategy: "single-sol" as const,
      clientRequestId: "cached-provider-request",
    };
    const local = await new MockLocalGenerationProvider().generate(
      { ...request, strategy: "mock-local" },
      new AbortController().signal,
    );
    const generated = {
      ...local,
      metadata: {
        ...local.metadata,
        strategy: "single-sol" as const,
        requestedStrategy: "single-sol" as const,
        actualStrategy: "single-sol" as const,
      },
    };
    let calls = 0;
    const primary: DreamGenerationProvider = {
      generate: async () => {
        calls += 1;
        if (calls === 1) return generated;
        throw new TypeError("route offline");
      },
    };
    const provider = new LastKnownGoodGenerationProvider(primary, cache);

    await provider.generate(request, new AbortController().signal);
    const recovered = await provider.generate(request, new AbortController().signal);

    expect(recovered.core).toEqual(generated.core);
    expect(recovered.metadata).toMatchObject({
      fallbackUsed: true,
      fallbackReason: "network",
      requestedStrategy: "single-sol",
    });
  });

  it("warms three validated bundled showcase dreams without storing prompt text", async () => {
    const storage = new MemoryStorage();
    const cache = new SafeDreamCache({ storage, now: () => 10_000 });
    const samples = [
      "A moonlit kitchen where teacups floated around a patient moth.",
      "A flooded school where paper boats carried messages from home.",
      "A golden rainstorm turned city buildings into instruments.",
    ];

    const count = await warmBundledSampleCache(
      cache,
      samples,
      new AbortController().signal,
    );

    expect(count).toBe(3);
    for (const dreamText of samples) {
      expect(
        cache.read({
          dreamText,
          intensity: "vivid",
          strategy: "single-sol",
          clientRequestId: "later-request",
        }),
      ).not.toBeNull();
    }
    const serialized = [...storage.values.values()].join("\n");
    expect(JSON.parse(serialized)).toHaveLength(3);
    expect(serialized).not.toContain('"dreamText"');
  });

  it("treats corrupted or unavailable storage as an empty optional cache", async () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
    };
    const cache = new SafeDreamCache({ storage: throwingStorage });
    const request = {
      dreamText: "A private dream that should not break when storage is blocked.",
      intensity: "calm" as const,
      strategy: "single-sol" as const,
      clientRequestId: "blocked-storage",
    };
    const result = await new MockLocalGenerationProvider().generate(
      { ...request, strategy: "mock-local" },
      new AbortController().signal,
    );

    expect(cache.read(request)).toBeNull();
    expect(() => cache.write(request, result)).not.toThrow();

    const corrupted = new MemoryStorage();
    corrupted.setItem("dreamcraft:g3:last-known-good:v1", "not-json");
    expect(
      new SafeDreamCache({ storage: corrupted }).read(request),
    ).toBeNull();
  });
});
