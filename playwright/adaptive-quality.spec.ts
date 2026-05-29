import { expect, test } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

test.describe('adaptive immersive quality', () => {
  test('software renderer diagnostics select performance quality without disabling telemetry', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function patched(
        parameter
      ) {
        if (parameter === this.RENDERER) {
          return 'ANGLE (Google, Vulkan SwiftShader driver)';
        }
        if (parameter === this.VENDOR) {
          return 'Google Inc. (Google)';
        }
        return originalGetParameter.call(this, parameter);
      };
    });

    await page.goto('/?mode=immersive&disablePerformanceFailover=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive',
      { timeout: IMMERSIVE_READY_TIMEOUT_MS }
    );
    await page.waitForFunction(() => Boolean(window.portfolio?.performance));

    const snapshot = await page.evaluate(() =>
      window.portfolio?.performance?.getSnapshot()
    );
    expect(snapshot?.rendererInfo.isSoftwareRenderer).toBe(true);
    expect(snapshot?.quality.level).toBe('performance');
    expect(snapshot?.rendererMetrics.dpr ?? 99).toBeLessThanOrEqual(0.75);
    expect(snapshot?.postprocessing.bloomEnabled).toBe(false);
    expect(snapshot?.postprocessing.composerEnabled).toBe(false);
    expect(snapshot?.mirror.enabled).toBe(false);
  });
});
