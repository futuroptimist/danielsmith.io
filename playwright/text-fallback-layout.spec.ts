import { expect, test, type Page } from '@playwright/test';

const TEXT_FALLBACK_URL = '/?mode=text';

async function waitForTextFallback(page: Page) {
  await page.goto(TEXT_FALLBACK_URL, { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('#app[data-mode="text"] .text-fallback')
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
}

async function assertTitleStartsInViewport(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const titleBounds = await page.locator('.text-fallback__title').boundingBox();

  expect(titleBounds).not.toBeNull();
  expect(titleBounds?.y ?? Number.NEGATIVE_INFINITY).toBeGreaterThanOrEqual(0);
  expect(
    (titleBounds?.y ?? 0) + (titleBounds?.height ?? 0)
  ).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0);
}

async function assertScrollableToFinalContent(page: Page) {
  const dimensions = await page.evaluate(() => {
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;

    return {
      clientHeight: scrollingElement.clientHeight,
      scrollHeight: scrollingElement.scrollHeight,
    };
  });

  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

  await page.evaluate(() => {
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTo(0, scrollingElement.scrollHeight);
  });

  await expect(page.locator('.text-fallback__poi').last()).toBeInViewport();
}

async function assertNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => {
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;

    return {
      clientWidth: scrollingElement.clientWidth,
      scrollWidth: scrollingElement.scrollWidth,
    };
  });

  expect(dimensions.scrollWidth).toBeLessThanOrEqual(
    dimensions.clientWidth + 1
  );
}

async function assertTextFallbackLayout(page: Page) {
  await assertTitleStartsInViewport(page);
  await assertScrollableToFinalContent(page);
  await assertNoHorizontalOverflow(page);
}

test.describe('text fallback layout', () => {
  test('keeps the title visible and content scrollable on desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForTextFallback(page);

    await assertTextFallbackLayout(page);
  });

  test('keeps the title visible and content scrollable on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForTextFallback(page);

    await assertTextFallbackLayout(page);
  });

  test('uses the same scrollable layout for automated-client fallback', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.locator('#app[data-mode="text"] .text-fallback')
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-fallback-reason',
      'automated-client'
    );

    await assertTextFallbackLayout(page);
  });
});
