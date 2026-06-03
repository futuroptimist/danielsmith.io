import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_URL = '/?mode=immersive';
const IMMERSIVE_DIAGNOSTICS_URL =
  '/?mode=immersive&disablePerformanceFailover=1';
const SOFTWARE_RENDERER_ZOOM_PAN_MS = 600;
const HARDWARE_RENDERER_ZOOM_PAN_MS = 4_000;

interface PerformanceFailoverProbe {
  eventCount: number;
  events: Array<unknown>;
}

interface PerformanceSnapshot {
  averageFps: number;
  p95FrameMs: number;
  sampleCount: number;
  rendererSize: {
    pixelRatio: number;
    viewport: { width: number; height: number };
    drawingBuffer: { width: number; height: number };
  };
  quality: {
    level: 'cinematic' | 'balanced' | 'performance';
    selectionSource: 'initial' | 'adaptive' | 'user';
    adaptiveDowngradeCount: number;
    adaptiveRecoveryCount: number;
    lastAdaptiveReason: string | null;
    lastAdaptiveDowngradeReason: string | null;
    lastAdaptiveRecoveryReason: string | null;
    sceneDetail?: {
      level: 'cinematic' | 'balanced' | 'performance';
      theoreticalBudget: {
        transparentShaderLayers: number;
        dynamicPointLights: number;
        decorativeDrawCalls: number;
        poiTriangleScale: number;
        structureTriangleScale: number;
      };
      policy: {
        textures: {
          jobbotScreen: { width: number; height: number };
          mediaWallScreen: { width: number; height: number };
        };
      };
    };
    adaptivePolicy: {
      isWarmingUp: boolean;
      warmupElapsedMs: number;
      warmupRemainingMs: number;
      autoRecoveryEnabled: boolean;
      softwareRenderer: boolean;
      lastAction: 'downgrade' | 'recover' | null;
    } | null;
  };
  features: {
    bloomEnabled: boolean;
    composerEnabled: boolean;
    activePostprocessingPassCount: number;
    mirrorEnabled: boolean;
    mirrorRenderTargetSize: number;
    mirrorUpdateRateFps: number;
    mirrorRenderCount: number;
  };
  rendererCounters: {
    calls: number;
    triangles: number;
    points: number;
    lines: number;
    memoryGeometries: number;
    memoryTextures: number;
  };
  renderer: {
    isSoftwareRenderer: boolean;
    isDangerousSoftwareRenderer: boolean;
    riskLevel: 'normal' | 'software' | 'dangerous-software' | 'unknown';
  };
  softwareRendererPolicy: {
    mode: 'safe' | 'continuous';
    safeMode: boolean;
    renderCadenceFps: number | null;
    reason: string;
  };
  lastFailoverReason: string | null;
}

interface PortfolioWindow extends Window {
  __performanceFailoverProbe?: PerformanceFailoverProbe;
  portfolio?: {
    performance?: {
      getSnapshot(): PerformanceSnapshot;
    };
    graphics?: {
      setCameraPanForTest?(input: { x: number; y: number }): void;
    };
  };
}

async function installProductionLikeHints(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('danielsmith.io:mode-preference');
      window.localStorage.removeItem('danielsmith:graphics-quality-level');
      window.sessionStorage.removeItem('danielsmith.io:mode-preference');
    } catch {
      // Ignore inaccessible storage in hardened browser contexts.
    }

    window.__performanceFailoverProbe = { eventCount: 0, events: [] };
    window.addEventListener('performancefailover', (event) => {
      const customEvent = event as CustomEvent<unknown>;
      window.__performanceFailoverProbe?.events.push(customEvent.detail);
      if (window.__performanceFailoverProbe) {
        window.__performanceFailoverProbe.eventCount += 1;
      }
    });

    const defineNavigatorGetter = (key: string, value: unknown) => {
      for (const target of [window.navigator, Navigator.prototype]) {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            get: () => value,
          });
        } catch {
          // Ignore read-only browser hints that cannot be overridden.
        }
      }
    };

    defineNavigatorGetter('webdriver', false);
    defineNavigatorGetter('hardwareConcurrency', 8);
    defineNavigatorGetter('deviceMemory', 8);
  });
}

async function waitForImmersive(page: Page, url = IMMERSIVE_URL) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive',
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);
}

async function exerciseZoomPan(
  page: Page,
  durationMs = HARDWARE_RENDERER_ZOOM_PAN_MS
) {
  const canvas = page.locator('#app canvas');
  await canvas.hover();
  const deadline = Date.now() + durationMs;
  let direction = -1;
  while (Date.now() < deadline) {
    await page.mouse.wheel(0, direction * 360);
    await page.evaluate((nextDirection) => {
      (window as PortfolioWindow).portfolio?.graphics?.setCameraPanForTest?.({
        x: 0.35 * nextDirection,
        y: 0.2,
      });
    }, direction);
    direction *= -1;
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => {
    (window as PortfolioWindow).portfolio?.graphics?.setCameraPanForTest?.({
      x: 0,
      y: 0,
    });
  });
}

