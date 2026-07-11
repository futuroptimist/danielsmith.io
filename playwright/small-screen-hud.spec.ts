import { expect, test, type Page, type Locator } from '@playwright/test';

const IMMERSIVE_PREVIEW_URL = '/?mode=immersive&disablePerformanceFailover=1';
const IMMERSIVE_READY_TIMEOUT_MS = 45_000;
const POI_IDLE_TIMEOUT_MS = 4_000;
const VIEWPORT_BOUNDS_EPSILON_PX = 1;

type PoiTooltipState = {
  overlayVisiblePoiId: string | null;
  worldTooltipVisible: boolean;
};

type ViewportBounds = {
  width: number;
  height: number;
};

type ElementBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DebugCoordinatesState = {
  enabled: boolean;
  x: number;
  y: number;
  z: number;
  activeFloorId: string;
  predictedStairFloorId: string;
  cameraZoom: number;
  insideStairWidth: boolean;
  insideLanding: boolean;
  insideStairNavArea: boolean;
  stairZone: string;
  currentRoomId: string | null;
};

type AudioDebugState = {
  preferenceEnabled: boolean;
  ambientEnabled: boolean;
  ambientSourcesPlayingCount: number;
  ambientBedVolumes: Array<{
    id: string;
    currentVolume: number;
    targetVolume: number;
  }>;
  footstepEnabled: boolean;
  footstepPlaying: boolean;
  activeStorageKey: string;
};

type PortfolioPoiWindow = Window & {
  portfolio?: {
    poi?: {
      getTooltipState?: () => PoiTooltipState;
    };
    audio?: {
      getState?: () => AudioDebugState;
    };
    debugCoordinates?: {
      getState?: () => DebugCoordinatesState;
      setEnabled?: (enabled: boolean) => void;
    };
  };
};

async function pressShortcutUntil(
  page: Page,
  key: string,
  waitForShortcutEffect: () => Promise<void>
) {
  await page.keyboard.down(key);
  try {
    await waitForShortcutEffect();
  } finally {
    await page.keyboard.up(key);
  }
}

async function expectWithinViewport(
  locator: Locator,
  viewport: ViewportBounds
) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  const { x, y, width, height } = bounds as ElementBounds;

  expect(x).toBeGreaterThanOrEqual(-VIEWPORT_BOUNDS_EPSILON_PX);
  expect(y).toBeGreaterThanOrEqual(-VIEWPORT_BOUNDS_EPSILON_PX);
  expect(x + width).toBeLessThanOrEqual(
    viewport.width + VIEWPORT_BOUNDS_EPSILON_PX
  );
  expect(y + height).toBeLessThanOrEqual(
    viewport.height + VIEWPORT_BOUNDS_EPSILON_PX
  );
}

async function waitForImmersiveReady(page: Page) {
  await page.goto(IMMERSIVE_PREVIEW_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => document.documentElement.dataset.appMode === 'immersive',
    undefined,
    { timeout: IMMERSIVE_READY_TIMEOUT_MS }
  );
  await page.waitForFunction(
    () => (window as PortfolioPoiWindow).portfolio?.poi?.getTooltipState
  );
  await page.waitForFunction(
    () => (window as PortfolioPoiWindow).portfolio?.audio?.getState
  );
}

async function getDebugCoordinatesState(
  page: Page
): Promise<DebugCoordinatesState> {
  return page.evaluate(() => {
    const getState = (window as PortfolioPoiWindow).portfolio?.debugCoordinates
      ?.getState;

    if (!getState) {
      throw new Error(
        'window.portfolio.debugCoordinates.getState() is unavailable'
      );
    }

    return getState();
  });
}

async function setDebugCoordinatesEnabled(page: Page, enabled: boolean) {
  await page.evaluate((nextEnabled) => {
    const setEnabled = (window as PortfolioPoiWindow).portfolio
      ?.debugCoordinates?.setEnabled;

    if (!setEnabled) {
      throw new Error(
        'window.portfolio.debugCoordinates.setEnabled() is unavailable'
      );
    }

    setEnabled(nextEnabled);
  }, enabled);
}

async function getAudioState(page: Page): Promise<AudioDebugState> {
  return page.evaluate(() => {
    const getState = (window as PortfolioPoiWindow).portfolio?.audio?.getState;

    if (!getState) {
      throw new Error('window.portfolio.audio.getState() is unavailable');
    }

    return getState();
  });
}

