import { expect, test } from '@playwright/test';

import {
  AVATAR_RUN_SPEED,
  AVATAR_WALK_SPEED,
} from '../src/systems/movement/avatarGait';

const url = '/?mode=immersive&disablePerformanceFailover=1';
for (const level of ['performance', 'balanced', 'cinematic']) {
  test(`metric avatar and one gait across input combinations (${level})`, async ({
    page,
  }, testInfo) => {
    // CI software WebGL takes several seconds per browser call at higher tiers.
    // Budget for the complete input matrix without relaxing its assertions.
    test.setTimeout(240_000);
    await page.goto(url);
    await page.waitForFunction(() => Boolean(window.portfolio?.graphics));
    const current = await page.evaluate(() =>
      window.portfolio!.graphics!.getLevel()
    );
    if (current !== level) {
      await Promise.all([
        page.waitForEvent('load'),
        page.evaluate(
          (next) => window.portfolio!.graphics!.setLevel(next as 'performance'),
          level
        ),
      ]);
    }
    await page.waitForFunction(
      () =>
        (
          window.portfolio?.avatar?.getAnimationState?.() as {
            loaded?: boolean;
          }
        )?.loaded
    );
    await page.keyboard.press('Escape');
    const notice = page.locator('[data-action="continue-safe-immersive"]');
    if (await notice.isVisible()) await notice.click();
    const snapshot = () =>
      page.evaluate(
        () =>
          window.portfolio!.avatar!.getAnimationState!() as {
            height: number;
            locomotion: { linearState: string; linearSpeed: number };
          }
      );
    expect((await snapshot()).height).toBeCloseTo(1.9, 6);
    const gaitButton = page.locator('[data-avatar-gait-control]');
    // Use native browser activation: Enter clicks on keydown, Space on keyup.
    for (const activation of ['Enter', 'Space']) {
      await gaitButton.focus();
      await page.keyboard.press(activation);
      expect(
        await page.evaluate(() => window.portfolio!.avatar!.getGait!())
      ).toBe('walk');
      await page.keyboard.press('Shift');
      expect(
        await page.evaluate(() => window.portfolio!.avatar!.getGait!())
      ).toBe('run');
    }
    for (const caps of [false, true]) {
      for (const shifted of [false, true]) {
        await page.evaluate(
          ({ caps, shifted }) => {
            window.portfolio!.world!.movePlayerTo({
              x: 40,
              z: -22,
              floorId: 'ground',
            });
            window.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: shifted ? 'W' : 'w',
                code: 'KeyW',
                shiftKey: shifted,
                modifierCapsLock: caps,
                bubbles: true,
              })
            );
          },
          { caps, shifted }
        );
        try {
          const speed = caps ? AVATAR_WALK_SPEED : AVATAR_RUN_SPEED;
          // Sample speed and blend together: slow software rendering can let the
          // player reach an obstacle between separate browser round trips.
          await expect(async () => {
            const { locomotion } = await snapshot();
            expect(locomotion.linearSpeed).toBeGreaterThan(speed * 0.95);
            expect(locomotion.linearSpeed).toBeLessThan(speed * 1.01);
            expect(locomotion.linearState).toBe(caps ? 'walk' : 'run');
          }).toPass({ timeout: 30_000 });
          expect(
            await page.evaluate(() => window.portfolio!.avatar!.getGait!())
          ).toBe(caps ? 'walk' : 'run');
        } finally {
          await page.evaluate(
            (caps) =>
              window.dispatchEvent(
                new KeyboardEvent('keyup', {
                  key: 'w',
                  code: 'KeyW',
                  modifierCapsLock: caps,
                })
              ),
            caps
          );
        }
        await expect
          .poll(async () => (await snapshot()).locomotion.linearState, {
            timeout: 30_000,
          })
          .toBe('idle');
      }
    }
    await page.screenshot({
      path: testInfo.outputPath(`metric-avatar-${level}.png`),
    });
  });
}
