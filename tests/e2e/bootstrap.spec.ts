import { expect, test } from "@playwright/test";

test("boots the deterministic local shell without an API key", async ({ page }) => {
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
  await expect(
    page.getByRole("heading", { name: /describe a dream/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await expect(
    page.getByRole("heading", { name: /dream.*shape|distant dream|took too long/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await expect(page.getByTestId("dream-canvas")).toBeVisible();
  await page.getByRole("button", { name: /step into the dream/i }).click();
  await expect(page.getByText("Meet Fragment Guide")).toBeVisible();
  await expect(page.getByText("Speak with Fragment Guide")).toBeVisible();

  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "Fragment Guide" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /follow the dream/i }).click();
  await expect(
    page.getByLabel("Current objective").getByText("Awaken the Fragment", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").getByText("Awaken the Fragment", { exact: true }),
  ).toBeVisible();

  await page.keyboard.press("KeyE");
  await expect(page.getByText("The dream changes shape around your choice.")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The Fragment Holds" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /describe a dream/i }),
  ).toBeVisible();
  await expect(page.getByTestId("dream-canvas")).toHaveCount(0);
  expect(browserFailures).toEqual([]);
});
