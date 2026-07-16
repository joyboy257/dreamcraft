import { expect, test } from "@playwright/test";

test("production shell installs and reloads while offline", async ({ context, page }) => {
  const browserFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserFailures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserFailures.push(`pageerror: ${error.message}`));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /describe a dream/i })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
      });
    }
  });

  const manifest = await page.evaluate(async () => {
    const response = await fetch("/manifest.webmanifest");
    return response.json() as Promise<{ name?: string; display?: string; icons?: unknown[] }>;
  });
  expect(manifest).toMatchObject({ name: "DreamCraft", display: "standalone" });
  expect(manifest.icons?.length).toBeGreaterThanOrEqual(2);
  const cachedPaths = await page.evaluate(async () => {
    const requests = (await Promise.all(
      (await caches.keys()).map(async (cacheName) => (await caches.open(cacheName)).keys()),
    )).flat();
    return requests.map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths).toContain("/");
  expect(cachedPaths.some((path) => /^\/assets\/index-.*\.js$/.test(path))).toBe(true);
  expect(cachedPaths.some((path) => /^\/assets\/index-.*\.css$/.test(path))).toBe(true);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /describe a dream/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^enter dream$/i })).toBeEnabled();
  expect(browserFailures).toEqual([]);
});
