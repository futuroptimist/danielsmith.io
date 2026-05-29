import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';

interface MotionBlurState {
  enabled: boolean;
  damp: number;
  intensity: number;
  pendingHistoryReset: boolean;
  historyResetRequestCount: number;
  lastHistoryResetDamp: number | null;
}

async function waitForImmersive(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
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

async function getMotionBlurState(page: Page): Promise<MotionBlurState> {
  const state = await page.evaluate(() =>
    window.portfolio?.graphics?.getMotionBlurState()
  );
  expect(state).toBeDefined();
  return state as MotionBlurState;
}

async function wheelZoom(page: Page) {
  for (const deltaY of [-360, -240, 180, 300, -180, 240]) {
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
}

async function setCameraPanInputAndWaitForReset(
  page: Page,
  input: { x: number; y: number }
) {
  const previousCount = (await getMotionBlurState(page))
    .historyResetRequestCount;
  await page.evaluate((nextInput) => {
    window.portfolio?.graphics?.setCameraPanForTest?.(nextInput);
  }, input);
  await page.waitForFunction(
    (count) =>
      (window.portfolio?.graphics?.getMotionBlurState()
        .historyResetRequestCount ?? 0) > count,
    previousCount
  );
}

async function dragCameraPan(page: Page) {
  await setCameraPanInputAndWaitForReset(page, { x: 0.5, y: 0.35 });
  await setCameraPanInputAndWaitForReset(page, { x: 0, y: 0 });
}

test.describe('immersive orthographic zoom', () => {
  test.setTimeout(150_000);

  test('keeps a single clean immersive canvas while zooming with motion blur disabled', async ({
    page,
  }) => {
    await waitForImmersive(page);

    const initialMotionBlur = await getMotionBlurState(page);
    expect(initialMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });

    const resetRequestsBeforeZoom = initialMotionBlur.historyResetRequestCount;
    await wheelZoom(page);
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
    const zoomedMotionBlur = await getMotionBlurState(page);
    expect(zoomedMotionBlur.historyResetRequestCount).toBeGreaterThan(
      resetRequestsBeforeZoom
    );
    expect(zoomedMotionBlur.lastHistoryResetDamp).toBe(0);

    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0);
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-accessibility-motion-blur',
      '0'
    );
    await wheelZoom(page);

    const disabledMotionBlur = await getMotionBlurState(page);
    expect(disabledMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
  });

  test('clears afterimage history when nonzero blur returns to zero', async ({
    page,
  }) => {
    await waitForImmersive(page);

    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0.5);
    });
    await page.waitForFunction(
      () => window.portfolio?.graphics?.getMotionBlurState().enabled === true
    );
    await wheelZoom(page);

    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0);
    });
    await page.waitForFunction(
      () => window.portfolio?.graphics?.getMotionBlurState().enabled === false
    );
    await wheelZoom(page);

    const disabledMotionBlur = await getMotionBlurState(page);
    expect(disabledMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });
    await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
    await expect(page.locator('#app canvas')).toHaveCount(1);
  });

  test('clears history for camera pan only at pan start and release', async ({
    page,
  }) => {
    await waitForImmersive(page);
    await page.evaluate(() => {
      window.portfolio?.graphics?.setMotionBlurIntensity(0.5);
    });
    await page.waitForFunction(
      () => window.portfolio?.graphics?.getMotionBlurState().enabled === true
    );

    const beforePan = await getMotionBlurState(page);
    await dragCameraPan(page);
    const afterPan = await getMotionBlurState(page);

    expect(
      afterPan.historyResetRequestCount - beforePan.historyResetRequestCount
    ).toBe(2);
    expect(afterPan.damp).toBeGreaterThan(0);
    expect(afterPan.enabled).toBe(true);
    expect(afterPan.lastHistoryResetDamp).toBe(0);
  });
});
