import { expect, test, type Page } from '@playwright/test';

const TEXT_FALLBACK_URL = '/?mode=text';

async function expectScrollableTextFallback(page: Page) {
  await page.goto(TEXT_FALLBACK_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#app[data-mode="text"] .text-fallback');

  await page.evaluate(() => window.scrollTo(0, 0));

  const titleRect = await page.locator('.text-fallback__title').boundingBox();
  expect(titleRect).not.toBeNull();
  expect(titleRect?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((titleRect?.y ?? 0) + (titleRect?.height ?? 0)).toBeLessThanOrEqual(
    page.viewportSize()?.height ?? 0
  );

  const initialMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(initialMetrics.scrollHeight).toBeGreaterThan(
    initialMetrics.clientHeight
  );
  expect(initialMetrics.scrollWidth).toBeLessThanOrEqual(
    initialMetrics.clientWidth + 1
  );

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );

  const finalPoi = page.locator('.text-fallback__poi').last();
  await expect(finalPoi).toBeVisible();

  const bottomMetrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(bottomMetrics.scrollWidth).toBeLessThanOrEqual(
    bottomMetrics.clientWidth + 1
  );
}

test.describe('text fallback layout', () => {
  test('keeps the title visible and scrolls through the final exhibit on desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    await expectScrollableTextFallback(page);
  });

  test('keeps the title visible and avoids horizontal overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await expectScrollableTextFallback(page);
  });
});
