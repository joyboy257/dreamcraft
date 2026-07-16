import { randomUUID } from "node:crypto";

import { readServerGenerationConfig } from "./config.js";
import { createDreamRoute } from "./dreamRoute.js";
import { createOpenAIResponsesGateway } from "./generation/openaiGateway.js";
import {
  DreamGenerationService,
  type StructuredModelGateway,
} from "./generation/service.js";
import { InMemoryRateLimitHook } from "./rateLimit.js";

type ServerEnvironment = Readonly<Record<string, string | undefined>>;

const unavailableGateway: StructuredModelGateway = {
  generate: () => Promise.resolve({
    type: "failure",
    category: "api_disabled",
    retryable: false,
  }),
};

export function createDreamHandler(
  environment: ServerEnvironment = process.env,
): (request: Request) => Promise<Response> {
  const config = readServerGenerationConfig(environment);
  const gateway =
    config.liveEnabled && config.apiKey
      ? createOpenAIResponsesGateway({
          apiKey: config.apiKey,
          timeoutMs: config.timeoutMs,
        })
      : unavailableGateway;
  const service = new DreamGenerationService({
    gateway,
    liveEnabled: config.liveEnabled,
    models: config.models,
    timeoutMs: config.timeoutMs,
    directorEnabled: config.directorEnabled,
  });
  const limiter = new InMemoryRateLimitHook();
  return createDreamRoute({
    service,
    maximumBodyBytes: config.maximumBodyBytes,
    maximumDreamCharacters: config.maximumDreamCharacters,
    createRequestId: randomUUID,
    rateLimit: (request) => limiter.check(request),
    ...(environment.DREAMCRAFT_ENABLE_DEBUG_METRICS === "true"
      ? { log: (event: object) => console.info("dreamcraft_generation", event) }
      : {}),
  });
}
