import { expect, test, type Page } from '@playwright/test';

const TEXT_FALLBACK_URL = '/?mode=text';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

async function waitForTextFallback(page: Page) {
  await page.goto(TEXT_FALLBACK_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(
    page.locator('#app[data-mode="text"] .text-fallback')
  ).toBeVisible();
}

async function assertIntroStartsInsideViewport(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const viewportHeight = page.viewportSize()?.height ?? 0;
  for (const selector of [
    '.text-fallback__title',
    '.text-fallback__description',
  ]) {
    const box = await page.locator(selector).boundingBox();
    expect(box).not.toBeNull();
    expect(box?.y).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
      viewportHeight
    );
  }
}

async function assertDocumentScrollsToFinalFallbackContent(page: Page) {
  const scrollMetrics = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight
  );

  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  );
  const finalPoi = page.locator('.text-fallback__poi').last();
  await expect(finalPoi).toBeInViewport();
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflowMetrics = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflowMetrics.scrollWidth).toBeLessThanOrEqual(
    overflowMetrics.clientWidth + 1
  );
}

test.describe('text fallback layout', () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name} starts at the title and scrolls through all content`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await waitForTextFallback(page);

      await assertIntroStartsInsideViewport(page);
      await assertDocumentScrollsToFinalFallbackContent(page);
      await assertNoHorizontalOverflow(page);
    });
  }
});
