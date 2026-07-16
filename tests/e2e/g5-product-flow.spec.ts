import { expect, test } from "@playwright/test";

test("materialization can be cancelled, retried, and preserves the description", async ({ page }) => {
  const rememberedDream = "A moonlit library floated over an ocean of quiet bells.";
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    let delayNextDreamRequest = true;
    window.fetch = (input, init) => {
      const rawUrl = input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl, window.location.href);
      if (url.pathname !== "/api/dream" || !delayNextDreamRequest) {
        return nativeFetch(input, init);
      }
      delayNextDreamRequest = false;
      return new Promise<Response>((_resolve, reject) => {
        const abort = (): void => reject(new DOMException("Cancelled", "AbortError"));
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener("abort", abort, { once: true });
      });
    };
  });
  await page.goto("/");
  const description = page.getByLabel(/what do you remember/i);
  await description.fill(rememberedDream);
  await page.getByRole("button", { name: /^enter dream$/i }).click();
  await expect(page.getByRole("button", { name: /^cancel and return/i })).toBeVisible();
  await page.getByRole("button", { name: /^cancel and return/i }).click();
  await expect(description).toHaveValue(rememberedDream);

  await description.press("Control+Enter");
  await expect(page.getByRole("button", { name: /enter the fragment/i })).toBeVisible();
  await page.getByRole("button", { name: /try this dream again/i }).click();
  await expect(page.getByRole("button", { name: /enter the fragment/i })).toBeVisible();
});
