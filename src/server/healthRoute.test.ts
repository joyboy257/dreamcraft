import { describe, expect, it } from "vitest";

import { createHealthHandler } from "./createHealthHandler";
import {
  createHealthRoute,
  resolveSafeVersionIdentifier,
} from "./healthRoute";

const EXPECTED_KEYS = [
  "fallbackAvailable",
  "generationEnabled",
  "status",
  "version",
];

describe("DreamCraft health route", () => {
  it("returns only the safe health shape with no caching or permissive CORS", async () => {
    const route = createHealthRoute({
      generationEnabled: false,
      version: "abc123def456",
    });
    const response = route(new Request("https://dreamcraft.test/api/health", {
      headers: { origin: "https://hostile.example" },
    }));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(Object.keys(body).sort()).toEqual(EXPECTED_KEYS);
    expect(body).toEqual({
      status: "ok",
      generationEnabled: false,
      fallbackAvailable: true,
      version: "abc123def456",
    });
  });

  it("rejects non-GET requests without expanding the response shape", async () => {
    const route = createHealthRoute({
      generationEnabled: false,
      version: "0.1.0",
    });
    const response = route(new Request("https://dreamcraft.test/api/health", {
      method: "POST",
    }));
    const body = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(Object.keys(body).sort()).toEqual(EXPECTED_KEYS);
    expect(body.status).toBe("method_not_allowed");
  });

  it.each([
    [{}, false],
    [{ DREAMCRAFT_OPENAI_ENABLED: "true" }, false],
    [{ OPENAI_API_KEY: "present-but-disabled" }, false],
    [{
      DREAMCRAFT_OPENAI_ENABLED: "true",
      OPENAI_API_KEY: "present-and-enabled",
    }, true],
  ] as const)(
    "reports the effective generation state for config %#",
    async (environment, expected) => {
      const handler = createHealthHandler(environment);
      const response = handler(new Request("https://dreamcraft.test/api/health"));
      const body = (await response.json()) as Record<string, unknown>;

      expect(body.generationEnabled).toBe(expected);
      expect(body).not.toHaveProperty("hasApiKey");
      expect(body).not.toHaveProperty("apiKey");
    },
  );

  it("publishes only a sanitized revision or package version", () => {
    expect(resolveSafeVersionIdentifier({
      VERCEL_GIT_COMMIT_SHA: "ABCDEF1234567890",
      npm_package_version: "0.1.0",
    })).toBe("abcdef123456");
    expect(resolveSafeVersionIdentifier({
      VERCEL_GIT_COMMIT_SHA: "branch/name with spaces",
      npm_package_version: "0.1.0",
    })).toBe("0.1.0");
    expect(resolveSafeVersionIdentifier({
      VERCEL_GIT_COMMIT_SHA: "not-safe",
      npm_package_version: "../../private",
    })).toBe("development");
  });
});
