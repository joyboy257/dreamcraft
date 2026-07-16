import { describe, expect, it } from "vitest";

import { createDreamHandler } from "./createDreamHandler";

describe("createDreamHandler safety gate", () => {
  it("never invokes OpenAI when a key exists but the explicit live flag is absent", async () => {
    const handler = createDreamHandler({
      OPENAI_API_KEY: "sentinel-key-that-must-never-leave-the-process",
      DREAMCRAFT_REQUEST_TIMEOUT_MS: "2000",
    });
    const response = await handler(
      new Request("http://dreamcraft.test/api/dream", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://dreamcraft.test",
        },
        body: JSON.stringify({
          dreamText: "A silent library grew wings above a field of lanterns.",
          intensity: "vivid",
          strategy: "single-sol",
          clientRequestId: "browser-id-is-replaced",
        }),
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain('"fallbackReason":"api_disabled"');
    expect(body).not.toContain("sentinel-key-that-must-never-leave-the-process");
  });
});
