import { readServerGenerationConfig } from "./config";
import {
  createHealthRoute,
  resolveSafeVersionIdentifier,
} from "./healthRoute";

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
