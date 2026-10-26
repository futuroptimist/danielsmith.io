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
    expect((await snapshot()).height).toBeCloseTo(2.85, 6);
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
        const speed = caps ? AVATAR_WALK_SPEED : AVATAR_RUN_SPEED;
        // Capture in browser animation frames so slow protocol/trace snapshots
        // cannot leave the faster avatar running into a wall before sampling.
        const sample = await page.evaluate(
          async ({ caps, shifted, speed }) => {
            const avatar = window.portfolio!.avatar!;
            const read = () => ({
              state: avatar.getAnimationState!() as {
                locomotion: { linearState: string; linearSpeed: number };
              },
              gait: avatar.getGait!(),
            });
            window.portfolio!.world!.movePlayerTo({
              x: 40 * Math.SQRT1_2,
              z: -22 * Math.SQRT1_2,
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
            try {
              const deadline = performance.now() + 30_000;
              let sample = read();
              do {
                await new Promise<void>((resolve) =>
                  requestAnimationFrame(() => resolve())
                );
                sample = read();
                if (
                  sample.state.locomotion.linearSpeed > speed * 0.95 &&
                  sample.state.locomotion.linearState ===
                    (caps ? 'walk' : 'run')
                )
                  break;
              } while (performance.now() < deadline);
              return sample;
            } finally {
              window.dispatchEvent(
                new KeyboardEvent('keyup', {
                  key: 'w',
                  code: 'KeyW',
                  modifierCapsLock: caps,
                })
              );
            }
          },
          { caps, shifted, speed }
        );
        expect(sample.state.locomotion.linearSpeed).toBeGreaterThan(
          speed * 0.95
        );
        expect(sample.state.locomotion.linearSpeed).toBeLessThan(speed * 1.01);
        expect(sample.state.locomotion.linearState).toBe(caps ? 'walk' : 'run');
        expect(sample.gait).toBe(caps ? 'walk' : 'run');
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
