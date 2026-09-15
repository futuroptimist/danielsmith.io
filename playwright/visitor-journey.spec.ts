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
        homepage_delivery: async (signal) => {
          signal.throwIfAborted();
          const response = await request.get('/', {
            timeout: JOURNEY_TIMEOUT_MS,
          });
          signal.throwIfAborted();
          expect(response.status()).toBe(200);
          expect(response.headers()['content-type']).toContain('text/html');
          expect(await response.text()).toContain(
            '<title>danielsmith.io</title>'
          );
        },
        javascript_initialization: async (signal) => {
          signal.throwIfAborted();
          const response = await page.goto('/?mode=text', {
            waitUntil: 'domcontentloaded',
            timeout: JOURNEY_TIMEOUT_MS,
          });
          signal.throwIfAborted();
          expect(response?.status()).toBe(200);
          await expect(page.locator('html')).toHaveAttribute(
            'data-app-mode',
            'fallback',
            { timeout: JOURNEY_TIMEOUT_MS }
          );
        },
        essential_assets: async (signal) => {
          signal.throwIfAborted();
          const assetUrls = await page
            .locator('script[type="module"], link[rel="icon"]')
            .evaluateAll((elements) =>
              elements.map((element) =>
                element instanceof HTMLScriptElement
                  ? element.src
                  : (element as HTMLLinkElement).href
              )
            );
          const assetPaths = assetUrls.map(
            (assetUrl) => new URL(assetUrl).pathname
          );
          expect(assetPaths).toContain('/src/main.ts');
          expect(assetPaths).toContain('/favicon.ico');

          for (const assetPath of ['/src/main.ts', '/favicon.ico']) {
            signal.throwIfAborted();
            const response = await request.get(assetPath, {
              timeout: JOURNEY_TIMEOUT_MS,
            });
            signal.throwIfAborted();
            expect(response.status(), assetPath).toBe(200);
            expect(
              (await response.body()).byteLength,
              assetPath
            ).toBeGreaterThan(0);
          }
        },
        accessible_fallback: async (signal) => {
          signal.throwIfAborted();
          const fallback = page.locator(
            '#app[data-mode="text"] .text-fallback'
          );
          await expect(fallback).toBeVisible({ timeout: JOURNEY_TIMEOUT_MS });
          await expect(fallback).toHaveAttribute('role', 'main', {
            timeout: JOURNEY_TIMEOUT_MS,
          });
          await expect(fallback.locator('h1')).toBeVisible({
            timeout: JOURNEY_TIMEOUT_MS,
          });
          await expect(
            fallback.locator('a[href$="/resume.pdf"]').first()
          ).toBeVisible({ timeout: JOURNEY_TIMEOUT_MS });
          signal.throwIfAborted();
        },
        resume_pdf: async (signal) => {
          signal.throwIfAborted();
          const response = await request.get('/resume.pdf', {
            timeout: JOURNEY_TIMEOUT_MS,
          });
          signal.throwIfAborted();
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
