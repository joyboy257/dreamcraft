import { readServerGenerationConfig } from "./config.js";
import {
  createHealthRoute,
  resolveSafeVersionIdentifier,
} from "./healthRoute.js";

type ServerEnvironment = Readonly<Record<string, string | undefined>>;

export function createHealthHandler(
  environment: ServerEnvironment = process.env,
): (request: Request) => Response {
  const config = readServerGenerationConfig(environment);
  return createHealthRoute({
    generationEnabled: config.liveEnabled,
    version: resolveSafeVersionIdentifier(environment),
  });
}
