import { z } from "zod";

import type { DreamGenerationRequest } from "../dream/provider";
import type { DreamGenerationProgressEvent } from "../dream/provider";
import { DreamGenerationService } from "./generation/service.js";

const IntensitySchema = z.enum(["calm", "vivid", "fever"]);
const StrategySchema = z.enum([
  "mock-local",
  "single-sol",
  "director-parallel",
]);
const WireRequestSchema = z.strictObject({
  dreamText: z.string(),
  intensity: IntensitySchema,
  strategy: StrategySchema,
  clientRequestId: z.string().max(100),
});

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface DreamRouteLogEvent {
  requestId: string;
  event: "completed" | "rejected" | "failed" | "cancelled";
  status: number;
  durationMs: number;
  category?: string;
}

export interface DreamRouteOptions {
  service: DreamGenerationService;
  maximumBodyBytes: number;
  maximumDreamCharacters: number;
  createRequestId: () => string;
  rateLimit: (request: Request) => Promise<RateLimitDecision>;
  log?: (event: DreamRouteLogEvent) => void;
}

function normalizeDreamText(value: string, maximumCharacters: number): string {
  return Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint < 32 || codePoint === 127 ? " " : character;
  })
    .join("")
    .replace(/[<>]/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumCharacters);
}

function hasMeaningfulDreamDetail(value: string): boolean {
  const symbols = Array.from(value.toLocaleLowerCase("en"))
    .filter((character) => /[\p{L}\p{N}]/u.test(character));
  return symbols.length >= 4 && new Set(symbols).size >= 3;
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "x-request-id": requestId,
      ...extraHeaders,
    },
  });
}

function responseHeaders(
  requestId: string,
  contentType: string,
): Record<string, string> {
  return {
    "cache-control": "no-store",
    "content-type": contentType,
    "x-content-type-options": "nosniff",
    "x-request-id": requestId,
  };
}

