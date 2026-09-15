import { expect, test, type Page } from '@playwright/test';

import {
  isPdfResponse,
  runVisitorJourney,
  type VisitorJourneyChecks,
} from '../src/observability/visitorJourney';

const JOURNEY_TIMEOUT_MS = 15_000;

async function expectAccessibleFallback(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(
    page.locator('#app[data-mode="text"] .text-fallback')
  ).toBeVisible();
  await expect(page.locator('[data-action="resume"]')).toHaveAttribute(
    'href',
    /resume\.pdf$/
  );
  await expect(page.locator('[data-action="github"]')).toBeVisible();
}

test('asserts the essential application-owned visitor journey', async ({
  page,
}) => {
  let homepageDelivered = false;
  let javascriptInitialized = false;

  const checks: VisitorJourneyChecks = {
    homepage_delivery: async () => {
      const response = await page.request.get('/');
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(await response.text()).toContain('<title>danielsmith.io</title>');
      homepageDelivered = true;
    },
    javascript_initialization: async () => {
      const response = await page.goto('/?mode=text', {
        waitUntil: 'domcontentloaded',
      });
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).not.toHaveAttribute(
        'data-app-loading',
        ''
      );
      await expect(page.locator('html')).toHaveAttribute(
        'data-app-mode',
        'fallback'
      );
      javascriptInitialized = true;
    },
    essential_assets: async () => {
      const response = await page.request.get('/favicon.ico');
      expect(response.status()).toBe(200);
      expect((await response.body()).byteLength).toBeGreaterThan(0);
    },
    accessible_fallback: async () => {
      await expectAccessibleFallback(page);
    },
    resume_pdf: async () => {
      const response = await page.request.get('/resume.pdf');
      expect(response.status()).toBe(200);
      expect(
        isPdfResponse(response.headers()['content-type'], await response.body())
      ).toBe(true);
    },
  };

  const result = await runVisitorJourney(checks, {
    timeoutMs: JOURNEY_TIMEOUT_MS,
  });

  expect(homepageDelivered).toBe(true);
  expect(javascriptInitialized).toBe(true);
  expect(result).toMatchObject({
    state: 'success',
    freshness: 'fresh',
    failureStage: null,
  });
  expect(result.durationMs).toBeGreaterThanOrEqual(0);
});

test('keeps optional immersive rendering outside the essential result', async ({
  page,
}) => {
  await page.goto('/?mode=text', { waitUntil: 'domcontentloaded' });
  await expectAccessibleFallback(page);

  // Renderer qualification has its own suites; fallback usability is the essential contract.
  await expect(page.locator('#app canvas')).toHaveCount(0);
});