async function getPoiTooltipState(page: Page): Promise<PoiTooltipState> {
  return page.evaluate(() => {
    const getTooltipState = (window as PortfolioPoiWindow).portfolio?.poi
      ?.getTooltipState;

    if (!getTooltipState) {
      throw new Error('window.portfolio.poi.getTooltipState() is unavailable');
    }

    const state = getTooltipState();

    if (!state) {
      throw new Error(
        'window.portfolio.poi.getTooltipState() returned no state'
      );
    }

    return state;
  });
}

test.describe('small-screen HUD regression coverage', () => {
  test.describe('mobile viewport', () => {
    test.use({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 375, height: 667 },
    });

    test('keeps mobile HUD compact and panel state mutually exclusive', async ({
      page,
    }) => {
      test.slow();
      await waitForImmersiveReady(page);

      const hud = page.locator('#control-overlay');
      const hudMenu = page.locator('[data-role="hud-menu"]');
      const controlsButton = page.locator('[data-role="controls-button"]');
      const tutorialButton = page.locator('[data-role="tutorial-button"]');
      const textButton = page.locator('[data-role="text-mode-button"]');
      const settingsButton = page.locator('[data-role="settings-button"]');
      const controlsPopover = page.locator('[data-role="controls-popover"]');
      const settingsModal = page.locator('.help-modal-backdrop');

      await expect(page.locator('html')).toHaveAttribute(
        'data-hud-layout',
        'mobile'
      );
      await expect(hud).toBeVisible();
      await expect(hudMenu).toBeVisible();
      await expect(hudMenu.getByRole('button')).toHaveCount(4);
      await expect(controlsButton).toHaveAccessibleName(/Open controls.*C/);
      await expect(tutorialButton).toHaveAccessibleName(/Open tutorial.*R/);
      await expect(textButton).toHaveAccessibleName(/text mode.*T/i);
      await expect(settingsButton).toHaveAccessibleName(
        /(?:Open settings|Settings).*H/
      );

      await expectWithinViewport(hud, { width: 375, height: 667 });

      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsModal).toBeHidden();

      await controlsButton.tap();
      await expect(controlsPopover).toBeVisible();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');
      await expect(settingsModal).toBeHidden();

      await expectWithinViewport(controlsPopover, { width: 375, height: 667 });

      await textButton.focus();
      await expect(textButton).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(settingsButton).toBeFocused();

      await settingsButton.tap();
      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsModal).toBeVisible();
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('Escape');
      await expect(settingsModal).toBeHidden();
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');

      await pressShortcutUntil(page, 'h', async () => {
        await expect(settingsModal).toBeVisible();
        await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
      });
      await page.keyboard.press('Escape');
      await expect(settingsModal).toBeHidden();
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'false');

      await controlsButton.tap();
      await expect(controlsPopover).toBeVisible();
      await controlsButton.tap();
      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

      await page.waitForTimeout(POI_IDLE_TIMEOUT_MS + 500);
      await expect
        .poll(async () => getPoiTooltipState(page), { timeout: 1_000 })
        .toMatchObject({
          overlayVisiblePoiId: null,
          worldTooltipVisible: false,
        });
    });
  });

  test.describe('desktop viewport', () => {
    test.use({ viewport: { width: 1280, height: 720 } });

    test('keeps debug coordinates visual-only and persisted', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        if (window.sessionStorage.getItem('debugCoordinatesE2eSeeded')) {
          return;
        }
        window.localStorage.removeItem('danielsmith.io::debugCoordinates::v1');
        window.sessionStorage.setItem('debugCoordinatesE2eSeeded', '1');
      });
      await waitForImmersiveReady(page);

      const overlay = page.locator('.debug-coordinates');
      await expect(overlay).toBeHidden();
      await expect(overlay).toHaveAttribute('aria-hidden', 'true');
      expect(await overlay.getAttribute('aria-live')).toBeNull();
      await expect(overlay).toHaveCSS('pointer-events', 'none');
      await expect
        .poll(async () => getDebugCoordinatesState(page))
        .toMatchObject({ enabled: false });

      await setDebugCoordinatesEnabled(page, true);
      await expect(overlay).toBeVisible();
      await expect(overlay).toContainText(/Debug coordinates/i);
      await expect(overlay).toContainText(/XYZ/i);
      await expect(overlay).toContainText(/Active floor/i);
      await expect(overlay).toHaveAttribute('aria-hidden', 'false');
      expect(await overlay.getAttribute('aria-live')).toBeNull();
      await expect
        .poll(async () => getDebugCoordinatesState(page))
        .toMatchObject({ enabled: true });

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => document.documentElement.dataset.appMode === 'immersive',
        undefined,
        { timeout: IMMERSIVE_READY_TIMEOUT_MS }
      );
      await page.waitForFunction(
        () =>
          (window as PortfolioPoiWindow).portfolio?.debugCoordinates?.getState
      );
      await expect(overlay).toBeVisible();
      await expect(overlay).toHaveAttribute('aria-hidden', 'false');
      await expect
        .poll(async () => getDebugCoordinatesState(page))
        .toMatchObject({ enabled: true });
    });

    test('routes Settings audio and M key toggles through global mute', async ({
      page,
    }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'danielsmith.io::ambientAudioEnabled::v1',
          '1'
        );
        window.localStorage.removeItem(
          'danielsmith.io::ambientAudioEnabled::v2'
        );
      });
      await waitForImmersiveReady(page);

      const settingsButton = page.locator('[data-role="settings-button"]');
      const settingsModal = page.locator('.help-modal-backdrop');
      await settingsButton.click();
      await expect(settingsModal).toBeVisible();

      const audioToggle = settingsModal.locator('button.audio-toggle');
      const audioVolume = settingsModal.locator('.audio-volume__value');
      await expect(audioToggle).toContainText(/Audio:\s*Off/i);
      await expect(audioVolume).toContainText(/Muted/i);

      await expect
        .poll(async () => getAudioState(page))
        .toMatchObject({
          preferenceEnabled: false,
          ambientEnabled: false,
          ambientSourcesPlayingCount: 0,
          footstepEnabled: false,
          footstepPlaying: false,
          activeStorageKey: 'danielsmith.io::ambientAudioEnabled::v2',
        });

      await audioToggle.click();
      await expect
        .poll(async () => getAudioState(page))
        .toMatchObject({
          preferenceEnabled: true,
          ambientEnabled: true,
          footstepEnabled: true,
        });

      await page.keyboard.press('m');
      await expect
        .poll(async () => {
          const state = await getAudioState(page);
          return (
            !state.preferenceEnabled &&
            !state.ambientEnabled &&
            state.ambientSourcesPlayingCount === 0 &&
            !state.footstepEnabled &&
            !state.footstepPlaying &&
            state.ambientBedVolumes.every(
              (bed) => bed.currentVolume === 0 && bed.targetVolume === 0
            )
          );
        })
        .toBe(true);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await waitForImmersiveReady(page);
      await expect
        .poll(async () => getAudioState(page))
        .toMatchObject({
          preferenceEnabled: false,
          ambientEnabled: false,
          ambientSourcesPlayingCount: 0,
          footstepEnabled: false,
        });
    });

    test('keeps desktop keyboard HUD toggles mutually exclusive', async ({
      page,
    }) => {
      await waitForImmersiveReady(page);

      const controlsButton = page.locator('[data-role="controls-button"]');
      const settingsButton = page.locator('[data-role="settings-button"]');
      const controlsPopover = page.locator('[data-role="controls-popover"]');
      const settingsModal = page.locator('.help-modal-backdrop');

      await expect(page.locator('html')).toHaveAttribute(
        'data-hud-layout',
        'desktop'
      );
      await expect(page.locator('[data-role="hud-menu"]')).toBeVisible();
      await expect(controlsButton).toHaveAccessibleName(/Open controls.*C/);
      await expect(settingsButton).toHaveAccessibleName(
        /(?:Open settings|Settings).*H/
      );

      await expect(controlsPopover).toBeHidden();
      await page.keyboard.press('c');
      await expect(controlsPopover).toBeVisible();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'true');

      await page.keyboard.press('c');
      await expect(controlsPopover).toBeHidden();
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');

      await page.keyboard.press('c');
      await expect(controlsPopover).toBeVisible();
      await pressShortcutUntil(page, 'h', async () => {
        await expect(controlsPopover).toBeHidden();
        await expect(settingsModal).toBeVisible();
      });
      await expect(controlsButton).toHaveAttribute('aria-expanded', 'false');
      await expect(controlsButton).toHaveAttribute('aria-pressed', 'false');
      await expect(settingsButton).toHaveAttribute('aria-expanded', 'true');
      await expect(settingsButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
