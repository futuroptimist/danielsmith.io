import { expect, test } from '@playwright/test';

import { isPdfResponse } from '../src/observability/visitorJourney';

test.describe('essential visitor journey', () => {
  test('delivers the homepage, initializes JavaScript, and keeps fallback usable', async ({
    page,
    request,
  }) => {
    const homepage = await request.get('/');
    expect(homepage.status()).toBe(200);
    const homepageHtml = await homepage.text();
    expect(homepageHtml).toContain('<title>danielsmith.io</title>');

    const modulePath = homepageHtml.match(/<script[^>]+src="([^"]+)"/)?.[1];
    expect(modulePath, 'homepage module script').toBeTruthy();
    for (const assetPath of ['/favicon.ico', modulePath!]) {
      const asset = await request.get(assetPath);
      expect(asset.status(), assetPath).toBe(200);
      expect((await asset.body()).byteLength, assetPath).toBeGreaterThan(0);
    }

    await page.goto('/?mode=text', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(page.locator('.text-fallback')).toBeVisible();
    await expect(page.locator('.text-fallback h1')).toBeVisible();
    await expect(page.locator('[data-action="resume"]')).toHaveAttribute(
      'href',
      /resume\.pdf$/
    );
  });

  test('retrieves a genuine résumé PDF rather than an HTML fallback', async ({
    request,
  }) => {
    const response = await request.get('/resume.pdf');
    expect(response.status()).toBe(200);
    expect(
      isPdfResponse(
        response.headers()['content-type'] ?? null,
        await response.body()
      )
    ).toBe(true);
  });
});
