import { expect, test } from "@playwright/test";

test("mobile controls move, look, and interact with the real dream runtime", async ({ page }) => {
  const browserFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserFailures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserFailures.push(`pageerror: ${error.message}`));

  await page.goto("/");
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await expect(page.getByRole("button", { name: /enter the fragment/i })).toBeVisible();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await expect(page.getByTestId("dream-canvas")).toBeVisible();
  await page.getByRole("button", { name: /step into the dream/i }).click();

  await expect(page.getByRole("group", { name: "Touch game controls" })).toBeVisible();
  await expect(page.getByText(/rotate to landscape/i)).toBeVisible();

  const viewBefore = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getViewRotation());
  expect(viewBefore).toBeTruthy();
  await page.locator(".dc-look-zone").dispatchEvent("pointerdown", {
    pointerId: 7,
    pointerType: "touch",
    clientX: 300,
    clientY: 350,
  });
  await page.locator(".dc-look-zone").dispatchEvent("pointermove", {
    pointerId: 7,
    pointerType: "touch",
    clientX: 350,
    clientY: 325,
  });
  await page.locator(".dc-look-zone").dispatchEvent("pointerup", {
    pointerId: 7,
    pointerType: "touch",
    clientX: 350,
    clientY: 325,
  });
  const viewAfter = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getViewRotation());
  expect(viewAfter?.yaw).not.toBe(viewBefore?.yaw);
  expect(viewAfter?.pitch).not.toBe(viewBefore?.pitch);

  // Return the camera toward the guide before exercising the shared interaction path.
  await page.locator(".dc-look-zone").dispatchEvent("pointerdown", {
    pointerId: 8,
    pointerType: "touch",
    clientX: 350,
    clientY: 325,
  });
  await page.locator(".dc-look-zone").dispatchEvent("pointermove", {
    pointerId: 8,
    pointerType: "touch",
    clientX: 300,
    clientY: 350,
  });
  await page.locator(".dc-look-zone").dispatchEvent("pointerup", {
    pointerId: 8,
    pointerType: "touch",
    clientX: 300,
    clientY: 350,
  });

  await page.getByRole("button", { name: "Interact" }).click();
  await expect(page.getByRole("heading", { name: "Fragment Guide" })).toBeVisible();
  await page.getByRole("button", { name: /follow the dream/i }).click();
  await expect(page.getByRole("group", { name: "Touch game controls" })).toBeVisible();

  const positionBefore = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getPlayerPosition());
  expect(positionBefore).toBeTruthy();
  const forward = page.getByRole("button", { name: "Move forward" });
  await forward.dispatchEvent("pointerdown", { pointerId: 9, pointerType: "touch" });
  await page.waitForTimeout(650);
  await forward.dispatchEvent("pointerup", { pointerId: 9, pointerType: "touch" });
  const positionAfter = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getPlayerPosition());
  expect(positionAfter).toBeTruthy();
  expect(Math.hypot(
    (positionAfter?.x ?? 0) - (positionBefore?.x ?? 0),
    (positionAfter?.z ?? 0) - (positionBefore?.z ?? 0),
  )).toBeGreaterThan(0.25);

  expect(browserFailures).toEqual([]);
});
