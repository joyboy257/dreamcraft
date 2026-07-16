import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

const DREAMS = [
  "A candy forest where every jump bounces and sugar trees sing.",
  "A flying city threaded by strong sky winds above the clouds.",
  "A flooded school nightmare where I escape a hallway shadow.",
  "A talking moon teapot guarded by a grumpy silver spoon.",
  "A memory where I find my lost dog and bring him home.",
  "My family wins the lottery and dances on a bright stage.",
] as const;

test("renders all six G4 gate dreams as distinct playable worlds", async ({ page }) => {
  // This is a six-scenario visual regression: each scenario materializes a new
  // world, enters it, and captures a canvas image. A 60s envelope gives slower
  // CI renderers ten seconds per real world without changing any assertion.
  test.setTimeout(60_000);
  const renderHashes: string[] = [];
  for (const dream of DREAMS) {
    await page.goto("/");
    await page.getByLabel("What do you remember?").fill(dream);
    await page.getByRole("button", { name: /^enter dream$/i }).click();
    await expect(page.getByRole("heading", { name: /dream.*shape|distant dream|took too long/i })).toBeVisible();
    await page.getByRole("button", { name: /enter the fragment/i }).click();
    const canvas = page.getByTestId("dream-canvas");
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: /step into the dream/i }).click();
    await expect(page.getByLabel("Current objective")).toBeVisible();
    await page.waitForTimeout(120);
    renderHashes.push(createHash("sha256").update(await canvas.screenshot()).digest("hex"));
  }

  expect(new Set(renderHashes).size).toBe(DREAMS.length);
});
