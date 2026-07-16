type ServerEnvironment = Readonly<Record<string, string | undefined>>;

export interface HealthRouteOptions {
  generationEnabled: boolean;
  version: string;
}

export interface HealthResponse {
  status: "ok" | "method_not_allowed";
  generationEnabled: boolean;
  fallbackAvailable: true;
  version: string;
}

const SAFE_VERSION = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const SAFE_COMMIT = /^[a-fA-F0-9]{7,64}$/;

export function resolveSafeVersionIdentifier(
  environment: ServerEnvironment,
): string {
  const commit = environment.VERCEL_GIT_COMMIT_SHA?.trim() ?? "";
  if (SAFE_COMMIT.test(commit)) return commit.slice(0, 12).toLowerCase();

  const packageVersion = environment.npm_package_version?.trim() ?? "";
  if (SAFE_VERSION.test(packageVersion)) return packageVersion;
  return "development";
}

function healthResponse(
  body: HealthResponse,
  status: number,
  extraHeaders: Readonly<Record<string, string>> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

export function createHealthRoute(
  options: HealthRouteOptions,
): (request: Request) => Response {
  const version = SAFE_VERSION.test(options.version)
    ? options.version
    : "development";
  const createBody = (
    status: HealthResponse["status"],
  ): HealthResponse => ({
    status,
    generationEnabled: options.generationEnabled,
    fallbackAvailable: true,
    version,
  });

  return (request): Response => {
    if (request.method !== "GET") {
      return healthResponse(createBody("method_not_allowed"), 405, {
        allow: "GET",
      });
    }
    return healthResponse(createBody("ok"), 200);
  };
}
