import { pathToFileURL } from "node:url";

const DREAM_REQUEST = Object.freeze({
  dreamText: "A moonlit garden folded into a quiet library while a paper fox waited by a blue lantern.",
  intensity: "vivid",
  strategy: "single-sol",
  clientRequestId: "deployed-smoke",
});

const HEALTH_KEYS = [
  "fallbackAvailable",
  "generationEnabled",
  "status",
  "version",
];

class SmokeFailure extends Error {}

function assert(condition, message) {
  if (!condition) throw new SmokeFailure(message);
}

function hasNoStore(response) {
  return (response.headers.get("cache-control") ?? "")
    .toLowerCase()
    .split(",")
    .some((directive) => directive.trim() === "no-store");
}

function assertSafeResponseHeaders(response, label) {
  assert(hasNoStore(response), `${label} must disable caching.`);
  assert(
    response.headers.get("x-content-type-options") === "nosniff",
    `${label} must prevent MIME sniffing.`,
  );
  assert(
    response.headers.get("access-control-allow-origin") === null,
    `${label} must not allow cross-origin reads.`,
  );
}

async function readJson(response, label) {
  assert(
    (response.headers.get("content-type") ?? "").includes("application/json"),
    `${label} must return JSON.`,
  );
  try {
    return await response.json();
  } catch {
    throw new SmokeFailure(`${label} returned invalid JSON.`);
  }
}

export function normalizeBaseUrl(value) {
  assert(typeof value === "string" && value.length > 0, "Provide an explicit deployment base URL.");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new SmokeFailure("The deployment base URL is invalid.");
  }
  const isLoopback = parsed.hostname === "localhost"
    || parsed.hostname === "127.0.0.1"
    || parsed.hostname === "[::1]";
  assert(
    parsed.protocol === "https:" || (parsed.protocol === "http:" && isLoopback),
    "The deployment base URL must use HTTPS unless it is loopback development.",
  );
  assert(!parsed.username && !parsed.password, "The deployment base URL must not contain credentials.");
  assert((parsed.pathname === "/" || parsed.pathname === "") && !parsed.search && !parsed.hash, "Provide only the deployment origin as the base URL.");
  return parsed.origin;
}

async function safeFetch(fetchImpl, url, init, timeoutMs, label) {
  try {
    return await fetchImpl(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new SmokeFailure(`${label} request failed.`);
  }
}

function assertPageSecurityHeaders(response, secureTransport) {
  const policy = response.headers.get("content-security-policy") ?? "";
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
  ]) {
    assert(policy.includes(directive), `Homepage CSP must include ${directive}.`);
  }
  assert(!policy.includes("'unsafe-eval'"), "Homepage CSP must not allow unsafe evaluation.");
  assert(response.headers.get("x-content-type-options") === "nosniff", "Homepage must prevent MIME sniffing.");
  assert(response.headers.get("x-frame-options") === "DENY", "Homepage must deny framing.");
  assert(response.headers.get("referrer-policy") === "no-referrer", "Homepage must suppress referrer data.");
  if (secureTransport) {
    assert(
      (response.headers.get("strict-transport-security") ?? "").includes("max-age="),
      "HTTPS deployment must publish HSTS.",
    );
  }
}

function assertPlayableFallback(body) {
  assert(body && typeof body === "object", "Dream fallback response must be an object.");
  assert(body.metadata?.fallbackUsed === true, "Dream generation must use the local fallback.");
  assert(body.metadata?.fallbackReason === "api_disabled", "Dream fallback must be caused by the API kill switch.");
  assert(body.metadata?.actualStrategy === "mock-local", "Dream fallback must use the deterministic local strategy.");
  assert(body.core?.version === 1, "Dream fallback must return DreamSpec v1.");
  assert(body.core?.blueprint?.semanticAnchors?.length >= 3, "Dream fallback must include at least three semantic anchors.");
  assert(body.core?.entities?.length >= 1, "Dream fallback must include a readable entity.");
  assert(body.core?.playGraph?.beats?.length >= 1, "Dream fallback must include a playable beat.");
  assert(body.core?.playGraph?.endings?.length >= 1, "Dream fallback must include an ending.");
}

export async function runDeployedSmoke(
  rawBaseUrl,
  { fetchImpl = globalThis.fetch, timeoutMs = 15_000 } = {},
) {
  const baseUrl = normalizeBaseUrl(rawBaseUrl);
  assert(typeof fetchImpl === "function", "A fetch implementation is required.");
  assert(Number.isFinite(timeoutMs) && timeoutMs >= 1_000 && timeoutMs <= 60_000, "Smoke timeout must be between 1 and 60 seconds.");

  const home = await safeFetch(fetchImpl, `${baseUrl}/`, {}, timeoutMs, "Homepage");
  assert(home.ok, "Homepage must return a successful response.");
  assert((home.headers.get("content-type") ?? "").includes("text/html"), "Homepage must return HTML.");
  assertPageSecurityHeaders(home, baseUrl.startsWith("https://"));
  const homeBody = await home.text();
  assert(homeBody.includes('id="root"'), "Homepage must contain the DreamCraft application root.");

  const health = await safeFetch(fetchImpl, `${baseUrl}/api/health`, {}, timeoutMs, "Health");
  assert(health.ok, "Health must return a successful response.");
  assertSafeResponseHeaders(health, "Health");
  const healthBody = await readJson(health, "Health");
  assert(healthBody && typeof healthBody === "object", "Health must return an object.");
  assert(JSON.stringify(Object.keys(healthBody).sort()) === JSON.stringify(HEALTH_KEYS), "Health returned an unsafe or incomplete shape.");
  assert(healthBody.status === "ok", "Health status must be ok.");
  assert(healthBody.generationEnabled === false, "Live generation must be disabled before fallback smoke testing.");
  assert(healthBody.fallbackAvailable === true, "The deterministic fallback must be available.");
  assert(typeof healthBody.version === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(healthBody.version), "Health version must be a safe identifier.");

  const dreamResults = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const dream = await safeFetch(fetchImpl, `${baseUrl}/api/dream`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        origin: baseUrl,
      },
      body: JSON.stringify(DREAM_REQUEST),
    }, timeoutMs, "Dream fallback");
    assert(dream.ok, "Dream fallback must return a successful response.");
    assertSafeResponseHeaders(dream, "Dream fallback");
    const body = await readJson(dream, "Dream fallback");
    assertPlayableFallback(body);
    dreamResults.push(body);
  }
  assert(
    JSON.stringify(dreamResults[0].core) === JSON.stringify(dreamResults[1].core),
    "Repeated fallback requests must produce the same deterministic DreamSpec.",
  );
}

const isMain = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMain) {
  runDeployedSmoke(process.argv[2])
    .then(() => console.info("DreamCraft generation-disabled deployed smoke passed."))
    .catch((error) => {
      const message = error instanceof SmokeFailure
        ? error.message
        : "Unexpected deployed smoke failure.";
      console.error(`DreamCraft deployed smoke failed: ${message}`);
      process.exitCode = 1;
    });
}
