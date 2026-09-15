import { expect, test, type Page } from '@playwright/test';

import { isPdfResponse, runVisitorJourney } from '../src/app/visitorJourney';

const JOURNEY_TIMEOUT_MS = 15_000;
const INITIALIZATION_TIMEOUT_MS = 5_000;
const TEXT_URL = '/?mode=text';
const RENDERER_FAILURE_URL = '/?mode=immersive';

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
  let cancellation: Promise<void> | undefined;
  const abort = () => {
    cancellation = page
      .evaluate(() => {
        const key = '__visitorJourneyFetchController';
        (window as unknown as Record<string, AbortController | undefined>)[
          key
        ]?.abort();
      })
      .then(() => undefined)
      .catch(() => undefined);
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const response = await operation;
    signal.throwIfAborted();
    return response;
  } finally {
    signal.removeEventListener('abort', abort);
    await cancellation;
  }
}

function createPageLifecycle(page: Page) {
  let cleanup: Promise<void> | undefined;
  return {
    own(signal: AbortSignal) {
      const close = () => {
        cleanup ??= page.close().catch(() => undefined);
      };
      signal.addEventListener('abort', close, { once: true });
      return () => signal.removeEventListener('abort', close);
    },
    async settle() {
      await cleanup;
    },
  };
}

function essentialProbes(
  page: Page,
  lifecycle: ReturnType<typeof createPageLifecycle>,
  initializationUrl = TEXT_URL
) {
  const owned =
    (probe: (signal: AbortSignal) => Promise<void>) =>
    async (signal: AbortSignal) => {
      const release = lifecycle.own(signal);
      try {
        await probe(signal);
      } finally {
        release();
      }
    };

  return {
    homepage_delivery: owned(async (signal: AbortSignal) => {
      const response = await browserFetch(page, '/', signal);
      expect(response.status).toBe(200);
      expect(response.contentType).toContain('text/html');
      expect(new TextDecoder().decode(new Uint8Array(response.body))).toContain(
        '<title>danielsmith.io</title>'
      );
    }),
    javascript_initialization: owned(async (signal: AbortSignal) => {
      signal.throwIfAborted();
      const response = await page.goto(initializationUrl, {
        waitUntil: 'domcontentloaded',
        timeout: INITIALIZATION_TIMEOUT_MS,
      });
      signal.throwIfAborted();
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute(
        'data-app-mode',
        'fallback',
        { timeout: INITIALIZATION_TIMEOUT_MS }
      );
    }),
    essential_assets: owned(async (signal: AbortSignal) => {
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

      const favicon = await browserFetch(
        page,
        '/favicon.ico?visitor-journey=1',
        signal
      );
      expect(favicon.status).toBe(200);
      expect(favicon.contentType).toMatch(/^image\//);
      expect(favicon.body.length).toBeGreaterThan(0);
    }),
    accessible_fallback: owned(async (signal: AbortSignal) => {
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
    }),
    resume_pdf: owned(async (signal: AbortSignal) => {
      const response = await browserFetch(page, '/resume.pdf', signal);
      expect(response.status).toBe(200);
      expect(
        isPdfResponse(response.contentType, new Uint8Array(response.body))
      ).toBe(true);
    }),
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

async function run(
  page: Page,
  initializationUrl = TEXT_URL,
  options: { signal?: AbortSignal; timeoutMs?: number } = {}
) {
  const lifecycle = createPageLifecycle(page);
  try {
    return await runVisitorJourney(
      essentialProbes(page, lifecycle, initializationUrl),
      {
        timeoutMs: options.timeoutMs ?? JOURNEY_TIMEOUT_MS,
        signal: options.signal,
      }
    );
  } finally {
    await lifecycle.settle();
  }
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
    await page.route('**/favicon.ico*', (route) =>
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
        if (['webgl', 'webgl2', 'experimental-webgl'].includes(type)) {
          return null;
        }
        return getContext.call(this, type, options) as never;
      } as typeof getContext;
    });
    await page.goto(RENDERER_FAILURE_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await expectHealthy(page);
    await expect(run(page, RENDERER_FAILURE_URL)).resolves.toMatchObject({
      state: 'success',
      failureStage: null,
    });
  });

  test('cancels a pending browser operation at the aggregate deadline', async ({
    page,
  }) => {
    await page.goto(TEXT_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await page.route('**/', () => new Promise(() => undefined));

    await expect(run(page, TEXT_URL, { timeoutMs: 50 })).resolves.toMatchObject(
      {
        state: 'failure',
        failureStage: 'timeout',
      }
    );
    expect(page.isClosed()).toBe(true);
  });

  test('settles cleanup when a producer interrupts a browser operation', async ({
    page,
  }) => {
    await page.goto(TEXT_URL, { timeout: JOURNEY_TIMEOUT_MS });
    await page.route('**/', () => new Promise(() => undefined));
    const controller = new AbortController();
    const result = run(page, TEXT_URL, { signal: controller.signal });

    controller.abort();

    await expect(result).resolves.toMatchObject({
      state: 'failure',
      failureStage: 'producer_interrupted',
    });
    expect(page.isClosed()).toBe(true);
  });
});
