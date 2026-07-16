import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  normalizeBaseUrl,
  parseDeploymentBaseUrl,
  runDeployedSmoke,
} from "./smoke-deployed.mjs";

const fallbackCore = {
  version: 1,
  id: "smoke-fragment",
  blueprint: { semanticAnchors: [{}, {}, {}] },
  entities: [{}],
  playGraph: { beats: [{}], endings: [{}] },
};

const pageSecurityHeaders = {
  "content-security-policy": "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
};

function jsonResponse(body, headers = {}) {
  return Response.json(body, {
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

describe("deployed smoke validator", () => {
  it("checks the shell, safe health contract, and two identical disabled fallbacks", async () => {
    const responses = [
      new Response('<main id="root"></main>', {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...pageSecurityHeaders,
        },
      }),
      jsonResponse({
        status: "ok",
        generationEnabled: false,
        fallbackAvailable: true,
        version: "abc123def456",
      }),
      jsonResponse({
        core: fallbackCore,
        metadata: {
          fallbackUsed: true,
          fallbackReason: "api_disabled",
          actualStrategy: "mock-local",
        },
      }),
      jsonResponse({
        core: structuredClone(fallbackCore),
        metadata: {
          fallbackUsed: true,
          fallbackReason: "api_disabled",
          actualStrategy: "mock-local",
        },
      }),
    ];
    const calls = [];
    const fetchImpl = async (...args) => {
      calls.push(args);
      return responses.shift();
    };

    await runDeployedSmoke("https://preview.dreamcraft.test/", { fetchImpl });

    assert.equal(calls.length, 4);
    assert.deepEqual(calls.map(([url]) => new URL(url).pathname), [
      "/",
      "/api/health",
      "/api/dream",
      "/api/dream",
    ]);
    const dreamBodies = calls.slice(2).map(([, init]) => init.body);
    assert.equal(dreamBodies[0], dreamBodies[1]);
    assert.deepEqual(
      calls.slice(2).map(([, init]) => init.headers.origin),
      ["https://preview.dreamcraft.test", "https://preview.dreamcraft.test"],
    );
    assert.ok(calls.every(([, init]) => init.redirect === "error"));
  });

  it("stops before generation when health reports live generation enabled", async () => {
    const responses = [
      new Response('<main id="root"></main>', {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...pageSecurityHeaders,
        },
      }),
      jsonResponse({
        status: "ok",
        generationEnabled: true,
        fallbackAvailable: true,
        version: "0.1.0",
      }),
    ];
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return responses.shift();
    };

    await assert.rejects(runDeployedSmoke("https://preview.dreamcraft.test", {
      fetchImpl,
    }), /Live generation must be disabled/);
    assert.equal(calls, 2);
  });

  it("requires a credential-free deployment origin", () => {
    assert.equal(normalizeBaseUrl("https://dreamcraft.test/"), "https://dreamcraft.test");
    assert.equal(normalizeBaseUrl("http://127.0.0.1:4173"), "http://127.0.0.1:4173");
    assert.throws(
      () => normalizeBaseUrl("https://user:pass@dreamcraft.test"),
      /must not contain credentials/,
    );
    assert.throws(
      () => normalizeBaseUrl("https://dreamcraft.test/api"),
      /only the deployment origin/,
    );
    assert.throws(
      () => normalizeBaseUrl("http://preview.dreamcraft.test"),
      /must use HTTPS/,
    );
  });

  it("accepts pnpm's standalone argument separator and rejects ambiguous CLI input", () => {
    assert.equal(
      parseDeploymentBaseUrl(["--", "https://preview.dreamcraft.test/"]),
      "https://preview.dreamcraft.test",
    );
    assert.equal(
      parseDeploymentBaseUrl(["https://preview.dreamcraft.test/"]),
      "https://preview.dreamcraft.test",
    );
    assert.throws(
      () => parseDeploymentBaseUrl([]),
      /exactly one deployment base URL/,
    );
    assert.throws(
      () => parseDeploymentBaseUrl(["--"]),
      /exactly one deployment base URL/,
    );
    assert.throws(
      () => parseDeploymentBaseUrl(["https://one.test", "https://two.test"]),
      /exactly one deployment base URL/,
    );
    assert.throws(
      () => parseDeploymentBaseUrl(["--", "not a url"]),
      /deployment base URL is invalid/,
    );
  });

  it("fails closed without leaking fetch errors or accepting permissive API CORS", async () => {
    await assert.rejects(
      runDeployedSmoke("https://preview.dreamcraft.test", {
        fetchImpl: async () => {
          throw new Error("secret-token-that-must-not-escape");
        },
      }),
      (error) => {
        assert.equal(error.message, "Homepage request failed.");
        assert.doesNotMatch(error.message, /secret-token/);
        return true;
      },
    );

    const responses = [
      new Response('<main id="root"></main>', {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...pageSecurityHeaders,
        },
      }),
      jsonResponse({
        status: "ok",
        generationEnabled: false,
        fallbackAvailable: true,
        version: "0.1.0",
      }, {
        "access-control-allow-origin": "*",
      }),
    ];
    let calls = 0;
    await assert.rejects(
      runDeployedSmoke("https://preview.dreamcraft.test", {
        fetchImpl: async () => {
          calls += 1;
          return responses.shift();
        },
      }),
      /must not allow cross-origin reads/,
    );
    assert.equal(calls, 2);
  });
});
