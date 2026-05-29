import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PRODUCTION_LIKE_IMMERSIVE_URL = '/?mode=immersive';
const RUNTIME_FAILOVER_WINDOW_MS = 5_000;
const ZOOM_EXERCISE_DURATION_MS = RUNTIME_FAILOVER_WINDOW_MS + 1_500;

interface PerformanceFailoverEventLog {
  reason: string;
  context?: unknown;
}

interface FailoverTestWindow extends Window {
  __performanceFailoverEvents?: PerformanceFailoverEventLog[];
}

const getFailoverEvents = async (
  page: Page
): Promise<PerformanceFailoverEventLog[]> =>
  page.evaluate(
    () =>
      (window as FailoverTestWindow).__performanceFailoverEvents?.slice() ?? []
  );

async function installFailoverEventRecorder(page: Page) {
  await page.addInitScript(() => {
    const failoverWindow = window as FailoverTestWindow;
    failoverWindow.__performanceFailoverEvents = [];
    window.addEventListener('performancefailover', (event) => {
      const detail = (event as CustomEvent<PerformanceFailoverEventLog>).detail;
      failoverWindow.__performanceFailoverEvents?.push({
        reason: detail.reason,
        context: detail.context,
      });
    });
  });
}

async function assertImmersiveCanvas(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function wheelZoomForFailoverWindow(page: Page) {
  const deltas = [-360, -240, -180, 180, 240, 360];
  const startedAt = Date.now();
  let index = 0;

  while (Date.now() - startedAt < ZOOM_EXERCISE_DURATION_MS) {
    await page.evaluate(
      (deltaY) => {
        const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
        canvas?.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY,
          })
        );
      },
      deltas[index % deltas.length]
    );
    index += 1;
    await page.waitForTimeout(75);
  }
}

test.describe('performance failover', () => {
  test.setTimeout(90_000);

  test('keeps normal zoom immersive while runtime failover remains enabled', async ({
    page,
  }) => {
    const failoverWarnings: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (
        message.type() === 'warning' &&
        text.includes('Switching to text fallback')
      ) {
        failoverWarnings.push(text);
      }
    });
    await installFailoverEventRecorder(page);

    await page.goto(PRODUCTION_LIKE_IMMERSIVE_URL, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForFunction(
      () => document.documentElement.dataset.appMode === 'immersive',
      undefined,
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await assertImmersiveCanvas(page);

    await wheelZoomForFailoverWindow(page);
    await assertImmersiveCanvas(page);

    expect(await getFailoverEvents(page)).toEqual([]);
    expect(failoverWarnings).toEqual([]);
  });
});
