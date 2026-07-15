import { describe, expect, it } from "vitest";

import { HttpDreamGenerationProvider } from "./httpProvider";
import { MockLocalGenerationProvider } from "./provider";

async function validResult() {
  return new MockLocalGenerationProvider().generate(
    {
      dreamText: "A golden rainstorm turned every building into an instrument.",
      intensity: "fever",
      strategy: "mock-local",
      clientRequestId: "wire-fixture",
    },
    new AbortController().signal,
  );
}

describe("HttpDreamGenerationProvider", () => {
  it("posts to the application route and revalidates the complete response", async () => {
    const fixture = await validResult();
    let capturedUrl = "";
    let capturedBody = "";
    const provider = new HttpDreamGenerationProvider({
      endpoint: "/api/dream",
      fetcher: async (input, init) => {
        capturedUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        capturedBody = typeof init?.body === "string" ? init.body : "";
        return Response.json(fixture, {
          headers: { "x-request-id": "wire-fixture" },
        });
      },
    });

    const result = await provider.generate(
      {
        dreamText: "A golden rainstorm turned every building into an instrument.",
        intensity: "fever",
        strategy: "single-sol",
        clientRequestId: "browser-request",
      },
      new AbortController().signal,
    );

    expect(capturedUrl).toBe("/api/dream");
    expect(JSON.parse(capturedBody)).toMatchObject({
      strategy: "single-sol",
      clientRequestId: "browser-request",
    });
    expect(result.core).toEqual(fixture.core);
    expect(result.metadata.strategy).toBe("mock-local");
  });

  it("validates progressive frames and exposes a playable core before the final result", async () => {
    const fixture = await validResult();
    const body = [
      { type: "progress", phase: "requesting" },
      { type: "progress", phase: "blueprint-ready" },
      { type: "core", result: fixture },
      { type: "progress", phase: "enrichment-ready" },
      { type: "result", result: fixture },
    ]
      .map((frame) => JSON.stringify(frame))
      .join("\n");
    const provider = new HttpDreamGenerationProvider({
      endpoint: "/api/dream",
      fetcher: async () =>
        new Response(`${body}\n`, {
          headers: {
            "content-type": "application/x-ndjson",
            "x-request-id": "wire-fixture",
          },
        }),
    });
    const phases: string[] = [];

    const result = await provider.generate(
      {
        dreamText: "A golden rainstorm turned every building into an instrument.",
        intensity: "fever",
        strategy: "director-parallel",
        clientRequestId: "browser-request",
      },
      new AbortController().signal,
      (event) => phases.push(event.phase),
    );

    expect(phases).toEqual([
      "requesting",
      "blueprint-ready",
      "core-ready",
      "enrichment-ready",
    ]);
    expect(result.core).toEqual(fixture.core);
  });

  it("cancels an upstream stream when a frame is malformed", async () => {
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"type":"unknown"}\n'));
      },
      cancel() {
        cancelled = true;
      },
    });
    const provider = new HttpDreamGenerationProvider({
      endpoint: "/api/dream",
      fetcher: async () =>
        new Response(stream, {
          headers: {
            "content-type": "application/x-ndjson",
            "x-request-id": "malformed-stream",
          },
        }),
    });

    await expect(
      provider.generate(
        {
          dreamText: "A malformed stream waited beside a safe fallback gate.",
          intensity: "calm",
          strategy: "single-sol",
          clientRequestId: "malformed-stream",
        },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "invalid_stream_frame" });
    expect(cancelled).toBe(true);
  });

  it("rejects and cancels a streamed result with a mismatched request ID", async () => {
    const fixture = await validResult();
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            `${JSON.stringify({ type: "core", result: fixture })}\n`,
          ),
        );
      },
      cancel() {
        cancelled = true;
      },
    });
    const provider = new HttpDreamGenerationProvider({
      endpoint: "/api/dream",
      fetcher: async () =>
        new Response(stream, {
          headers: {
            "content-type": "application/x-ndjson",
            "x-request-id": "different-request-id",
          },
        }),
    });

    await expect(
      provider.generate(
        {
          dreamText: "Two request identifiers disagreed beside a silver gate.",
          intensity: "vivid",
          strategy: "director-parallel",
          clientRequestId: "browser-request",
        },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "request_id_mismatch" });
    expect(cancelled).toBe(true);
  });
});
