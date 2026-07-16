import { expect, test } from "@playwright/test";
import evalCases from "../../schemas/eval-cases.json" with { type: "json" };

const G6_PROMPTS = [
  ...evalCases,
  {
    id: "mirror_garden",
    prompt: "A moonlit garden of mirrors grew new paths whenever I whispered a color to the stone fox.",
  },
  {
    id: "paper_train",
    prompt: "A paper train crossed a desert of blue lanterns while a patient crane asked me to find the final ticket.",
  },
].slice(0, 20);

test("twenty varied API-disabled prompts reach safe preflighted fragments in one page session", async ({ page }) => {
  expect(G6_PROMPTS).toHaveLength(20);
  const browserFailures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") browserFailures.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => browserFailures.push(`pageerror: ${error.message}`));

  await page.goto("/");
  for (const fixture of G6_PROMPTS) {
    const description = page.getByLabel(/what do you remember/i);
    await description.fill(fixture.prompt);
    await page.getByRole("button", { name: /^enter dream$/i }).click();
    await expect(page.getByText("Stable fragment", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /enter the fragment/i })).toBeEnabled();
    await expect(page.getByTestId("dream-canvas")).toHaveCount(0);
    await page.getByRole("button", { name: /change description/i }).click();
    await expect(description).toHaveValue(fixture.prompt);
  }

  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
  expect(browserFailures).toEqual([]);
});

test("keyboard, modal focus, comfort propagation, and audio captions remain accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const description = page.getByLabel(/what do you remember/i);
  await description.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: /vivid/i })).toBeFocused();
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await page.getByRole("button", { name: /step into the dream/i }).click();

  await expect(page.getByRole("button", { name: /step into the dream/i })).toBeHidden();
  await expect(page.getByRole("status")).toContainText("Speak with Fragment Guide");
  await page.keyboard.press("KeyE");
  const dialogue = page.getByRole("dialog", { name: "Fragment Guide" });
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toHaveAttribute("aria-describedby", "dc-dialogue-text");
  await page.keyboard.press("Tab");
  const firstResponse = dialogue.getByRole("button").first();
  await expect(firstResponse).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialogue.getByRole("button").last()).toBeFocused();
  await page.keyboard.press("Digit1");
  await expect(dialogue).toBeHidden();

  const caption = await page.evaluate(() => window.__DREAMCRAFT_TEST__?.playAudioCaption() ?? null);
  expect(caption).toMatch(/sounds/i);
  await expect(page.getByRole("status").filter({ hasText: /sounds/i })).toBeVisible();

  await page.keyboard.press("Escape");
  const pause = page.getByRole("dialog", { name: /take a breath/i });
  await expect(pause).toBeVisible();
  await expect(pause.getByRole("button", { name: /resume dream/i })).toBeFocused();
  await expect(pause.getByLabel(/reduce motion/i)).toBeChecked();
  await pause.getByRole("slider", { name: /field of view/i }).fill("88");
  await pause.getByRole("slider", { name: /mouse sensitivity/i }).fill("1.7");
  await expect.poll(() => page.evaluate(() => window.__DREAMCRAFT_TEST__?.getComfortSettings()))
    .toEqual({ fieldOfView: 88, mouseSensitivity: 1.7, reducedMotion: true });

  await pause.getByRole("button", { name: /resume dream/i }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(pause.getByRole("button", { name: /return to dream input/i })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(pause.getByRole("button", { name: /resume dream/i })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(pause).toBeHidden();

  await page.keyboard.press("Escape");
  await expect(pause).toBeVisible();
  await pause.getByRole("button", { name: /return to dream input/i }).click();
  await expect(description).toBeVisible();
});

test("WebGL context loss pauses honestly and successful restoration clears recovery state", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await page.getByRole("button", { name: /enter the fragment/i }).click();
  await page.getByRole("button", { name: /step into the dream/i }).click();

  const canvas = page.getByTestId("dream-canvas");
  await canvas.evaluate((element) => {
    element.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  });
  const recovery = page.getByRole("alert");
  await expect(recovery).toContainText("browser attempts recovery");
  await expect(recovery.getByRole("button", { name: /return to your description/i })).toBeVisible();

  await canvas.evaluate((element) => {
    element.dispatchEvent(new Event("webglcontextrestored"));
  });
  await expect(recovery).toBeHidden();
  await expect.poll(() => page.evaluate(() => window.__DREAMCRAFT_TEST__?.getMetrics()?.fps ?? 0))
    .toBeGreaterThan(0);
});
