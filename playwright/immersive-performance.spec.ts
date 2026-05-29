import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const PRODUCTION_LIKE_IMMERSIVE_URL =
  '/?mode=immersive&disablePerformanceFailover=1';

type PerformanceSnapshot = {
  averageFps: number;
  p95FrameMs: number;
  sampleCount: number;
  quality: { level: string; dpr: number; downgradeCount: number };
  features: {
    composerEnabled: boolean;
    bloomEnabled: boolean;
    activePostprocessingPassCount: number;
    mirrorEnabled: boolean;
    mirrorRenderTargetSize: number;
    mirrorUpdateRateFps: number;
  };
};

async function waitForImmersive(page: Page) {
  await page.goto(PRODUCTION_LIKE_IMMERSIVE_URL, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive',
    {
      timeout: IMMERSIVE_READY_TIMEOUT_MS,
    }
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function exerciseZoomAndMovement(page: Page) {
  await page.locator('#app canvas').hover();
  for (let index = 0; index < 24; index += 1) {
    await page.mouse.wheel(0, index % 2 === 0 ? -320 : 260);
    await page.keyboard.down(index % 2 === 0 ? 'w' : 'd');
    await page.waitForTimeout(80);
    await page.keyboard.up(index % 2 === 0 ? 'w' : 'd');
  }
  await page.waitForTimeout(500);
}

async function readSnapshot(page: Page): Promise<PerformanceSnapshot> {
  const snapshot = await page.evaluate(() =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).portfolio?.performance?.getSnapshot?.()
  );
  expect(snapshot).toBeDefined();
  return snapshot as PerformanceSnapshot;
}

test.describe('immersive performance diagnostics', () => {
  test.setTimeout(150_000);

  test('keeps normal interaction immersive and exposes diagnostics with failover disabled', async ({
    page,
  }) => {
    const failoverEvents: unknown[] = [];
    await page.addInitScript(() => {
      window.addEventListener('performancefailover', (event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__failoverEvents = [
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...((window as any).__failoverEvents ?? []),
          (event as CustomEvent).detail,
        ];
      });
    });

    await waitForImmersive(page);
    await exerciseZoomAndMovement(page);

    const browserEvents = await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => (window as any).__failoverEvents ?? []
    );
    failoverEvents.push(...browserEvents);
    const snapshot = await readSnapshot(page);

    expect(failoverEvents).toEqual([]);
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    await expect(page.locator('#app canvas')).toHaveCount(1);
    expect(snapshot.sampleCount).toBeGreaterThan(10);
    expect(snapshot.averageFps).toBeGreaterThan(1);
    expect(snapshot.p95FrameMs).toBeLessThan(2_000);
    expect(['balanced', 'performance', 'cinematic']).toContain(
      snapshot.quality.level
    );
    expect(
      snapshot.features.activePostprocessingPassCount
    ).toBeGreaterThanOrEqual(0);
    if (snapshot.quality.level === 'performance') {
      expect(snapshot.features.bloomEnabled).toBe(false);
      expect(snapshot.features.composerEnabled).toBe(false);
      expect(snapshot.features.mirrorEnabled).toBe(false);
    }
  });
});
