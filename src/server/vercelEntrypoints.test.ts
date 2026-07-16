import { describe, expect, it } from "vitest";

import { POST } from "../../api/dream";
import { GET } from "../../api/health";

describe("Vercel Web Handler entrypoints", () => {
  it("exports the documented named GET web handler for health checks", () => {
    const response = GET(new Request("https://dreamcraft.test/api/health"));

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
  });

  it("exports the documented named POST web handler without invoking generation on a wrong method", async () => {
    const response = await POST(new Request("https://dreamcraft.test/api/dream", {
      method: "GET",
      headers: { origin: "https://dreamcraft.test" },
    }));

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
});
