import {
  DreamGenerationResultSchema,
  DreamGenerationStreamFrameSchema,
} from "./generationWire";
import type {
  DreamGenerationProgressListener,
  DreamGenerationProvider,
  DreamGenerationRequest,
  DreamGenerationResult,
} from "./provider";
import { sanitizeDreamSpec } from "./sanitizer";

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export class DreamRouteError extends Error {
  constructor(readonly code: string) {
    super("Dream generation route failed safely");
    this.name = "DreamRouteError";
  }
}

export class HttpDreamGenerationProvider implements DreamGenerationProvider {
  private readonly endpoint: string;
  private readonly fetcher: Fetcher;

  constructor(options: { endpoint: string; fetcher?: Fetcher }) {
    this.endpoint = options.endpoint;
    this.fetcher = options.fetcher ?? fetch;
  }

  async generate(
    request: DreamGenerationRequest,
    signal: AbortSignal,
    onProgress?: DreamGenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    const response = await this.fetcher(this.endpoint, {
      method: "POST",
      headers: {
        accept: "application/x-ndjson, application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) {
      throw new DreamRouteError(`http_${response.status}`);
    }

    if (
      (response.headers.get("content-type") ?? "").includes(
        "application/x-ndjson",
      )
    ) {
      return this.readStream(response, onProgress);
    }

    let decoded: unknown;
    try {
      decoded = await response.json();
    } catch {
      throw new DreamRouteError("invalid_json");
    }
    return this.validateResult(decoded, response.headers.get("x-request-id"));
  }

  private validateResult(
    decoded: unknown,
    headerRequestId: string | null,
  ): DreamGenerationResult {
    const parsed = DreamGenerationResultSchema.safeParse(decoded);
    if (!parsed.success) throw new DreamRouteError("invalid_response");

    if (
      headerRequestId &&
      headerRequestId !== parsed.data.metadata.requestId
    ) {
      throw new DreamRouteError("request_id_mismatch");
    }
    const sanitized = sanitizeDreamSpec(parsed.data.core);
    if (!sanitized.success) throw new DreamRouteError("invalid_dream_spec");

    return {
      core: sanitized.spec,
      issues: [...parsed.data.issues, ...sanitized.issues],
      metadata: {
        ...parsed.data.metadata,
        repairCount:
          parsed.data.metadata.repairCount +
          sanitized.issues.filter(({ repaired }) => repaired).length,
      },
    };
  }

  private async readStream(
    response: Response,
    onProgress?: DreamGenerationProgressListener,
  ): Promise<DreamGenerationResult> {
    if (!response.body) throw new DreamRouteError("missing_stream");
    const headerRequestId = response.headers.get("x-request-id");
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let buffer = "";
    let totalBytes = 0;
    let finalResult: DreamGenerationResult | null = null;

    const consumeLine = (line: string): void => {
      if (!line.trim()) return;
      let decoded: unknown;
      try {
        decoded = JSON.parse(line) as unknown;
      } catch {
        throw new DreamRouteError("invalid_stream_json");
      }
      const parsed = DreamGenerationStreamFrameSchema.safeParse(decoded);
      if (!parsed.success) throw new DreamRouteError("invalid_stream_frame");
      const frame = parsed.data;
      if (frame.type === "error") throw new DreamRouteError(frame.code);
      if (frame.type === "progress") {
        onProgress?.({ phase: frame.phase });
        return;
      }
      const result = this.validateResult(frame.result, headerRequestId);
      if (frame.type === "core") {
        onProgress?.({ phase: "core-ready", result });
      } else {
        finalResult = result;
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > 2_000_000) throw new DreamRouteError("stream_too_large");
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) consumeLine(line);
      }
      buffer += decoder.decode();
      consumeLine(buffer);
    } catch (error) {
      await reader.cancel("invalid_or_cancelled_dream_stream").catch(() => undefined);
      throw error;
    } finally {
      reader.releaseLock();
    }
    if (!finalResult) throw new DreamRouteError("missing_final_result");
    return finalResult;
  }
}
