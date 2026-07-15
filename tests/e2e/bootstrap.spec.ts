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
  await expect(page.getByTestId("dream-canvas")).toBeVisible();
  await page.getByRole("button", { name: /step into the dream/i }).click();
  await expect(page.getByText("Meet the Dream Guide")).toBeVisible();
  await expect(page.getByText("Speak with the Lantern Keeper")).toBeVisible();

  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "The Lantern Keeper" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /follow the light/i }).click();
  await expect(page.getByText("Awaken the Moonwell", { exact: true })).toBeVisible();
  await expect(page.getByText("Awaken the moonwell beacon")).toBeVisible();

  await page.keyboard.press("KeyE");
  await expect(
    page.getByRole("heading", { name: "The Dream Remembers" }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /describe a dream/i }),
  ).toBeVisible();
  await expect(page.getByTestId("dream-canvas")).toHaveCount(0);
  expect(browserFailures).toEqual([]);
});
