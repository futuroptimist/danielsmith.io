import { expect, test, type Page } from '@playwright/test';
import { source as axeSource } from 'axe-core';

import {
  readyExterior,
  waitDoor,
  walkExteriorTo,
} from './helpers/exteriorJourney';

const button = '[data-exterior-door-control]';

async function crossFrontDoorWithNativeChord(page: Page, label: string) {
  // Keep the current button/HUD focus: that ownership is part of the regression.
  // A single native chord avoids traced gaps between two intended simultaneous keys.
  let position = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  const deadline = Date.now() + 5000;
  while (position.x <= 35 && Date.now() < deadline) {
    await page.keyboard.press('KeyS+KeyD', { delay: 160 });
    position = await page.evaluate(() =>
      window.portfolio!.world!.getPlayerPosition()
    );
  }
  const diagnostics = await page.evaluate(() => {
    const p = window.portfolio!;
    const position = p.world!.getPlayerPosition();
    return {
      position,
      floor: p.world!.getActiveFloor(),
      camera: p.world!.getCameraState(),
      doors: p.world!.getDoorSnapshots(),
      focus:
        document.activeElement?.getAttribute('aria-label') ??
        document.activeElement?.tagName,
      nextXBlockers: p.debugColliders!.getBlockingCollidersAt({
        x: position.x + 0.3,
        z: position.z,
        floorId: 'ground',
      }),
    };
  });
  await test.info().attach(`native-front-crossing-${label}`, {
    body: JSON.stringify(diagnostics, null, 2),
    contentType: 'application/json',
  });
  expect(diagnostics.position.x).toBeGreaterThan(35);
  expect(diagnostics.floor).toBe('ground');
}

test('walks from fresh spawn through the front door to the sidewalk and back', async ({
  page,
}) => {
  test.setTimeout(120000);
  await readyExterior(page);
  expect(
    await page.evaluate(() => window.portfolio!.world!.getPlayerPosition())
  ).toMatchObject({ x: 0, y: 0 });
  await walkExteriorTo(page, { x: 29, z: -15 });
  await expect(page.locator(button)).toHaveAccessibleName('Open Front door');
  const closed = await page.evaluate(() => {
    const w = window.portfolio!.world!;
    const before = w.getPlayerPosition();
    for (let i = 0; i < 50; i++) w.stepPlayerForTest({ dx: 0.1, dz: 0 });
    return {
      before,
      after: w.getPlayerPosition(),
      door: w.getDoorSnapshots()[0],
    };
  });
  expect(closed.after.x).toBeLessThan(32);
  expect(closed.door.blocked).toBe(true);
  // Native remappable Interact, followed by native camera-relative movement across the aperture.
  await page.locator('#app canvas').focus();
  await page.keyboard.press('KeyF');
  await waitDoor(page, 'front-door', 'open');
  expect(
    await page.evaluate(() =>
      window.portfolio!.debugColliders!.getBlockingCollidersAt({
        x: 32,
        z: -15,
        floorId: 'ground',
      })
    )
  ).toEqual([]);
  await crossFrontDoorWithNativeChord(page, 'fresh-spawn');
  await page.waitForTimeout(700);
  await walkExteriorTo(page, { x: 55, z: -15 });
  await expect(page.locator(button)).toBeHidden();
  await page.screenshot({
    path: test.info().outputPath('front-entry-sidewalk.png'),
  });
  await page.locator('#app canvas').focus();
  for (let i = 0; i < 16; i++) await page.keyboard.press('Shift+Minus');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: test.info().outputPath('front-entry-standard-orientation.png'),
  });
  await walkExteriorTo(page, { x: 35, z: -15 });
  await expect(page.locator(button)).toHaveAccessibleName('Close Front door');
  await page.locator(button).click();
  await waitDoor(page, 'front-door', 'closed');
  expect(
    await page.evaluate(() =>
      window.portfolio!.world!.canOccupyPosition({
        x: 32,
        z: -15,
        floorId: 'ground',
      })
    )
  ).toBe(false);
  await page.locator(button).click();
  await waitDoor(page, 'front-door', 'open');
  await walkExteriorTo(page, { x: 0, z: -20 });
  expect(
    await page.evaluate(() => window.portfolio!.world!.getActiveFloor())
  ).toBe('ground');
});

test('handles interrupted/repeated activation, occupancy, blur, modal focus and reduced motion', async ({
  page,
}) => {
  await readyExterior(page);
  await walkExteriorTo(page, { x: 29, z: -15 });
  await page.locator(button).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => window.portfolio!.world!.getDoorSnapshots()[0].progress
      )
    )
    .toBeGreaterThan(0);
  await page.locator(button).click();
  await waitDoor(page, 'front-door', 'closed');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator(button).click();
  await waitDoor(page, 'front-door', 'open');
  await walkExteriorTo(page, { x: 32, z: -15 });
  for (let i = 0; i < 4; i++) await page.locator(button).click();
  expect(
    await page.evaluate(() => window.portfolio!.world!.getDoorSnapshots()[0])
  ).toMatchObject({ state: 'open', occupied: true, blocked: false });
  await page.locator('#app canvas').focus();
  await page.keyboard.down('KeyS');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyS');
  const after = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeLessThan(0.5);
  // The held-key/blur test may have legitimately moved beyond interaction range.
  await walkExteriorTo(page, { x: 32, z: -15 });
  await page
    .getByRole('button', { name: 'Open settings and help (H)' })
    .click();
  await expect(page.locator(button)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator(button)).toBeVisible();
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run(
            element: HTMLElement,
            options: object
          ): Promise<{ violations: { id: string }[] }>;
        };
      }
    ).axe;
    return (
      await axe.run(document.querySelector('#app')!, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      })
    ).violations.map((v) => v.id);
  });
  expect(violations).toEqual([]);
});

