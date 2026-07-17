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
  await expect(page.getByTestId("entry-scrim")).toHaveCount(0);

  await expect(page.getByRole("group", { name: "Touch game controls" })).toBeVisible();
  await expect(page.getByText(/rotate to landscape/i)).toBeVisible();
  // The controls are usable only after the engine has resolved the guide target.
  // This is a semantic readiness signal, not a timing delay.
  await expect(page.getByText("Speak with Fragment Guide")).toBeVisible();

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

  const interact = page.getByRole("button", { name: "Interact" });
  // Assert the real hit target before interacting. This catches stacking/input
  // regressions without bypassing them with a forced click.
  await expect.poll(() => interact.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    return document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    ) === button;
  })).toBe(true);
  // The shipped control responds on pointerdown for immediate touch feedback.
  // It may open the dialogue and unmount before a synthetic click finishes, so
  // exercise that real handler rather than forcing Playwright to click a removed
  // element. The elementFromPoint assertion above still proves the hit layer.
  await interact.dispatchEvent("pointerdown", { pointerId: 10, pointerType: "touch" });
  await expect(page.getByRole("heading", { name: "Fragment Guide" })).toBeVisible();
  await page.getByRole("button", { name: /tell me more/i }).click();
  await page.getByRole("button", { name: /tell me more/i }).click();
  await page.getByRole("button", { name: /carry this with me/i }).click();
  await expect(page.getByRole("group", { name: "Touch game controls" })).toBeVisible();

  const positionBefore = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getPlayerPosition());
  expect(positionBefore).toBeTruthy();
  const joystick = page.getByRole("slider", { name: "Move joystick" });
  const bounds = await joystick.boundingBox();
  expect(bounds).toBeTruthy();
  await joystick.dispatchEvent("pointerdown", { pointerId: 9, pointerType: "touch", clientX: bounds!.x + bounds!.width / 2, clientY: bounds!.y + bounds!.height / 2 });
  await joystick.dispatchEvent("pointermove", { pointerId: 9, pointerType: "touch", clientX: bounds!.x + bounds!.width / 2, clientY: bounds!.y + 4 });
  await page.waitForTimeout(650);
  await joystick.dispatchEvent("pointerup", { pointerId: 9, pointerType: "touch", clientX: bounds!.x + bounds!.width / 2, clientY: bounds!.y + 4 });
  const positionAfter = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.getPlayerPosition());
  expect(positionAfter).toBeTruthy();
  expect(Math.hypot(
    (positionAfter?.x ?? 0) - (positionBefore?.x ?? 0),
    (positionAfter?.z ?? 0) - (positionBefore?.z ?? 0),
  )).toBeGreaterThan(0.25);

  expect(browserFailures).toEqual([]);
});
