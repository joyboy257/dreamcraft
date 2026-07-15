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
  await expect(page.getByTestId("dream-canvas")).toBeVisible();
  await expect(page.getByText("Local voxel shell ready")).toBeVisible();

  await page.getByRole("button", { name: /stabilize local preview/i }).click();
  await expect(page.getByText("Deterministic fragment stabilized")).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: /describe a dream/i }),
  ).toBeVisible();
  await expect(page.getByTestId("dream-canvas")).toBeVisible();
  expect(browserFailures).toEqual([]);
});
