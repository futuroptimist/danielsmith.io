import { expect, test, type Page } from '@playwright/test';

const TEXT_FALLBACK_URL = '/?mode=text';
const FALLBACK_READY_SELECTOR = '#app[data-mode="text"] .text-fallback';
const OVERFLOW_TOLERANCE_PX = 1;

async function waitForTextFallback(page: Page) {
  await page.goto(TEXT_FALLBACK_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(page.locator(FALLBACK_READY_SELECTOR)).toBeVisible();
}

async function assertTopCopyVisible(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));

  const topCopyBounds = await page.evaluate(() => {
    const title = document.querySelector('.text-fallback__title');
    const description = document.querySelector('.text-fallback__description');

    if (!title || !description) {
      throw new Error('Missing text fallback title or description.');
    }

    const titleRect = title.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();

    return {
      descriptionBottom: descriptionRect.bottom,
      descriptionTop: descriptionRect.top,
      titleBottom: titleRect.bottom,
      titleTop: titleRect.top,
      viewportHeight: window.innerHeight,
    };
  });

  expect(topCopyBounds.titleTop).toBeGreaterThanOrEqual(0);
  expect(topCopyBounds.titleBottom).toBeLessThanOrEqual(
    topCopyBounds.viewportHeight
  );
  expect(topCopyBounds.descriptionTop).toBeGreaterThanOrEqual(0);
  expect(topCopyBounds.descriptionBottom).toBeLessThanOrEqual(
    topCopyBounds.viewportHeight
  );
}

async function assertPageScrollsToFinalContent(page: Page) {
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

  const finalPoiBounds = await page.evaluate(() => {
    const finalPoi = Array.from(
      document.querySelectorAll('.text-fallback__poi')
    ).at(-1);

    if (!finalPoi) {
      throw new Error('Missing final text fallback POI.');
    }

    const rect = finalPoi.getBoundingClientRect();

    return {
      bottom: rect.bottom,
      top: rect.top,
      viewportHeight: window.innerHeight,
    };
  });

  expect(finalPoiBounds.top).toBeLessThan(finalPoiBounds.viewportHeight);
  expect(finalPoiBounds.bottom).toBeGreaterThan(0);
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(
    overflow.clientWidth + OVERFLOW_TOLERANCE_PX
  );
}

async function assertScrollableFallbackLayout(page: Page) {
  await assertTopCopyVisible(page);
  await assertPageScrollsToFinalContent(page);
  await assertNoHorizontalOverflow(page);
}

test.describe('text fallback layout', () => {
  test('keeps the desktop fallback top-aligned, scrollable, and horizontally contained', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForTextFallback(page);

    await assertScrollableFallbackLayout(page);
  });

  test('keeps the mobile fallback top-aligned, scrollable, and horizontally contained', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await waitForTextFallback(page);

    await assertScrollableFallbackLayout(page);
  });

  test('uses the same scrollable layout for automated-client runtime fallback', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem('danielsmith.io:mode-preference');
        window.sessionStorage.removeItem('danielsmith.io:mode-preference');
      } catch {
        // Ignore inaccessible storage in hardened browser contexts.
      }

      try {
        Object.defineProperty(Navigator.prototype, 'webdriver', {
          configurable: true,
          get: () => true,
        });
      } catch {
        // Ignore browser contexts that do not allow webdriver overrides.
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute(
      'data-fallback-reason',
      'automated-client'
    );
    await expect(page.locator(FALLBACK_READY_SELECTOR)).toBeVisible();

    await assertScrollableFallbackLayout(page);
  });
});
