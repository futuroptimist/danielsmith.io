import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const BASIC_RENDERER =
  'ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)';

async function mockDangerousRenderer(page: Page) {
  await page.addInitScript((rendererName) => {
    const patchGetParameter = (
      prototype: WebGLRenderingContext | WebGL2RenderingContext
    ) => {
      const original = prototype.getParameter;
      Object.defineProperty(prototype, 'getParameter', {
        configurable: true,
        value(parameter: number) {
          if (parameter === this.RENDERER) {
            return 'WebGL';
          }
          if (parameter === this.VENDOR) {
            return 'Google Inc.';
          }
          if (parameter === 0x9246) {
            return rendererName;
          }
          if (parameter === 0x9245) {
            return 'Microsoft';
          }
          return original.call(this, parameter);
        },
      });
    };
    patchGetParameter(WebGLRenderingContext.prototype);
    if (typeof WebGL2RenderingContext !== 'undefined') {
      patchGetParameter(WebGL2RenderingContext.prototype);
    }
  }, BASIC_RENDERER);
}

async function waitForImmersive(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive',
    {
      timeout: IMMERSIVE_READY_TIMEOUT_MS,
    }
  );
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

test.describe('software renderer crash hardening', () => {
  test('dangerous renderer shows warning choices and keeps force immersive in safe mode', async ({
    page,
  }) => {
    await mockDangerousRenderer(page);
    await page.goto('/?mode=immersive&disablePerformanceFailover=1', {
      waitUntil: 'domcontentloaded',
    });
    await waitForImmersive(page);

    await expect(page.locator('html')).toHaveAttribute(
      'data-dangerous-renderer',
      'true'
    );
    await expect(page.locator('html')).toHaveAttribute(
      'data-software-renderer-mode',
      'safe'
    );
    await expect(page.locator('.software-renderer-warning')).toBeVisible();
    await expect(page.getByText('Software rendering detected')).toBeVisible();
    await expect(
      page.locator('[data-action="continue-safe-immersive"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-action="continuous-immersive"]')
    ).toHaveAttribute('href', /softwareRendererMode=continuous/);

    const crashLog = await page.evaluate(() => {
      const performanceDiagnostics =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).portfolio.performance;
      for (let index = 0; index < 80; index += 1) {
        performanceDiagnostics.recordSnapshot?.(
          performanceDiagnostics.getSnapshot()
        );
      }
      return performanceDiagnostics.exportCrashLog();
    });
    const parsedCrashLog = JSON.parse(crashLog) as { entries: unknown[] };
    expect(parsedCrashLog.entries.length).toBeLessThanOrEqual(40);
    expect(crashLog.length).toBeLessThan(100_000);
    expect(crashLog).toContain('renderer-warning');
    expect(crashLog).toContain('Basic Render Driver');
  });

  test('context loss records a breadcrumb before recoverable fallback', async ({
    page,
  }) => {
    await mockDangerousRenderer(page);
    await page.goto('/?mode=immersive&disablePerformanceFailover=1', {
      waitUntil: 'domcontentloaded',
    });
    await waitForImmersive(page);

    await page.locator('#app canvas').dispatchEvent('webglcontextlost');

    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(
      page.getByRole('link', { name: 'Try immersive again' })
    ).toBeVisible();

    const crashLog = await page.evaluate(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).portfolio.performance.exportCrashLog()
    );
    expect(crashLog).toContain('webgl-context-lost');
    expect(crashLog).toContain('recoverable fallback');
  });

  test('explicit continuous override bypasses the safe cadence cap', async ({
    page,
  }) => {
    await mockDangerousRenderer(page);
    await page.goto(
      '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous',
      { waitUntil: 'domcontentloaded' }
    );
    await waitForImmersive(page);

    const policy = await page.evaluate(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).portfolio.performance.getSnapshot()
          .softwareRendererPolicy
    );
    expect(policy).toMatchObject({ mode: 'continuous', safeMode: false });
  });
});
