import { expect, test } from '@playwright/test';

import { isPdfResponse, runVisitorJourney } from '../src/app/visitorJourney';

const JOURNEY_TIMEOUT_MS = 15_000;

test.describe('essential visitor journey', () => {
  test('delivers the application, accessible fallback, assets, and résumé', async ({
    page,
    request,
  }) => {
    const result = await runVisitorJourney(
      {
        homepage_delivery: async () => {
          const response = await request.get('/');
          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toContain('text/html');
          expect(await response.text()).toContain(
            '<title>danielsmith.io</title>'
          );
        },
        javascript_initialization: async () => {
          const response = await page.goto('/?mode=text', {
            waitUntil: 'domcontentloaded',
          });
          expect(response?.status()).toBe(200);
          await expect(page.locator('html')).toHaveAttribute(
            'data-app-mode',
            'fallback'
          );
        },
        essential_assets: async () => {
          const assetUrls = await page
            .locator('script[type="module"], link[rel="icon"]')
            .evaluateAll((elements) =>
              elements.map((element) =>
                element instanceof HTMLScriptElement
                  ? element.src
                  : (element as HTMLLinkElement).href
              )
            );
          expect(assetUrls.length).toBeGreaterThanOrEqual(2);

          for (const assetUrl of assetUrls) {
            const response = await request.get(assetUrl);
            expect(response.status(), assetUrl).toBe(200);
            expect(
              (await response.body()).byteLength,
              assetUrl
            ).toBeGreaterThan(0);
          }
        },
        accessible_fallback: async () => {
          const fallback = page.locator(
            '#app[data-mode="text"] .text-fallback'
          );
          await expect(fallback).toBeVisible();
          await expect(fallback).toHaveAttribute('role', 'main');
          await expect(fallback.locator('h1')).toBeVisible();
          await expect(
            fallback.locator('a[href$="/resume.pdf"]').first()
          ).toBeVisible();
        },
        resume_pdf: async () => {
          const response = await request.get('/resume.pdf');
          expect(response.status()).toBe(200);
          expect(
            isPdfResponse(
              response.headers()['content-type'],
              await response.body()
            )
          ).toBe(true);
        },
      },
      { timeoutMs: JOURNEY_TIMEOUT_MS }
    );

    expect(
      result.state,
      `visitor journey failed at ${result.failureStage}`
    ).toBe('success');
  });
});
