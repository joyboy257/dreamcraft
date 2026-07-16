import { mkdir, writeFile } from "node:fs/promises";

const CONFIRMATION = "I_AUTHORIZE_LIVE_OPENAI_CALLS";
const prompts = [
  "A moonlit kitchen where teacups floated around a patient moth.",
  "A flooded school repeated forever while paper boats carried messages home.",
  "My family danced in golden rain while the city became an orchestra.",
  "A friendly whale carried a library through a violet thunderstorm.",
  "I found my childhood dog beside a glowing tree in a quiet memory forest.",
  "A tiny train crossed the rings of Saturn to deliver a forgotten birthday cake.",
  "Gravity changed direction whenever a choir of stone birds began to sing.",
  "An underwater village asked me to repair its lighthouse before sunrise.",
  "I raced a paper dragon across rooftops while the streets folded like ribbons.",
  "A shy moon lived inside a teapot and needed help finding its silver crown.",
];

if (process.env.G3_LIVE_CONFIRM !== CONFIRMATION) {
  console.error(
    `Live validation is locked. Set G3_LIVE_CONFIRM=${CONFIRMATION} only after explicit authorization.`,
  );
  process.exit(2);
}

const endpoint =
  process.env.DREAMCRAFT_LIVE_ENDPOINT ??
  "http://127.0.0.1:5173/api/dream";
const endpointUrl = new URL(endpoint);
const endpointIsLoopback = endpointUrl.hostname === "localhost"
  || endpointUrl.hostname === "127.0.0.1"
  || endpointUrl.hostname === "[::1]";
if (
  (endpointUrl.protocol !== "https:" && !(endpointUrl.protocol === "http:" && endpointIsLoopback))
  || endpointUrl.username
  || endpointUrl.password
  || endpointUrl.pathname !== "/api/dream"
  || endpointUrl.search
  || endpointUrl.hash
) {
  throw new Error("The live endpoint must be a credential-free HTTPS /api/dream URL or a loopback development URL.");
}
const endpointOrigin = endpointUrl.origin;
const evidence = [];
let inputTokens = 0;
let outputTokens = 0;

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function postWithRateLimit(body) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: endpointOrigin,
      },
      body: JSON.stringify(body),
    });
    if (response.status !== 429 || attempt === 1) return response;
    const retryAfter = Number.parseInt(
      response.headers.get("retry-after") ?? "60",
      10,
    );
    await response.body?.cancel();
    await wait((Math.min(65, Math.max(1, retryAfter)) + 1) * 1_000);
  }
  throw new Error("Rate-limit retry loop ended unexpectedly.");
}

for (const [index, dreamText] of prompts.entries()) {
  const startedAt = performance.now();
  const response = await postWithRateLimit({
      dreamText,
      intensity: index % 3 === 0 ? "fever" : index % 2 === 0 ? "vivid" : "calm",
      strategy: "single-sol",
      clientRequestId: `g3-live-${index + 1}`,
  });
  const result = await response.json();
  const valid =
    response.ok &&
    result?.metadata?.fallbackUsed === false &&
    result?.metadata?.actualStrategy === "single-sol" &&
    result?.core?.version === 1 &&
    result.core.blueprint?.semanticAnchors?.length >= 3 &&
    result.core.entities?.length >= 1 &&
    result.core.playGraph?.beats?.length >= 1 &&
    result.core.playGraph?.endings?.length >= 1;
  if (!valid) {
    throw new Error(
      `Live prompt ${index + 1} failed or used fallback (HTTP ${response.status}).`,
    );
  }
  const usage = result.metadata.usage ?? { inputTokens: 0, outputTokens: 0 };
  inputTokens += usage.inputTokens;
  outputTokens += usage.outputTokens;
  evidence.push({
    promptNumber: index + 1,
    requestId: result.metadata.requestId,
    providerRequestId: result.metadata.providerRequestId ?? null,
    durationMs: Math.round(performance.now() - startedAt),
    repairCount: result.metadata.repairCount,
    attemptCount: result.metadata.attemptCount,
    usage,
    anchors: result.core.blueprint.semanticAnchors.length,
    entities: result.core.entities.length,
    beats: result.core.playGraph.beats.length,
    endings: result.core.playGraph.endings.length,
  });
  console.info(`G3 live prompt ${index + 1}/10 passed.`);
}

const conservativeActualCostUsd =
  (inputTokens * 5 + outputTokens * 30) / 1_000_000;
const report = {
  generatedAt: new Date().toISOString(),
  endpoint,
  strategy: "single-sol",
  promptsPassed: evidence.length,
  promptsRequired: prompts.length,
  usage: { inputTokens, outputTokens },
  conservativeActualCostUsd,
  results: evidence,
};
await mkdir("artifacts/local", { recursive: true });
await writeFile(
  "artifacts/local/g3-live-proof.json",
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.info(
  `G3 live proof passed 10/10; conservative recorded cost $${conservativeActualCostUsd.toFixed(4)}.`,
);
