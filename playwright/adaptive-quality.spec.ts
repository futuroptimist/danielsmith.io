import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_URL = '/?mode=immersive&disablePerformanceFailover=1';

async function installSoftwareRendererOverride(page: Page) {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__portfolioRendererInfoOverride = {
      vendor: 'Google Inc.',
      renderer: 'WebGL',
      unmaskedVendor: 'Google Inc. (Google)',
      unmaskedRenderer: 'ANGLE (Google, Vulkan SwiftShader Device)',
      tier: 'software',
      reason: 'playwright software override',
    };
  });
}

test.describe('adaptive quality', () => {
  test('starts software-classified renderers in performance quality', async ({
    page,
  }) => {
    await installSoftwareRendererOverride(page);
    await page.goto(IMMERSIVE_URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive',
      {
        timeout: IMMERSIVE_READY_TIMEOUT_MS,
      }
    );

    const snapshot = await page.evaluate(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).portfolio?.performance?.getSnapshot?.()
    );

    expect(snapshot.quality.level).toBe('performance');
    expect(snapshot.quality.dpr).toBeLessThanOrEqual(0.75);
    expect(snapshot.renderer.tier).toBe('software');
    expect(snapshot.features.bloomEnabled).toBe(false);
    expect(snapshot.features.composerEnabled).toBe(false);
    expect(snapshot.features.mirrorEnabled).toBe(false);
  });
});