function encodeFrame(value: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(value)}\n`);
}

function safeRequestId(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9._:-]/g, "").slice(0, 100);
  return normalized || "dreamcraft-request";
}

function hasExactSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readBoundedBody(
  request: Request,
  maximumBytes: number,
): Promise<{ bytes: Uint8Array; tooLarge: boolean }> {
  if (!request.body) return { bytes: new Uint8Array(), tooLarge: false };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel("dream_request_body_too_large").catch(() => undefined);
        return { bytes: new Uint8Array(), tooLarge: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, tooLarge: false };
}

export function createDreamRoute(
  options: DreamRouteOptions,
): (request: Request) => Promise<Response> {
  return async (request): Promise<Response> => {
    const startedAt = performance.now();
    const requestId = safeRequestId(options.createRequestId());
    const finish = (
      event: DreamRouteLogEvent["event"],
      status: number,
      category?: string,
    ): void => {
      options.log?.({
        requestId,
        event,
        status,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
        ...(category ? { category } : {}),
      });
    };

    if (request.method !== "POST") {
      finish("rejected", 405, "method_not_allowed");
      return jsonResponse(
        { error: { code: "method_not_allowed", message: "Use POST for dream generation." } },
        405,
        requestId,
        { allow: "POST" },
      );
    }
    if (!hasExactSameOrigin(request)) {
      finish("rejected", 403, "origin_not_allowed");
      return jsonResponse(
        { error: { code: "origin_not_allowed", message: "This dream request must come from the DreamCraft page." } },
        403,
        requestId,
      );
    }
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) {
      finish("rejected", 415, "unsupported_media_type");
      return jsonResponse(
        { error: { code: "unsupported_media_type", message: "Send a JSON request body." } },
        415,
        requestId,
      );
    }

    const rateLimit = await options.rateLimit(request);
    if (!rateLimit.allowed) {
      finish("rejected", 429, "rate_limit");
      return jsonResponse(
        { error: { code: "rate_limit", message: "Too many dreams are materializing. Try again shortly." } },
        429,
        requestId,
        rateLimit.retryAfterSeconds
          ? { "retry-after": String(rateLimit.retryAfterSeconds) }
          : {},
      );
    }

    const declaredLength = Number.parseInt(
      request.headers.get("content-length") ?? "0",
      10,
    );
    if (Number.isFinite(declaredLength) && declaredLength > options.maximumBodyBytes) {
      finish("rejected", 413, "body_too_large");
      return jsonResponse(
        { error: { code: "body_too_large", message: "The dream request is too large." } },
        413,
        requestId,
      );
    }

    let decoded: unknown;
    try {
      const body = await readBoundedBody(request, options.maximumBodyBytes);
      if (body.tooLarge) {
        finish("rejected", 413, "body_too_large");
        return jsonResponse(
          { error: { code: "body_too_large", message: "The dream request is too large." } },
          413,
          requestId,
        );
      }
      decoded = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(body.bytes),
      ) as unknown;
    } catch {
      finish("rejected", 400, "invalid_json");
      return jsonResponse(
        { error: { code: "invalid_json", message: "The dream request must contain valid JSON." } },
        400,
        requestId,
      );
    }

    const parsed = WireRequestSchema.safeParse(decoded);
    if (!parsed.success) {
      finish("rejected", 400, "invalid_request");
      return jsonResponse(
        { error: { code: "invalid_request", message: "The dream request fields are invalid." } },
        400,
        requestId,
      );
    }
    const dreamText = normalizeDreamText(
      parsed.data.dreamText,
      options.maximumDreamCharacters,
    );
    if (dreamText.length < 12 || !hasMeaningfulDreamDetail(dreamText)) {
      finish("rejected", 400, "dream_too_short");
      return jsonResponse(
        { error: { code: "dream_too_short", message: "Describe at least one remembered dream detail." } },
        400,
        requestId,
      );
    }

    const generationRequest: DreamGenerationRequest = {
      dreamText,
      intensity: parsed.data.intensity,
      strategy: parsed.data.strategy,
      clientRequestId: requestId,
    };
    if ((request.headers.get("accept") ?? "").includes("application/x-ndjson")) {
      const streamController = new AbortController();
      const generationSignal = AbortSignal.any([
        request.signal,
        streamController.signal,
      ]);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          let closed = false;
          const send = (frame: unknown): void => {
            if (closed) return;
            try {
              controller.enqueue(encodeFrame(frame));
            } catch {
              closed = true;
              streamController.abort(
                new DOMException("Dream response stream closed", "AbortError"),
              );
            }
          };
          const progress = (event: DreamGenerationProgressEvent): void => {
            if (event.phase === "core-ready") {
              send({ type: "core", result: event.result });
            } else {
              send({ type: "progress", phase: event.phase });
            }
          };
          void options.service
            .generate(generationRequest, generationSignal, progress)
            .then((result) => {
              send({ type: "result", result });
              finish("completed", 200);
            })
            .catch((error: unknown) => {
              const cancelled =
                generationSignal.aborted ||
                (error instanceof DOMException && error.name === "AbortError");
              send({
                type: "error",
                code: cancelled ? "cancelled" : "generation_failed",
              });
              finish(
                cancelled ? "cancelled" : "failed",
                cancelled ? 499 : 500,
                cancelled ? "cancelled" : "generation_failed",
              );
            })
            .finally(() => {
              if (!closed) {
                closed = true;
                try {
                  controller.close();
                } catch {
                  // The browser may close the stream between the final send and close.
                }
              }
            });
        },
        cancel() {
          streamController.abort(
            new DOMException("Dream generation was aborted", "AbortError"),
          );
        },
      });
      return new Response(stream, {
        status: 200,
        headers: responseHeaders(
          requestId,
          "application/x-ndjson; charset=utf-8",
        ),
      });
    }
    try {
      const result = await options.service.generate(
        generationRequest,
        request.signal,
      );
      finish("completed", 200);
      return jsonResponse(result, 200, requestId);
    } catch (error) {
      if (
        request.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        finish("cancelled", 499, "cancelled");
        return jsonResponse(
          { error: { code: "cancelled", message: "Dream generation was cancelled." } },
          499,
          requestId,
        );
      }
      finish("failed", 500, "generation_failed");
      return jsonResponse(
        { error: { code: "generation_failed", message: "The dream could not be materialized." } },
        500,
        requestId,
      );
    }
  };
}
