import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PERFORMANCE_FAILOVER_WINDOW_MS = 5_000;
const ZOOM_STRESS_DURATION_MS = PERFORMANCE_FAILOVER_WINDOW_MS + 1_500;
const ZOOM_STEP_INTERVAL_MS = 100;
const PRODUCTION_LIKE_IMMERSIVE_URL = '/?mode=immersive';
const FAILOVER_WARNING_PATTERN = /Switching to text fallback/i;

declare global {
  interface Window {
    __performanceFailoverEvents?: unknown[];
  }
}

async function installFailoverEventProbe(page: Page) {
  await page.addInitScript(() => {
    window.__performanceFailoverEvents = [];
    window.addEventListener('performancefailover', (event) => {
      window.__performanceFailoverEvents?.push(
        (event as CustomEvent<unknown>).detail ?? null
      );
    });
  });
}

async function expectImmersiveMode(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function assertNoRuntimeFailover(page: Page) {
  const failoverEvents = await page.evaluate(
    () => window.__performanceFailoverEvents ?? []
  );

  expect(failoverEvents).toEqual([]);
  await expectImmersiveMode(page);
}

async function dispatchWheelZoom(page: Page, deltaY: number) {
  await page.evaluate((nextDeltaY) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
    if (!canvas) {
      throw new Error('Expected immersive canvas before wheel zoom.');
    }
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: nextDeltaY,
      })
    );
  }, deltaY);
}

test.describe('performance failover', () => {
  test.setTimeout(120_000);

  test('keeps production-like immersive zoom above the runtime failover path', async ({
    page,
  }) => {
    const failoverWarnings: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (message.type() === 'warning' && FAILOVER_WARNING_PATTERN.test(text)) {
        failoverWarnings.push(text);
      }
    });

    await installFailoverEventProbe(page);
    await page.goto(PRODUCTION_LIKE_IMMERSIVE_URL, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await expectImmersiveMode(page);

    const startedAt = Date.now();
    let step = 0;
    while (Date.now() - startedAt < ZOOM_STRESS_DURATION_MS) {
      const zoomingIn = Date.now() - startedAt < ZOOM_STRESS_DURATION_MS / 2;
      const deltaY = zoomingIn ? -360 : 360;
      await dispatchWheelZoom(page, deltaY);
      await page.waitForTimeout(ZOOM_STEP_INTERVAL_MS);

      step += 1;
      if (step % 10 === 0) {
        await assertNoRuntimeFailover(page);
      }
    }

    expect(failoverWarnings).toEqual([]);
    await assertNoRuntimeFailover(page);
  });
});
