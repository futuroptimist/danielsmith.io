import { expect, test } from '@playwright/test';

const url = '/?mode=immersive&disablePerformanceFailover=1';
for (const level of ['performance', 'balanced', 'cinematic']) {
  test(`metric avatar and one gait across input combinations (${level})`, async ({
    page,
  }, testInfo) => {
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
          const speed = caps ? 1.116452991 : 2.537393162;
          await expect
            .poll(async () => (await snapshot()).locomotion.linearSpeed)
            .toBeGreaterThan(speed * 0.95);
          expect((await snapshot()).locomotion.linearSpeed).toBeLessThan(
            speed * 1.01
          );
          await expect
            .poll(async () => (await snapshot()).locomotion.linearState)
            .toBe(caps ? 'walk' : 'run');
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
          .poll(async () => (await snapshot()).locomotion.linearState)
          .toBe('idle');
      }
    }
    await page.screenshot({
      path: testInfo.outputPath(`metric-avatar-${level}.png`),
    });
  });
}
