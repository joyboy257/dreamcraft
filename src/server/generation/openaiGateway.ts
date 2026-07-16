import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";
import { z } from "zod";

import {
  DreamBlueprintSchema,
  DreamEnrichmentPatchSchema,
} from "../../dream/enrichment.js";
import { DreamSpecV1Schema } from "../../dream/schema.js";
import { buildDreamPrompt } from "./prompts.js";
import type {
  StructuredGenerationInput,
  StructuredModelGateway,
  StructuredModelOutcome,
} from "./service.js";

interface ParsedOpenAIResponse {
  status?: string | undefined;
  model?: string | undefined;
  output_parsed?: unknown;
  output?: ReadonlyArray<{
    type?: string;
    content?: ReadonlyArray<{ type?: string; refusal?: string }>;
  }>;
  incomplete_details?: { reason?: string | undefined } | null | undefined;
  usage?:
    | { input_tokens?: number | undefined; output_tokens?: number | undefined }
    | null
    | undefined;
}

export interface OpenAIParseInvocationResult {
  data: ParsedOpenAIResponse;
  requestId: string | null;
}

export type OpenAIParseInvoker = (
  body: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<OpenAIParseInvocationResult>;

type JsonSchemaNode = Record<string, unknown>;

function requireAllObjectFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(requireAllObjectFields);
  if (!value || typeof value !== "object") return value;

  const source = value as JsonSchemaNode;
  const result: JsonSchemaNode = {};
  for (const [key, child] of Object.entries(source)) {
    result[key] = requireAllObjectFields(child);
  }
  if (
    source.type === "object" &&
    source.properties &&
    typeof source.properties === "object" &&
    !Array.isArray(source.properties)
  ) {
    result.required = Object.keys(source.properties);
    result.additionalProperties = false;
  }
  return result;
}

const OUTPUT_FORMATS = {
  "single-sol": {
    name: "dream_spec_v1",
    schema: DreamSpecV1Schema,
    maxOutputTokens: 4_000,
    cacheKey: "dreamcraft:g3:single-sol:v1",
  },
  director: {
    name: "dream_blueprint_v1",
    schema: DreamBlueprintSchema,
    maxOutputTokens: 2_500,
    cacheKey: "dreamcraft:g3:director:v1",
  },
  core: {
    name: "dream_spec_v1",
    schema: DreamSpecV1Schema,
    maxOutputTokens: 4_000,
    cacheKey: "dreamcraft:g3:core:v1",
  },
  enrichment: {
    name: "dream_enrichment_v1",
    schema: DreamEnrichmentPatchSchema,
    maxOutputTokens: 2_000,
    cacheKey: "dreamcraft:g3:enrichment:v1",
  },
} as const;

const OUTPUT_SCHEMAS = Object.fromEntries(
  Object.entries(OUTPUT_FORMATS).map(([kind, format]) => [
    kind,
    requireAllObjectFields(z.toJSONSchema(format.schema, { target: "draft-7" })),
  ]),
) as Record<keyof typeof OUTPUT_FORMATS, unknown>;

function hasRefusal(response: ParsedOpenAIResponse): boolean {
  return Boolean(
    response.output?.some(
      (item) =>
        item.type === "message" &&
        item.content?.some((content) => content.type === "refusal"),
    ),
  );
}

export function buildOpenAIRequestBody(
  input: StructuredGenerationInput,
): Record<string, unknown> {
  const prompt = buildDreamPrompt(input);
  const outputFormat = OUTPUT_FORMATS[input.kind];
  return {
    model: input.model,
    instructions: prompt.instructions,
    input: [{ role: "user", content: prompt.userInput }],
    text: {
      format: {
        type: "json_schema",
        name: outputFormat.name,
        strict: true,
        schema: OUTPUT_SCHEMAS[input.kind],
      },
      verbosity: "low",
    },
    reasoning: { effort: "low" },
    max_output_tokens: outputFormat.maxOutputTokens,
    prompt_cache_key: outputFormat.cacheKey,
    store: false,
    metadata: {
      application: "dreamcraft",
      request_id: input.requestId,
    },
  };
}