async function getSnapshot(page: Page): Promise<PerformanceSnapshot> {
  const snapshot = await page.evaluate(() =>
    (window as PortfolioWindow).portfolio?.performance?.getSnapshot()
  );
  expect(snapshot).toBeDefined();
  return snapshot as PerformanceSnapshot;
}

test.describe('immersive performance diagnostics', () => {
  test.setTimeout(120_000);

  test('keeps normal desktop interaction immersive and exposes low-cost feature state', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await installProductionLikeHints(page);

    try {
      await waitForImmersive(page);
      const initialSnapshot = await getSnapshot(page);
      test.skip(
        initialSnapshot.renderer.isSoftwareRenderer,
        'normal desktop failover coverage requires a hardware WebGL renderer'
      );
      const zoomPanDurationMs = initialSnapshot.renderer.isSoftwareRenderer
        ? SOFTWARE_RENDERER_ZOOM_PAN_MS
        : HARDWARE_RENDERER_ZOOM_PAN_MS;
      await exerciseZoomPan(page, zoomPanDurationMs);
      await page.waitForTimeout(500);

      await expect(page.locator('html')).toHaveAttribute(
        'data-app-mode',
        'immersive'
      );
      await expect(page.locator('#app canvas')).toHaveCount(1);

      const probe = await page.evaluate(
        () => (window as PortfolioWindow).__performanceFailoverProbe
      );
      expect(probe?.eventCount ?? 0).toBe(0);

      const snapshot = await getSnapshot(page);
      if (snapshot.renderer.isSoftwareRenderer) {
        expect(snapshot.sampleCount).toBeGreaterThanOrEqual(0);
      } else {
        expect(snapshot.sampleCount).toBeGreaterThan(10);
        expect(snapshot.p95FrameMs).toBeLessThan(250);
      }
      expect(snapshot.lastFailoverReason).toBeNull();
      expect(snapshot.rendererSize.pixelRatio).toBeLessThanOrEqual(1.25);
      expect(snapshot.quality.level).not.toBe('cinematic');
      expect(snapshot.quality.adaptivePolicy).toBeDefined();
      expect(snapshot.quality.adaptivePolicy?.softwareRenderer).toBe(
        snapshot.renderer.isSoftwareRenderer
      );
      expect(snapshot.features.mirrorRenderTargetSize).toBeLessThanOrEqual(320);
      if (snapshot.quality.level === 'performance') {
        expect(snapshot.features.bloomEnabled).toBe(false);
        expect(snapshot.features.composerEnabled).toBe(false);
        expect(snapshot.features.mirrorEnabled).toBe(false);
      }
    } finally {
      await context.close();
    }
  });

  test('reports aggressive performance scene detail budgets when forced by user preference', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await installProductionLikeHints(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'danielsmith:graphics-quality-level',
        'performance'
      );
    });

    try {
      await waitForImmersive(page, IMMERSIVE_DIAGNOSTICS_URL);
      const snapshot = await getSnapshot(page);
      expect(snapshot.quality.level).toBe('performance');
      expect(snapshot.quality.sceneDetail?.level).toBe('performance');
      expect(snapshot.quality.sceneDetail?.theoreticalBudget).toMatchObject({
        transparentShaderLayers: 0,
        dynamicPointLights: 1,
      });
      expect(
        snapshot.quality.sceneDetail?.theoreticalBudget.poiTriangleScale
      ).toBeLessThanOrEqual(0.2);
      expect(
        snapshot.quality.sceneDetail?.theoreticalBudget.structureTriangleScale
      ).toBeLessThanOrEqual(0.2);
      expect(
        snapshot.quality.sceneDetail?.policy.textures.jobbotScreen.width
      ).toBeLessThanOrEqual(512);
      expect(
        snapshot.quality.sceneDetail?.policy.textures.mediaWallScreen.width
      ).toBeLessThanOrEqual(512);
      expect(snapshot.rendererCounters.calls).toBeGreaterThanOrEqual(0);
      expect(snapshot.rendererCounters.triangles).toBeGreaterThanOrEqual(0);
      expect(snapshot.rendererCounters.memoryGeometries).toBeGreaterThanOrEqual(
        0
      );
    } finally {
      await context.close();
    }
  });

  test('keeps diagnostics available when performance failover is disabled', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await installProductionLikeHints(page);

    try {
      await waitForImmersive(page, IMMERSIVE_DIAGNOSTICS_URL);
      const snapshot = await getSnapshot(page);
      expect(snapshot.rendererSize.pixelRatio).toBeGreaterThan(0);
      expect(
        snapshot.features.activePostprocessingPassCount
      ).toBeGreaterThanOrEqual(0);
      expect(snapshot.quality.level).not.toBe('cinematic');
      expect(snapshot.quality.adaptivePolicy).toBeDefined();
    } finally {
      await context.close();
    }
  });
});
