import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_URL = '/?mode=immersive';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

async function installDesktopHints(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('danielsmith.io:mode-preference');
      window.sessionStorage.removeItem('danielsmith.io:mode-preference');
    } catch {
      // Ignore inaccessible storage.
    }
    const defineNavigatorGetter = (key: string, value: unknown) => {
      try {
        Object.defineProperty(Navigator.prototype, key, {
          configurable: true,
          get: () => value,
        });
      } catch {
        // Ignore read-only hints.
      }
    };
    defineNavigatorGetter('webdriver', false);
    defineNavigatorGetter('hardwareConcurrency', 8);
    defineNavigatorGetter('deviceMemory', 8);
  });
}

async function waitForImmersive(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive',
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

test.describe('immersive performance diagnostics', () => {
  test.setTimeout(120_000);

  test('stays immersive during normal zoom and exposes renderer feature state', async ({
    page,
  }) => {
    await installDesktopHints(page);
    await page.addInitScript(() => {
      window.addEventListener('performancefailover', () => {
        document.documentElement.dataset.testPerformanceFailover = 'true';
      });
    });

    await page.goto(IMMERSIVE_URL, { waitUntil: 'domcontentloaded' });
    await waitForImmersive(page);
    const canvasBox = await page.locator('#app canvas').boundingBox();
    if (!canvasBox) {
      throw new Error('Immersive canvas did not expose a bounding box.');
    }
    await page.mouse.move(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2
    );

    for (let index = 0; index < 16; index += 1) {
      await page.mouse.wheel(0, index % 2 === 0 ? -320 : 320);
      await page.keyboard.down(index % 2 === 0 ? 'KeyW' : 'KeyD');
      await page.waitForTimeout(120);
      await page.keyboard.up(index % 2 === 0 ? 'KeyW' : 'KeyD');
      await waitForImmersive(page);
    }

    const snapshot = await page.evaluate(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).portfolio?.performance?.getSnapshot?.()
    );

    expect(snapshot).toBeTruthy();
    await expect(page.locator('html')).not.toHaveAttribute(
      'data-test-performance-failover',
      'true'
    );
    expect(snapshot.sampleCount).toBeGreaterThan(0);
    expect(snapshot.averageFps).toBeGreaterThan(5);
    expect(snapshot.renderer.dpr).toBeLessThanOrEqual(1.5);
    expect(snapshot.features.activePostprocessingPassCount).toBeLessThanOrEqual(
      1
    );
    expect(snapshot.features.mirror.updateRate).toBeLessThanOrEqual(15);
    await waitForImmersive(page);
  });
});
