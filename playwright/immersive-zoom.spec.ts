import { expect, test, type Page } from '@playwright/test';

const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const IMMERSIVE_PREVIEW_URL =
  '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous';

interface MotionBlurState {
  enabled: boolean;
  damp: number;
  intensity: number;
  pendingHistoryReset: boolean;
  historyResetRequestCount: number;
  lastHistoryResetDamp: number | null;
}

interface InitialCameraFraming {
  targetViewportHeightRatio: number;
  unclampedZoom: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  effectiveViewportHeightRatio: number;
}

interface PortfolioWindow extends Window {
  portfolio?: {
    graphics?: {
      getMotionBlurState(): MotionBlurState;
      setMotionBlurIntensity(intensity: number): void;
      getCameraZoom?(): number;
      getCameraZoomTarget?(): number;
      getInitialCameraFraming?(): InitialCameraFraming | undefined;
      setCameraPanForTest?(input: { x: number; y: number }): void;
    };
  };
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

async function getInitialCameraFraming(
  page: Page
): Promise<InitialCameraFraming> {
  const framing = await page.evaluate(() =>
    (window as PortfolioWindow).portfolio?.graphics?.getInitialCameraFraming?.()
  );
  expect(framing).toBeDefined();
  return framing as InitialCameraFraming;
}

async function getCameraZoomState(page: Page) {
  const state = await page.evaluate(() => ({
    zoom: (window as PortfolioWindow).portfolio?.graphics?.getCameraZoom?.(),
    target: (
      window as PortfolioWindow
    ).portfolio?.graphics?.getCameraZoomTarget?.(),
  }));
  expect(state.zoom).toBeDefined();
  expect(state.target).toBeDefined();
  return state as { zoom: number; target: number };
}

async function assertInitialZoomFraming(page: Page) {
  const framing = await getInitialCameraFraming(page);
  const zoomState = await getCameraZoomState(page);

  const expectedClampedZoom = Math.min(
    Math.max(framing.unclampedZoom, framing.minZoom),
    framing.maxZoom
  );

  expect(framing.targetViewportHeightRatio).toBeCloseTo(0.5, 6);
  expect(framing.zoom).toBeGreaterThanOrEqual(framing.minZoom);
  expect(framing.zoom).toBeLessThanOrEqual(framing.maxZoom);
  expect(framing.zoom).toBeCloseTo(expectedClampedZoom, 6);
  expect(zoomState.zoom).toBeCloseTo(framing.zoom, 6);
  expect(zoomState.target).toBeCloseTo(framing.zoom, 6);
  expect(framing.effectiveViewportHeightRatio).toBeGreaterThan(0.2);

  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
    canvas?.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: 10_000,
      })
    );
  });

  const zoomedOutState = await getCameraZoomState(page);
  expect(zoomedOutState.target).toBeLessThan(framing.zoom);
  expect(zoomedOutState.target).toBeGreaterThanOrEqual(framing.minZoom);
}

async function getMotionBlurState(page: Page): Promise<MotionBlurState> {
  const state = await page.evaluate(() =>
    (window as PortfolioWindow).portfolio?.graphics?.getMotionBlurState()
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
    (window as PortfolioWindow).portfolio?.graphics?.setCameraPanForTest?.(
      nextInput
    );
  }, input);
  await page.waitForFunction(
    (count) =>
      ((window as PortfolioWindow).portfolio?.graphics?.getMotionBlurState()
        .historyResetRequestCount ?? 0) > count,
    previousCount
  );
}

async function dragCameraPan(page: Page) {
  await setCameraPanInputAndWaitForReset(page, { x: 0.5, y: 0.35 });
  await setCameraPanInputAndWaitForReset(page, { x: 0, y: 0 });
}

async function assertNoFallbackOrAfterimageSymptom(page: Page) {
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  await expect(page.locator('#app')).not.toHaveAttribute('data-mode', 'text');
  await expect(page.locator('#app canvas')).toHaveCount(1);

  await page.waitForFunction(() => {
    const state = (
      window as PortfolioWindow
    ).portfolio?.graphics?.getMotionBlurState();
    return state ? !state.enabled || !state.pendingHistoryReset : false;
  });

  const state = await getMotionBlurState(page);
  expect(state.lastHistoryResetDamp).toBe(0);
  if (state.enabled) {
    expect(state.pendingHistoryReset).toBe(false);
    expect(state.damp).toBeGreaterThan(0);
  } else {
    expect(state.damp).toBe(0);
  }
}

