import { expect, test, type Page } from "@playwright/test";

async function completeCurrentDream(page: Page): Promise<void> {
  await page.getByRole("button", { name: /step into the dream/i }).click();
  // Input becomes available only once the opening scrim has relinquished the canvas.
  await expect(page.getByTestId("entry-scrim")).toHaveCount(0);
  await expect(page.getByText("Meet Fragment Guide")).toBeVisible();
  await expect(page.getByText("Speak with Fragment Guide")).toBeVisible();

  await page.keyboard.press("KeyE");
  await expect(page.getByRole("heading", { name: "Fragment Guide" })).toBeVisible();
  await page.getByRole("button", { name: /tell me more/i }).click();
  await page.getByRole("button", { name: /tell me more/i }).click();
  await page.getByRole("button", { name: /carry this with me/i }).click();
  await expect(
    page.getByLabel("Current objective").getByText("Awaken the Fragment", { exact: true }),
  ).toBeVisible();
  // Objective updates are announced independently of the transient aim prompt.
  await expect(page.getByLabel("Current objective")).toHaveAttribute("role", "status");
  await expect(page.getByLabel("Current objective")).toHaveAttribute("aria-live", "polite");

  // The staging camera presents the guide first. Align through the engine's
  // real look/target path before asserting the next physical interaction.
  expect(await page.evaluate(() => window.__DREAMCRAFT_TEST__?.focusActiveInteraction() ?? false))
    .toBe(true);
  await expect(page.locator(".dc-interaction-prompt")).toContainText("Awaken the Fragment", {
    timeout: 5_000,
  });
  await page.keyboard.press("KeyE");
  await expect(page.getByText("The dream changes shape around your choice.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Fragment Holds" })).toBeVisible();
}

test("boots the deterministic local shell without an API key", async ({ page }) => {
  // The test intentionally completes three full worlds. Keep its envelope scoped
  // to this end-to-end journey so slow CI rendering cannot truncate a valid flow.
  test.setTimeout(60_000);
  const browserFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserFailures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    browserFailures.push(`pageerror: ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    browserFailures.push(
      `requestfailed: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserFailures.push(`response: ${response.status()} ${response.url()}`);
    }
  });

  await page.goto("/");
  const rememberedDream = await page.getByLabel(/what do you remember/i).inputValue();
  await expect(
    page.getByRole("heading", { name: /describe a dream/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await expect(
    page.getByRole("heading", { name: /dream.*shape|distant dream|took too long/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await expect(page.getByTestId("dream-canvas")).toBeVisible();
  await completeCurrentDream(page);

  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.getByRole("button", { name: /step into the dream/i })).toBeVisible();
  await completeCurrentDream(page);

  await page.getByRole("button", { name: /remix this dream/i }).click();
  await expect(page.getByRole("heading", { name: /describe a dream/i })).toBeVisible();
  await expect(page.getByLabel(/what do you remember/i)).toHaveValue(rememberedDream);

  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await completeCurrentDream(page);
  await page.getByRole("button", { name: /remember another/i }).click();
  await expect(page.getByLabel(/what do you remember/i)).toHaveValue("");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /describe a dream/i }),
  ).toBeVisible();
  await expect(page.getByTestId("dream-canvas")).toHaveCount(0);
  expect(browserFailures).toEqual([]);
});

test("launches every featured template through the DreamLibrary showcase runtime", async ({ page }) => {
  test.setTimeout(45_000);

  for (const showcase of [
    { label: "Tiny wonder", title: "The Moonlit Kitchen", objective: "Meet Luna Moth" },
    { label: "Lost messages", title: "Flooded School Escape", objective: "Meet Childhood Dog" },
    { label: "Golden celebration", title: "The Lottery Family Finale", objective: "Meet The Family Band" },
  ]) {
    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(showcase.label, "i") }).click();
    await expect(page.getByTestId("dream-canvas")).toBeVisible();
    await expect(page.getByText("DreamLibrary showcase", { exact: true })).toBeVisible();
    await expect(page.getByText(showcase.title, { exact: true })).toBeVisible();
    await expect(page.getByLabel("Current objective")).toContainText(showcase.objective);
    await expect(page.getByTestId("entry-scrim")).toBeVisible();
  }
});
