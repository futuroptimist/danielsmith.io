import { expect, test, type Page } from '@playwright/test';

import { isPdfResponse, runVisitorJourney } from '../src/app/visitorJourney';

const JOURNEY_TIMEOUT_MS = 15_000;
const TEXT_URL = '/?mode=text';
const IMMERSIVE_URL = '/?mode=immersive&disablePerformanceFailover=1';

type BrowserResponse = {
  body: number[];
  contentType: string;
  status: number;
};

async function browserFetch(
  page: Page,
  path: string,
  signal: AbortSignal
): Promise<BrowserResponse> {
  signal.throwIfAborted();
  const operation = page.evaluate(
    async ({ path, timeoutMs }) => {
      const controller = new AbortController();
      const key = '__visitorJourneyFetchController';
      (window as unknown as Record<string, AbortController>)[key] = controller;
      const timer = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(path, { signal: controller.signal });
        return {
          body: [...new Uint8Array(await response.arrayBuffer())],
          contentType: response.headers.get('content-type') ?? '',
          status: response.status,
        };
      } finally {
        window.clearTimeout(timer);
        delete (window as unknown as Record<string, AbortController>)[key];
      }
    },
    { path, timeoutMs: JOURNEY_TIMEOUT_MS }
  );
  const abort = () => {
    void page.evaluate(() => {
      const key = '__visitorJourneyFetchController';
      (window as unknown as Record<string, AbortController | undefined>)[
        key
      ]?.abort();
    });
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const response = await operation;
    signal.throwIfAborted();
    return response;
  } finally {
    signal.removeEventListener('abort', abort);
  }
}

function essentialProbes(page: Page, initializationUrl = TEXT_URL) {
  return {
    homepage_delivery: async (signal: AbortSignal) => {
      const response = await browserFetch(page, '/', signal);
      expect(response.status).toBe(200);
      expect(response.contentType).toContain('text/html');
      expect(new TextDecoder().decode(new Uint8Array(response.body))).toContain(
        '<title>danielsmith.io</title>'
      );
    },
    javascript_initialization: async (signal: AbortSignal) => {
      signal.throwIfAborted();
      const response = await page.goto(initializationUrl, {
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
    essential_assets: async (signal: AbortSignal) => {
      const entryScripts = await page
        .locator('script[type="module"]')
        .evaluateAll((elements) =>
          elements.map(
            (element) => new URL((element as HTMLScriptElement).src).pathname
          )
        );
      expect(entryScripts).toContain('/src/main.ts');
      expect(entryScripts).not.toEqual(['/@vite/client']);
      await expect(
        page.locator('link[rel="icon"][href="/favicon.ico"]')
      ).toHaveCount(1);

      const entry = await browserFetch(page, '/src/main.ts', signal);
      expect(entry.status).toBe(200);
      expect(entry.contentType).toMatch(/(?:java|type)script/);
      expect(entry.body.length).toBeGreaterThan(0);

      const favicon = await browserFetch(page, '/favicon.ico', signal);
      expect(favicon.status).toBe(200);
      expect(favicon.contentType).toMatch(/^image\//);
      expect(favicon.body.length).toBeGreaterThan(0);
    },
    accessible_fallback: async (signal: AbortSignal) => {
      signal.throwIfAborted();
      const fallback = page.locator('#app[data-mode="text"] .text-fallback');
      await expect(fallback).toBeVisible({ timeout: JOURNEY_TIMEOUT_MS });
      await expect(fallback).toHaveAttribute('role', 'main', {
        timeout: JOURNEY_TIMEOUT_MS,
      });
      await expect(fallback.locator('h1')).toBeVisible({
        timeout: JOURNEY_TIMEOUT_MS,
      });
      await expect(
        fallback.locator('a[href$="/resume.pdf"]').first()
      ).toBeVisible({
        timeout: JOURNEY_TIMEOUT_MS,
      });
      signal.throwIfAborted();
    },
    resume_pdf: async (signal: AbortSignal) => {
      const response = await browserFetch(page, '/resume.pdf', signal);
      expect(response.status).toBe(200);
      expect(
        isPdfResponse(response.contentType, new Uint8Array(response.body))
      ).toBe(true);
    },
  };
}

async function expectHealthy(page: Page) {
  for (const path of ['/healthz', '/livez']) {
    const response = await page.request.get(path, {
      timeout: JOURNEY_TIMEOUT_MS,
    });
    expect(response.status(), path).toBe(200);
    await response.dispose();
  }
}

async function run(page: Page, initializationUrl = TEXT_URL) {
  return runVisitorJourney(essentialProbes(page, initializationUrl), {
    timeoutMs: JOURNEY_TIMEOUT_MS,
  });
}

test.describe('essential visitor journey', () => {
  test('passes the application, fallback, explicit assets, and résumé', async ({
    page,
  }) => {
    await page.goto(TEXT_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await expectHealthy(page);
    await expect(run(page)).resolves.toMatchObject({
      state: 'success',
      failureStage: null,
    });
  });

  test('detects broken JavaScript initialization while health stays green', async ({
    page,
  }) => {
    await page.route('**/src/main.ts*', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'throw new Error("fixture")',
      })
    );
    await page.goto(TEXT_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await expectHealthy(page);
    await expect(run(page)).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'javascript_initialization',
    });
  });

  test('detects a missing required favicon while health stays green', async ({
    page,
  }) => {
    await page.route('**/favicon.ico', (route) =>
      route.fulfill({ status: 404, body: '' })
    );
    await page.goto(TEXT_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await expectHealthy(page);
    await expect(run(page)).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'essential_assets',
    });
  });

  for (const contentType of ['text/html', 'application/pdf']) {
    test(`detects HTML résumé content served as ${contentType}`, async ({
      page,
    }) => {
      await page.route('**/resume.pdf', (route) =>
        route.fulfill({
          status: 200,
          contentType,
          body: '<!doctype html><title>not a résumé</title>',
        })
      );
      await page.goto(TEXT_URL, { timeout: JOURNEY_TIMEOUT_MS });
      await expectHealthy(page);
      await expect(run(page)).resolves.toMatchObject({
        state: 'failure',
        failureStage: 'resume_pdf',
      });
    });
  }

  test('passes through accessible fallback when WebGL is unavailable', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === 'webgl' || type === 'webgl2') return null;
        return getContext.call(this, type, options) as never;
      } as typeof getContext;
    });
    await page.goto(IMMERSIVE_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await expectHealthy(page);
    await expect(run(page, IMMERSIVE_URL)).resolves.toMatchObject({
      state: 'success',
      failureStage: null,
    });
  });
});
