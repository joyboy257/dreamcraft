import { expect, test, type Page } from "@playwright/test";

async function enterLocalDream(page: Page): Promise<number> {
  const startedAt = Date.now();
  await page.goto("/");
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await page.getByRole("button", { name: /step into the dream/i }).click();
  const timeToPlayMs = Date.now() - startedAt;
  await expect.poll(() => page.evaluate(() => window.__DREAMCRAFT_TEST__?.getMetrics()?.queuedChunks ?? -1), {
    timeout: 15_000,
  }).toBe(0);
  await page.waitForTimeout(2_500);
  return timeToPlayMs;
}

async function restartDream(page: Page): Promise<void> {
  await page.keyboard.press("Escape");
  const pause = page.getByRole("dialog", { name: /take a breath/i });
  await pause.getByRole("button", { name: /return to dream input/i }).click();
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await page.getByRole("button", { name: /step into the dream/i }).click();
  await expect.poll(() => page.evaluate(() => window.__DREAMCRAFT_TEST__?.getMetrics()?.queuedChunks ?? -1), {
    timeout: 15_000,
  }).toBe(0);
  await page.waitForTimeout(1_000);
}

test("desktop runtime stays within the measured primary-path budgets across two restarts", async ({ page }, testInfo) => {
  const cdp = await page.context().newCDPSession(page);
  const timeToPlayMs = await enterLocalDream(page);
  const profile = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getQualityProfile() ?? null);
  const initial = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getMetrics() ?? null);
  expect(profile).toMatchObject({ tier: "balanced", maximumPixelRatio: 1.5, renderRadius: 2 });
  expect(initial).not.toBeNull();
  expect(timeToPlayMs).toBeLessThan(15_000);
  expect(initial?.timeToPlayableMs).toBeLessThan(1_000);
  expect(initial?.fps).toBeGreaterThanOrEqual(50);
  expect(initial?.frameMsP95).toBeLessThan(22);
  expect(initial?.drawCalls).toBeLessThan(100);
  expect(initial?.triangles).toBeLessThan(500_000);
  expect(initial?.loadedChunks).toBeGreaterThan(0);
  expect(initial?.loadedChunks).toBeLessThanOrEqual(25);
  expect(initial?.queuedChunks).toBe(0);
  expect(initial?.workerJobMsP95).toBeLessThan(50);

  const heapSamples: number[] = [];
  for (let restart = 0; restart < 3; restart += 1) {
    await cdp.send("HeapProfiler.collectGarbage");
    heapSamples.push((await cdp.send("Runtime.getHeapUsage")).usedSize);
    if (restart === 2) break;
    await restartDream(page);
  }

  const baselineHeap = heapSamples[0] ?? 0;
  const finalHeap = heapSamples[2] ?? Number.POSITIVE_INFINITY;
  expect(finalHeap).toBeLessThanOrEqual(baselineHeap * 1.35 + 8_000_000);
  await testInfo.attach("desktop-performance.json", {
    body: JSON.stringify({ timeToPlayMs, profile, metrics: initial, heapSamples }, null, 2),
    contentType: "application/json",
  });
});
