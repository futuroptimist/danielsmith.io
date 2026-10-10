import { expect, test } from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`property table and corner shrub (${reducedMotion})`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/?mode=immersive&disablePerformanceFailover=1');
    await page.waitForFunction(
      () => !!window.portfolio?.world?.getMiniatureSnapshot?.(),
      undefined,
      { timeout: 45000 }
    );
    const safe = page.getByRole('button', {
      name: 'Continue in safe immersive',
      exact: true,
    });
    if (await safe.isVisible()) await safe.click();
    await page.evaluate(() =>
      window.portfolio!.world!.movePlayerTo({ x: -18, z: 1.63 })
    );
    await expect
      .poll(() =>
        page.evaluate(
          () => window.portfolio!.world!.getMiniatureSnapshot!()!.player[0]
        )
      )
      .toBe(-18);
    const snapshot = await page.evaluate(
      () => window.portfolio!.world!.getMiniatureSnapshot!()!
    );
    expect(snapshot.triangles).toBeLessThan(40000);
    expect(snapshot.drawCalls).toBeLessThanOrEqual(64);
    expect(snapshot.bounds.max[0]).toBeGreaterThan(75);
    expect(snapshot.bounds.min[1]).toBeLessThanOrEqual(-5);
    expect(snapshot.sourceNames).toContain('BackyardGalvanizedTub');
    expect(
      snapshot.sourceNames.filter((name) => name === 'StaircaseStep-9')
    ).toHaveLength(2);
    const tableImage = await page.screenshot({
      path: testInfo.outputPath('property-table.png'),
    });
    const visibleModelPixels = await page.evaluate(async (encoded) => {
      const image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(180, 60, 500, 280).data;
      let colored = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const channels = [pixels[i], pixels[i + 1], pixels[i + 2]];
        if (
          Math.max(...channels) - Math.min(...channels) > 12 &&
          Math.max(...channels) > 25 &&
          Math.max(...channels) < 180
        )
          colored++;
      }
      return colored;
    }, tableImage.toString('base64'));
    expect(visibleModelPixels).toBeGreaterThan(300);
    // The table remains keyboard discoverable, with a normal accessible tooltip.
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('KeyE');
      if (
        (await page.locator('.poi-tooltip-overlay__title').textContent()) ===
        'danielsmith.io'
      )
        break;
    }
    await expect(page.locator('.poi-tooltip-overlay__title')).toHaveText(
      'danielsmith.io'
    );
    await page.keyboard.press('Escape');
    for (const stride of [0.08, 0.18]) {
      const result = await page.evaluate((stride) => {
        const world = window.portfolio!.world!;
        world.movePlayerTo({ x: 26, z: 26.9, floorId: 'ground' });
        for (let i = 0; i < 80; i++)
          world.stepPlayerForTest({ dx: stride, dz: 0 });
        return {
          position: world.getPlayerPosition(),
          inside: world.canOccupyPosition({
            x: 30.6,
            z: 26.9,
            floorId: 'ground',
          }),
        };
      }, stride);
      expect(result.inside).toBe(false);
      expect(result.position.x).toBeLessThan(29.4);
      expect(result.position.x).toBeGreaterThan(27.5);
    }
    await page.evaluate(() =>
      window.portfolio!.world!.movePlayerTo({ x: 16, z: 24, floorId: 'ground' })
    );
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: testInfo.outputPath('solar-frame-and-shrub.png'),
    });
  });
}