function classifyOpenAIError(error: unknown): StructuredModelOutcome {
  const shape =
    error && typeof error === "object"
      ? (error as { name?: unknown; status?: unknown; code?: unknown })
      : {};
  const name = typeof shape.name === "string" ? shape.name : "";
  const status = typeof shape.status === "number" ? shape.status : null;
  const code = typeof shape.code === "string" ? shape.code : "";

  if (name === "APIConnectionTimeoutError" || name === "TimeoutError") {
    return { type: "failure", category: "timeout", retryable: true };
  }
  if (status === 401 || name === "AuthenticationError") {
    return { type: "failure", category: "authentication", retryable: false };
  }
  if (status === 429 || name === "RateLimitError") {
    return {
      type: "failure",
      category: code === "insufficient_quota" ? "quota" : "rate_limit",
      retryable: false,
    };
  }
  if (status !== null && status >= 500) {
    return { type: "failure", category: "server", retryable: true };
  }
  if (name === "APIConnectionError") {
    return { type: "failure", category: "network", retryable: true };
  }
  return { type: "failure", category: "unknown", retryable: false };
}

export class OpenAIResponsesGateway implements StructuredModelGateway {
  constructor(private readonly invoke: OpenAIParseInvoker) {}

  async generate(
    input: StructuredGenerationInput,
    signal: AbortSignal,
  ): Promise<StructuredModelOutcome> {
    const body = buildOpenAIRequestBody(input);

    let invocation: OpenAIParseInvocationResult;
    try {
      invocation = await this.invoke(body, signal);
    } catch (error) {
      const reason: unknown = signal.reason;
      if (
        signal.aborted &&
        reason instanceof DOMException &&
        reason.name === "AbortError"
      ) {
        throw reason;
      }
      if (
        signal.aborted &&
        reason instanceof DOMException &&
        reason.name === "TimeoutError"
      ) {
        return { type: "failure", category: "timeout", retryable: true };
      }
      return classifyOpenAIError(error);
    }
    const { data, requestId } = invocation;
    if (data.status === "incomplete") {
      const contentFiltered = data.incomplete_details?.reason === "content_filter";
      return {
        type: "failure",
        category: contentFiltered ? "refusal" : "incomplete",
        retryable: !contentFiltered,
      };
    }
    if (hasRefusal(data)) {
      return { type: "failure", category: "refusal", retryable: false };
    }
    if (data.output_parsed === null || data.output_parsed === undefined) {
      return { type: "failure", category: "invalid_output", retryable: false };
    }

    return {
      type: "success",
      value: data.output_parsed,
      model: data.model ?? input.model,
      ...(requestId ? { providerRequestId: requestId } : {}),
      ...(data.usage?.input_tokens !== undefined &&
      data.usage.output_tokens !== undefined
        ? {
            usage: {
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
            },
          }
        : {}),
    };
  }
}

export function createOpenAIResponsesGateway(options: {
  apiKey: string;
  timeoutMs: number;
}): OpenAIResponsesGateway {
  const client = new OpenAI({
    apiKey: options.apiKey,
    maxRetries: 0,
    timeout: options.timeoutMs,
  });
  return new OpenAIResponsesGateway(async (body, signal) => {
    const response = await client.responses
      .create(body as ResponseCreateParamsNonStreaming, { signal })
      .withResponse();
    let outputParsed: unknown;
    const outputText = response.data.output.find(
      (item) => item.type === "message",
    )?.content.find((content) => content.type === "output_text");
    if (outputText?.type === "output_text") {
      try {
        outputParsed = JSON.parse(outputText.text) as unknown;
      } catch {
        outputParsed = undefined;
      }
    }
    return {
      data: {
        status: response.data.status,
        model: response.data.model,
        output_parsed: outputParsed,
        output: response.data.output,
        incomplete_details: response.data.incomplete_details,
        usage: response.data.usage,
      },
      requestId: response.request_id,
    };
  });
}
