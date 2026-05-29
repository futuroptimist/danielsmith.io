import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PRODUCTION_LIKE_IMMERSIVE_URL = '/?mode=immersive';
const ZOOM_STRESS_DURATION_MS = 6_500;
const ZOOM_STEP_DELAY_MS = 100;

interface FailoverEventRecord {
  reason: string;
}

interface PerformanceFailoverWindow extends Window {
  __performanceFailoverEvents?: FailoverEventRecord[];
}

async function installFailoverListener(page: Page) {
  await page.addInitScript(() => {
    const portfolioWindow = window as PerformanceFailoverWindow;
    portfolioWindow.__performanceFailoverEvents = [];
    window.addEventListener('performancefailover', (event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      portfolioWindow.__performanceFailoverEvents?.push({
        reason: detail?.reason ?? 'unknown',
      });
    });
  });
}

async function readFailoverEvents(page: Page): Promise<FailoverEventRecord[]> {
  return page.evaluate(
    () =>
      (window as PerformanceFailoverWindow).__performanceFailoverEvents ?? []
  );
}

async function waitForImmersive(page: Page) {
  await page.goto(PRODUCTION_LIKE_IMMERSIVE_URL, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function dispatchWheelZoom(page: Page, deltaY: number) {
  await page.evaluate((nextDeltaY) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
    canvas?.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: nextDeltaY,
      })
    );
  }, deltaY);
}

test.describe('performance failover zoom regression', () => {
  test.setTimeout(90_000);

  test('keeps production-like immersive zoom active without text fallback', async ({
    page,
  }) => {
    const fallbackWarnings: string[] = [];
    page.on('console', (message) => {
      if (message.text().includes('Switching to text fallback')) {
        fallbackWarnings.push(message.text());
      }
    });

    await installFailoverListener(page);
    await waitForImmersive(page);

    const startedAt = Date.now();
    let step = 0;
    while (Date.now() - startedAt < ZOOM_STRESS_DURATION_MS) {
      const zoomingIn = step % 12 < 6;
      await dispatchWheelZoom(page, zoomingIn ? -260 : 260);
      await page.waitForTimeout(ZOOM_STEP_DELAY_MS);
      await expect(page.locator('html')).toHaveAttribute(
        'data-app-mode',
        'immersive'
      );
      await expect(page.locator('#app')).not.toHaveAttribute(
        'data-mode',
        'text'
      );
      step += 1;
    }

    expect(await readFailoverEvents(page)).toEqual([]);
    expect(fallbackWarnings).toEqual([]);
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
  });
});
