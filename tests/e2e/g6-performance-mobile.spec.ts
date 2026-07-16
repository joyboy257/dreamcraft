import { expect, test } from "@playwright/test";

test("reduced profile preserves structural budgets and attests hardware frame evidence", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await page.getByRole("button", { name: /step into the dream/i }).click();
  await expect(page.getByTestId("entry-scrim")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.__DREAMCRAFT_TEST__?.getMetrics()?.queuedChunks ?? -1), {
    timeout: 15_000,
  }).toBe(0);
  await page.waitForTimeout(2_500);

  const profile = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getQualityProfile() ?? null);
  const metrics = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getMetrics() ?? null);
  const renderer = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getRendererDiagnostics() ?? null);
  expect(profile).toEqual({
    tier: "reduced",
    maximumPixelRatio: 1.25,
    renderRadius: 2,
    antialias: false,
  });
  expect(metrics).not.toBeNull();
  expect(renderer).not.toBeNull();
  expect(renderer?.classification).not.toBe("unknown");
  const hardwarePerformanceRequired = process.env.DREAMCRAFT_REQUIRE_HARDWARE_PERFORMANCE === "true";
  if (hardwarePerformanceRequired) expect(renderer?.classification).toBe("hardware");
  if (renderer?.classification === "hardware") {
    // A physical device/browser must meet the mobile frame contract directly.
    expect(metrics?.fps).toBeGreaterThanOrEqual(30);
    expect(metrics?.frameMsP95).toBeLessThan(34);
  } else {
    // Software CI still verifies that the reduced profile produces real frames;
    // it is not presented as a physical mobile-frame-rate measurement.
    expect(metrics?.fps).toBeGreaterThan(0);
    expect(metrics?.frameMsP50).toBeGreaterThan(0);
  }
  expect(metrics?.drawCalls).toBeLessThan(100);
  expect(metrics?.triangles).toBeLessThan(500_000);
  expect(metrics?.loadedChunks).toBeLessThanOrEqual(25);
  expect(metrics?.queuedChunks).toBe(0);
  expect(metrics?.particles).toBeLessThanOrEqual(120);
  expect(metrics?.workerJobMsP95).toBeLessThan(50);
  await testInfo.attach("mobile-performance.json", {
    body: JSON.stringify({
      profile,
      renderer,
      hardwarePerformanceAttested: renderer?.classification === "hardware",
      hardwarePerformanceRequired,
      metrics,
    }, null, 2),
    contentType: "application/json",
  });
});
