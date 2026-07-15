import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./publicEnv";

describe("public environment boundary", () => {
  it("uses safe local defaults", () => {
    expect(parsePublicEnv({})).toEqual({ apiBase: "/api", debug: false });
  });

  it("normalizes an explicit API base and boolean flag", () => {
    expect(
      parsePublicEnv({
        VITE_DREAMCRAFT_API_BASE: " https://example.test/dream/ ",
        VITE_DREAMCRAFT_DEBUG: "true",
      }),
    ).toEqual({ apiBase: "https://example.test/dream", debug: true });
  });

  it("rejects secret-like values that would enter the client bundle", () => {
    expect(() =>
      parsePublicEnv({ VITE_OPENAI_API_KEY: "not-a-real-secret" }),
    ).toThrow(/unsafe client environment variable/i);
  });

  it("rejects ambiguous boolean configuration", () => {
    expect(() =>
      parsePublicEnv({ VITE_DREAMCRAFT_DEBUG: "yes" }),
    ).toThrow(/true.*false/i);
  });
});
