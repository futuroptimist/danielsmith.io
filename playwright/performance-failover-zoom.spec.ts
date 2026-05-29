import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PRODUCTION_LIKE_IMMERSIVE_URL = '/?mode=immersive';
const LOW_FPS_WINDOW_MS = 5_000;
const ZOOM_STRESS_DURATION_MS = LOW_FPS_WINDOW_MS + 1_500;
const ZOOM_STEP_DELAY_MS = 100;

interface PerformanceFailoverProbe {
  eventCount: number;
  events: Array<unknown>;
}

declare global {
  interface Window {
    __performanceFailoverProbe?: PerformanceFailoverProbe;
  }
}

async function installPerformanceFailoverProbe(page: Page) {
  const switchingWarnings: string[] = [];

  await page.addInitScript(() => {
    window.__performanceFailoverProbe = {
      eventCount: 0,
      events: [],
    };
    window.addEventListener('performancefailover', (event) => {
      const customEvent = event as CustomEvent<unknown>;
      window.__performanceFailoverProbe?.events.push(customEvent.detail);
      if (window.__performanceFailoverProbe) {
        window.__performanceFailoverProbe.eventCount += 1;
      }
    });
  });

  page.on('console', (message) => {
    if (
      message.type() === 'warning' &&
      message.text().includes('Switching to text fallback')
    ) {
      switchingWarnings.push(message.text());
    }
  });

  return {
    async expectNoFailover() {
      const probe = await page.evaluate(
        () => window.__performanceFailoverProbe
      );
      expect(probe?.eventCount ?? 0).toBe(0);
      expect(probe?.events ?? []).toEqual([]);
      expect(switchingWarnings).toEqual([]);
    },
  };
}

async function waitForProductionLikeImmersive(page: Page) {
  await page.goto(PRODUCTION_LIKE_IMMERSIVE_URL, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await assertImmersiveCanvasOnly(page);
}

async function getModeState(page: Page) {
  return page.evaluate(() => ({
    htmlMode: document.documentElement.dataset.appMode ?? null,
    appMode: document.querySelector('#app')?.getAttribute('data-mode') ?? null,
    canvasCount: document.querySelectorAll('#app canvas').length,
  }));
}

async function assertImmersiveCanvasOnly(page: Page) {
  const state = await getModeState(page);
  expect(state.htmlMode).toBe('immersive');
  expect(state.htmlMode).not.toBe('fallback');
  expect(state.appMode).not.toBe('text');
  expect(state.canvasCount).toBe(1);
}

async function wheelZoomForLongerThanFailoverWindow(page: Page) {
  await page.locator('#app canvas').hover();
  const deadline = Date.now() + ZOOM_STRESS_DURATION_MS;
  let direction = -1;

  while (Date.now() < deadline) {
    await page.mouse.wheel(0, direction * 420);
    direction *= -1;
    await page.waitForTimeout(ZOOM_STEP_DELAY_MS);
    await assertImmersiveCanvasOnly(page);
  }
}

test.describe('performance failover runtime zoom coverage', () => {
  test.setTimeout(90_000);

  test('keeps normal production-like zoom immersive while runtime failover is enabled', async ({
    page,
  }) => {
    const failoverProbe = await installPerformanceFailoverProbe(page);

    await waitForProductionLikeImmersive(page);
    await wheelZoomForLongerThanFailoverWindow(page);

    await failoverProbe.expectNoFailover();
    await assertImmersiveCanvasOnly(page);
  });
});