test.describe('immersive orthographic zoom', () => {
  test.setTimeout(150_000);

  test('starts desktop immersive mode zoomed in on the avatar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await waitForImmersive(page);

    await assertInitialZoomFraming(page);
  });

  test('starts iPhone SE-sized immersive mode with safe clamped avatar framing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await waitForImmersive(page);

    await assertInitialZoomFraming(page);
    await expect(page.locator('[data-role="hud-menu"]')).toBeVisible();
  });

  test('zooms with keyboard shortcuts and ignores text-entry targets', async ({
    page,
  }) => {
    await waitForImmersive(page);

    const initial = await getCameraZoomState(page);
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'Minus',
          key: '_',
          shiftKey: true,
        })
      );
    });
    const zoomedOut = await getCameraZoomState(page);
    expect(zoomedOut.target).toBeLessThan(initial.target);

    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          code: 'Equal',
          key: '+',
          shiftKey: true,
        })
      );
    });
    const zoomedIn = await getCameraZoomState(page);
    expect(zoomedIn.target).toBeGreaterThan(zoomedOut.target);

    const beforeInput = await getCameraZoomState(page);
    const inputEventPrevented = await page.evaluate(() => {
      const input = document.createElement('input');
      document.body.append(input);
      input.focus();
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        code: 'Equal',
        key: '+',
        shiftKey: true,
      });
      input.dispatchEvent(event);
      input.remove();
      return event.defaultPrevented;
    });
    const afterInput = await getCameraZoomState(page);
    expect(inputEventPrevented).toBe(false);
    expect(afterInput.target).toBeCloseTo(beforeInput.target, 6);
  });

  test('keeps touch pinch zoom multiplicative and bounded', async ({
    page,
  }) => {
    await waitForImmersive(page);
    const framing = await getInitialCameraFraming(page);
    const initial = await getCameraZoomState(page);

    await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('#app canvas');
      canvas?.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
          pointerType: 'touch',
        })
      );
      canvas?.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          clientX: 200,
          clientY: 100,
          pointerId: 2,
          pointerType: 'touch',
        })
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 300,
          clientY: 100,
          pointerId: 2,
          pointerType: 'touch',
        })
      );
    });

    const pinched = await getCameraZoomState(page);
    expect(pinched.target).toBeCloseTo(
      Math.min(initial.target * 2, framing.maxZoom),
      5
    );
    expect(pinched.target).toBeGreaterThanOrEqual(framing.minZoom);
    expect(pinched.target).toBeLessThanOrEqual(framing.maxZoom);

    await page.evaluate(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: 10_000,
          clientY: 100,
          pointerId: 2,
          pointerType: 'touch',
        })
      );
    });
    const clamped = await getCameraZoomState(page);
    expect(clamped.target).toBe(framing.maxZoom);
  });

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
    await assertNoFallbackOrAfterimageSymptom(page);
    const zoomedMotionBlur = await getMotionBlurState(page);
    expect(zoomedMotionBlur.historyResetRequestCount).toBeGreaterThan(
      resetRequestsBeforeZoom
    );
    expect(zoomedMotionBlur.lastHistoryResetDamp).toBe(0);

    await page.evaluate(() => {
      (window as PortfolioWindow).portfolio?.graphics?.setMotionBlurIntensity(
        0
      );
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
    await assertNoFallbackOrAfterimageSymptom(page);
  });

  test('clears afterimage history when nonzero blur returns to zero', async ({
    page,
  }) => {
    await waitForImmersive(page);

    await page.evaluate(() => {
      (window as PortfolioWindow).portfolio?.graphics?.setMotionBlurIntensity(
        0.5
      );
    });
    await page.waitForFunction(
      () =>
        (window as PortfolioWindow).portfolio?.graphics?.getMotionBlurState()
          .enabled === true
    );
    await wheelZoom(page);
    await assertNoFallbackOrAfterimageSymptom(page);

    await page.evaluate(() => {
      (window as PortfolioWindow).portfolio?.graphics?.setMotionBlurIntensity(
        0
      );
    });
    await page.waitForFunction(
      () =>
        (window as PortfolioWindow).portfolio?.graphics?.getMotionBlurState()
          .enabled === false
    );
    await wheelZoom(page);

    const disabledMotionBlur = await getMotionBlurState(page);
    expect(disabledMotionBlur).toMatchObject({
      enabled: false,
      damp: 0,
      intensity: 0,
    });
    await assertNoFallbackOrAfterimageSymptom(page);
  });

  test('clears history for camera pan only at pan start and release', async ({
    page,
  }) => {
    await waitForImmersive(page);
    await page.evaluate(() => {
      (window as PortfolioWindow).portfolio?.graphics?.setMotionBlurIntensity(
        0.5
      );
    });
    await page.waitForFunction(
      () =>
        (window as PortfolioWindow).portfolio?.graphics?.getMotionBlurState()
          .enabled === true
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
