import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;

type MotionBlurState = {
  intensity: number;
  damp: number;
  enabled: boolean;
  resetCount: number;
};

type ZoomSnapshot = {
  appMode?: string;
  appDataMode?: string;
  canvasCount: number;
  motionBlur: MotionBlurState;
};

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
}

async function getMotionBlurState(page: Page): Promise<MotionBlurState> {
  return await page.evaluate(() => {
    const state = window.portfolio?.graphics?.getMotionBlurState?.();
    if (!state) {
      throw new Error('Motion blur graphics test hook unavailable');
    }
    return state;
  });
}

async function setMotionBlurIntensity(page: Page, value: number) {
  await page.evaluate((nextValue) => {
    const input = document.querySelector<HTMLInputElement>(
      '#motion-blur-slider'
    );
    if (!input) {
      throw new Error('Motion blur slider unavailable');
    }
    input.value = String(nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function dispatchWheelZoomSnapshot(page: Page): Promise<ZoomSnapshot> {
  return await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      throw new Error('Immersive canvas unavailable');
    }
    for (const deltaY of [-240, -180, 220, 180, -120, 160]) {
      canvas.dispatchEvent(
        new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true })
      );
    }
    const motionBlur = window.portfolio?.graphics?.getMotionBlurState?.();
    if (!motionBlur) {
      throw new Error('Motion blur graphics test hook unavailable');
    }
    return {
      appMode: document.documentElement.dataset.appMode,
      appDataMode:
        document.querySelector('#app')?.getAttribute('data-mode') ?? undefined,
      canvasCount: document.querySelectorAll('canvas').length,
      motionBlur,
    };
  });
}

test.describe('immersive orthographic zoom', () => {
  test('does not leave afterimage history or reveal text fallback while zooming', async ({
    page,
  }) => {
    await waitForImmersiveReady(page);

    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'immersive'
    );
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app[data-mode="text"]')).toHaveCount(0);

    await setMotionBlurIntensity(page, 0);
    const disabledBeforeZoom = await getMotionBlurState(page);
    expect(disabledBeforeZoom.intensity).toBe(0);
    expect(disabledBeforeZoom.enabled).toBe(false);
    expect(disabledBeforeZoom.damp).toBe(0);

    const disabledZoomSnapshot = await dispatchWheelZoomSnapshot(page);
    expect(disabledZoomSnapshot.appMode).toBe('immersive');
    expect(disabledZoomSnapshot.appDataMode).not.toBe('text');
    expect(disabledZoomSnapshot.canvasCount).toBe(1);
    expect(disabledZoomSnapshot.motionBlur.intensity).toBe(0);
    expect(disabledZoomSnapshot.motionBlur.enabled).toBe(false);
    expect(disabledZoomSnapshot.motionBlur.damp).toBe(0);

    await setMotionBlurIntensity(page, 0.6);
    const reenabledBeforeZero = await getMotionBlurState(page);
    expect(reenabledBeforeZero.damp).toBeGreaterThan(0);
    expect(reenabledBeforeZero.damp).toBeLessThan(1);

    await setMotionBlurIntensity(page, 0);
    const clearedAfterToggle = await getMotionBlurState(page);
    expect(clearedAfterToggle.intensity).toBe(0);
    expect(clearedAfterToggle.enabled).toBe(false);
    expect(clearedAfterToggle.damp).toBe(0);
    expect(clearedAfterToggle.resetCount).toBeGreaterThan(
      reenabledBeforeZero.resetCount
    );

    const clearedZoomSnapshot = await dispatchWheelZoomSnapshot(page);
    expect(clearedZoomSnapshot.appMode).toBe('immersive');
    expect(clearedZoomSnapshot.appDataMode).not.toBe('text');
    expect(clearedZoomSnapshot.canvasCount).toBe(1);
    expect(clearedZoomSnapshot.motionBlur.intensity).toBe(0);
    expect(clearedZoomSnapshot.motionBlur.enabled).toBe(false);
    expect(clearedZoomSnapshot.motionBlur.damp).toBe(0);
  });
});
