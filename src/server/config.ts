import type { GenerationStrategy } from "../dream/provider";
import type { GenerationModels } from "./generation/service";

type ServerEnvironment = Readonly<Record<string, string | undefined>>;

const ALLOWED_MODELS = new Set([
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
]);

const DEFAULT_MODELS: GenerationModels = {
  sol: "gpt-5.6-sol",
  terra: "gpt-5.6-terra",
  luna: "gpt-5.6-luna",
};

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function modelOrDefault(value: string | undefined, fallback: string): string {
  return value && ALLOWED_MODELS.has(value) ? value : fallback;
}

function strategyOrDefault(value: string | undefined): GenerationStrategy {
  if (value === "mock-local" || value === "director-parallel") return value;
  return "single-sol";
}

export interface ServerGenerationConfig {
  liveEnabled: boolean;
  hasApiKey: boolean;
  apiKey?: string;
  directorEnabled: boolean;
  defaultStrategy: GenerationStrategy;
  timeoutMs: number;
  maximumDreamCharacters: number;
  maximumBodyBytes: number;
  models: GenerationModels;
}

export function readServerGenerationConfig(
  environment: ServerEnvironment = process.env,
): ServerGenerationConfig {
  const apiKey = environment.OPENAI_API_KEY?.trim() ?? "";
  const hasApiKey = apiKey.length > 0;
  return {
    liveEnabled:
      environment.DREAMCRAFT_OPENAI_ENABLED === "true" && hasApiKey,
    hasApiKey,
    ...(hasApiKey ? { apiKey } : {}),
    directorEnabled:
      environment.DREAMCRAFT_ENABLE_DIRECTOR_PIPELINE === "true",
    defaultStrategy: strategyOrDefault(
      environment.DREAMCRAFT_GENERATION_STRATEGY,
    ),
    timeoutMs: boundedInteger(
      environment.DREAMCRAFT_REQUEST_TIMEOUT_MS,
      12_000,
      2_000,
      20_000,
    ),
    maximumDreamCharacters: boundedInteger(
      environment.DREAMCRAFT_MAX_DREAM_CHARS,
      1_200,
      64,
      1_200,
    ),
    maximumBodyBytes: boundedInteger(
      environment.DREAMCRAFT_MAX_BODY_BYTES,
      8_192,
      1_024,
      16_384,
    ),
    models: {
      sol: modelOrDefault(
        environment.OPENAI_RUNTIME_MODEL,
        DEFAULT_MODELS.sol,
      ),
      terra: modelOrDefault(
        environment.OPENAI_CORE_MODEL,
        DEFAULT_MODELS.terra,
      ),
      luna: modelOrDefault(
        environment.OPENAI_ENRICHMENT_MODEL,
        DEFAULT_MODELS.luna,
      ),
    },
  };
}
