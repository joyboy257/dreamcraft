import { describe, expect, it } from "vitest";

import { readServerGenerationConfig } from "./config";
import vercelConfig from "../../vercel.json";

describe("readServerGenerationConfig", () => {
  it("keeps live OpenAI calls disabled by default even when a key exists", () => {
    const config = readServerGenerationConfig({
      OPENAI_API_KEY: "test-sentinel-never-send",
    });

    expect(config.liveEnabled).toBe(false);
    expect(config.hasApiKey).toBe(true);
    expect(config.models).toEqual({
      sol: "gpt-5.6-sol",
      terra: "gpt-5.6-terra",
      luna: "gpt-5.6-luna",
    });
  });

  it("requires both the exact opt-in flag and a non-empty server key", () => {
    expect(
      readServerGenerationConfig({
        DREAMCRAFT_OPENAI_ENABLED: "true",
      }).liveEnabled,
    ).toBe(false);
    expect(
      readServerGenerationConfig({
        DREAMCRAFT_OPENAI_ENABLED: "TRUE",
        OPENAI_API_KEY: "sentinel",
      }).liveEnabled,
    ).toBe(false);
    expect(
      readServerGenerationConfig({
        DREAMCRAFT_OPENAI_ENABLED: "true",
        OPENAI_API_KEY: "sentinel",
      }).liveEnabled,
    ).toBe(true);
  });

  it("clamps public inputs and refuses arbitrary model identifiers", () => {
    const config = readServerGenerationConfig({
      DREAMCRAFT_REQUEST_TIMEOUT_MS: "999999",
      DREAMCRAFT_MAX_DREAM_CHARS: "1",
      DREAMCRAFT_MAX_BODY_BYTES: "999999",
      OPENAI_RUNTIME_MODEL: "attacker-model",
      OPENAI_CORE_MODEL: "gpt-5.6-terra",
      OPENAI_ENRICHMENT_MODEL: "https://attacker.test/model",
    });

    expect(config).toMatchObject({
      timeoutMs: 20_000,
      maximumDreamCharacters: 64,
      maximumBodyBytes: 16_384,
      models: {
        sol: "gpt-5.6-sol",
        terra: "gpt-5.6-terra",
        luna: "gpt-5.6-luna",
      },
    });
  });

  it("keeps platform cancellation enabled with fallback headroom beyond the app deadline", () => {
    const maximumAppDeadline = readServerGenerationConfig({
      DREAMCRAFT_REQUEST_TIMEOUT_MS: "999999",
    }).timeoutMs;
    const functionConfig = vercelConfig.functions["api/dream.ts"];

    expect(functionConfig.supportsCancellation).toBe(true);
    expect(functionConfig.maxDuration * 1_000 - maximumAppDeadline).toBeGreaterThanOrEqual(
      5_000,
    );
  });
});
