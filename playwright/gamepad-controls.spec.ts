import { expect, test } from '@playwright/test';

interface SyntheticWindow extends Window {
  syntheticPad: {
    mapping: string;
    connected: boolean;
    axes: number[];
    buttons: { pressed: boolean; value: number }[];
  };
  portfolio?: {
    world?: { getPlayerPosition(): { x: number; z: number } };
    graphics?: { getCameraZoomTarget(): number };
  };
}

test('synthetic standard gamepad moves and zooms; HUD and disconnect remain safe', async ({
  page,
}) => {
  test.slow();
  await page.addInitScript(() => {
    const win = window as unknown as SyntheticWindow;
    win.syntheticPad = {
      mapping: 'standard',
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          ...win.syntheticPad,
          id: 'Synthetic generic standard controller',
          index: 0,
        },
      ],
    });
  });
  await page.goto(
    '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  const canvas = page.locator('#app canvas');
  await canvas.focus();
  const position = () =>
    page.evaluate(() =>
      (
        window as unknown as SyntheticWindow
      ).portfolio!.world!.getPlayerPosition()
    );
  const zoom = () =>
    page.evaluate(() =>
      (
        window as unknown as SyntheticWindow
      ).portfolio!.graphics!.getCameraZoomTarget()
    );
  await page.waitForTimeout(250);
  const before = await position();
  const initialZoom = await zoom();
  await page.evaluate(() => {
    const pad = (window as unknown as SyntheticWindow).syntheticPad;
    pad.axes = [0.7, 0, 0.5, 0];
    pad.buttons[6] = { pressed: true, value: 1 };
  });
  await expect
    .poll(async () => {
      const next = await position();
      return Math.hypot(next.x - before.x, next.z - before.z);
    })
    .toBeGreaterThan(0.05);
  await expect.poll(zoom).toBeLessThan(initialZoom);
  await page.evaluate(() => {
    (window as unknown as SyntheticWindow).syntheticPad.connected = false;
    window.dispatchEvent(new Event('gamepaddisconnected'));
  });
  await page.waitForTimeout(500);
  const disconnected = await position();
  const stoppedZoom = await zoom();
  await page.waitForTimeout(350);
  const stopped = await position();
  expect(
    Math.hypot(stopped.x - disconnected.x, stopped.z - disconnected.z)
  ).toBeLessThan(0.03);
  expect(await zoom()).toBe(stoppedZoom);

  await page.locator('[data-role="controls-button"]').click();
  const category = page.locator('[data-role="gamepad-controls"]');
  await expect(category).toBeVisible();
  await expect(category.getByRole('heading')).toHaveText('Gamepad controls');
  await expect(category).toContainText('Bottom face button (A / Cross)');
  await expect(
    page.locator('[data-control-item="keyboardMove"]')
  ).toBeVisible();
  await page.locator('[data-role="controls-close"]').click();
  await expect(category).toBeHidden();

  await canvas.focus();
  await page.evaluate(() => {
    const pad = (window as unknown as SyntheticWindow).syntheticPad;
    pad.connected = true;
    pad.mapping = '';
    pad.axes = [1, 0, 1, 0];
  });
  await page.waitForTimeout(350);
  expect(await zoom()).toBe(stoppedZoom);
  const unsupported = await position();
  expect(
    Math.hypot(unsupported.x - stopped.x, unsupported.z - stopped.z)
  ).toBeLessThan(0.03);
});