test('continues native controls from focused door and dismissed settings buttons', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await readyExterior(page);
  await walkExteriorTo(page, { x: 29, z: -15 });
  await page.locator(button).click();
  await waitDoor(page, 'front-door', 'open');
  await expect(page.locator(button)).toBeFocused();
  await page.keyboard.press('KeyH');
  const modal = page.locator('.help-modal-backdrop');
  await expect(modal).toBeVisible();
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(300);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  expect(
    await page.evaluate(() => window.portfolio!.world!.getPlayerPosition())
  ).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  for (const fromDoorButton of [false, true]) {
    if (!fromDoorButton) {
      const settings = page.getByRole('button', {
        name: 'Open settings and help (H)',
      });
      await settings.click();
      await expect(modal).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(modal).toBeHidden();
      await expect(settings).toBeFocused();
    }
    if (fromDoorButton) {
      await walkExteriorTo(page, { x: 29, z: -15 });
      await page.locator(button).focus();
      await page.evaluate(() =>
        window.portfolio!.input!.keyBindings!.setBinding('interact', ['k'])
      );
      await page.keyboard.press('KeyK');
      await waitDoor(page, 'front-door', 'closed');
      await page.keyboard.press('KeyK');
      await waitDoor(page, 'front-door', 'open');
    }
    await crossFrontDoorWithNativeChord(
      page,
      fromDoorButton ? 'remapped-door-button' : 'dismissed-settings-button'
    );
    await page.waitForTimeout(300);
  }
  await walkExteriorTo(page, { x: 29, z: -15 });
  await expect(page.locator(button)).toBeVisible();
  await page.locator(button).focus();
  await expect(page.locator(button)).toBeFocused();
  await page.keyboard.press('KeyT');
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
});

test('keeps a long pseudo-locale door label onscreen and ignores native activation repeats', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await readyExterior(page);
  await page.locator('[data-control="help"]').click();
  await page
    .locator('.locale-toggle__option[data-locale="en-x-pseudo"]')
    .click();
  await page.keyboard.press('Escape');
  await walkExteriorTo(page, { x: 29, z: -15 });
  const control = page.locator(button);
  await expect(control).toBeVisible();
  const bounds = (await control.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(568);
  await control.focus();
  await page.keyboard.down('Enter');
  for (let repeat = 0; repeat < 3; repeat++) await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await waitDoor(page, 'front-door', 'open');
  expect(
    await page.evaluate(
      () => window.portfolio!.world!.getDoorSnapshots()[0].target
    )
  ).toBe(1);
  await control.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#app canvas')).toBeFocused();
  await page.screenshot({
    path: test.info().outputPath('front-door-pseudo-label.png'),
  });
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 720 },
  { width: 844, height: 390 },
  { width: 1920, height: 1080 },
]) {
  test(`door control fits ${viewport.width}×${viewport.height} and restores safe closed state on reload`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await readyExterior(page);
    await walkExteriorTo(page, { x: 29, z: -15 });
    await expect(page.locator(button)).toBeVisible();
    const bounds = (await page.locator(button).boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    await page.locator(button).click();
    await waitDoor(page, 'front-door', 'open');
    await readyExterior(page);
    expect(
      await page.evaluate(() => window.portfolio!.world!.getDoorSnapshots()[0])
    ).toMatchObject({ state: 'closed', progress: 0 });
    expect(
      await page.evaluate(() => window.portfolio!.world!.getPlayerPosition())
    ).toMatchObject({ x: 0, y: 0 });
  });
}

test('opens once by touch and crosses both ways using the phone joystick', async ({
  browser,
}) => {
  test.setTimeout(120000);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await readyExterior(page);
  await walkExteriorTo(page, { x: 29, z: -15 });
  await page.locator(button).tap();
  await waitDoor(page, 'front-door', 'open');
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(
      () => window.portfolio!.world!.getDoorSnapshots()[0].target
    )
  ).toBe(1);
  const session = await context.newCDPSession(page);
  for (const direction of [1, -1]) {
    const origin = { x: 100, y: 560 };
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [origin],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: origin.x + direction * 48, y: origin.y + direction * 48 },
      ],
    });
    try {
      await page.waitForFunction(
        ({ direction }) => {
          const x = window.portfolio!.world!.getPlayerPosition().x;
          return direction > 0 ? x >= 35 : x <= 29;
        },
        { direction },
        { timeout: 15000, polling: 'raf' }
      );
    } finally {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    }
    await page.waitForTimeout(500);
    expect(
      await page.evaluate(() => window.portfolio!.world!.getActiveFloor())
    ).toBe('ground');
  }
  await page.screenshot({
    path: test.info().outputPath('front-entry-touch-roundtrip.png'),
  });
  await context.close();
});
