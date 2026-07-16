import { describe, expect, it, vi } from "vitest";
import { registerDreamcraftServiceWorker } from "./pwa";

describe("DreamCraft PWA registration", () => {
  it("never registers outside production", async () => {
    const register = vi.fn();

    await expect(registerDreamcraftServiceWorker({
      production: false,
      serviceWorker: { register },
    })).resolves.toEqual({ status: "skipped", reason: "non-production" });
    expect(register).not.toHaveBeenCalled();
  });

  it("skips cleanly when service workers are unavailable", async () => {
    await expect(registerDreamcraftServiceWorker({ production: true }))
      .resolves.toEqual({ status: "skipped", reason: "unsupported" });
  });

  it("registers the versioned shell worker at the root scope", async () => {
    const registration = { scope: "https://dreamcraft.test/" };
    const register = vi.fn().mockResolvedValue(registration);

    await expect(registerDreamcraftServiceWorker({
      production: true,
      serviceWorker: { register },
    })).resolves.toEqual({ status: "registered", registration });
    expect(register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("contains registration failure instead of breaking app startup", async () => {
    const error = new Error("registration blocked");
    const register = vi.fn().mockRejectedValue(error);

    await expect(registerDreamcraftServiceWorker({
      production: true,
      serviceWorker: { register },
    })).resolves.toEqual({ status: "failed", error });
  });
});
