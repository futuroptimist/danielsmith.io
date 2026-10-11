import { expect, test } from '@playwright/test';

test('aquarium approach, collision, accessible pause and property budgets', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?mode=immersive&disablePerformanceFailover=1');
  await page.waitForFunction(
    () => !!window.portfolio?.world?.getMiniatureSnapshot?.()
  );
  const safe = page.locator('[data-action="continue-safe-immersive"]');
  if (await safe.isVisible()) await safe.click();
  await page.evaluate(() =>
    window.portfolio!.world!.movePlayerTo({ x: -4, z: -26 })
  );
  const route = await page.evaluate(() => {
    const world = window.portfolio!.world!;
    for (let i = 0; i < 40; i++) {
      const result = world.stepPlayerForTest({ dx: 0.1, dz: 0 });
      if (!result.movedX) return false;
    }
    return true;
  });
  expect(route).toBe(true);
  const controls = page.getByRole('region', {
    name: 'Aquiloop · visual simulation',
  });
  await expect(controls).toBeVisible();
  const pause = controls.getByRole('button', { name: 'Pause aquarium cycle' });
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(
    controls.getByRole('button', { name: 'Resume aquarium cycle' })
  ).toHaveAttribute('aria-pressed', 'true');
  const snapshot = await page.evaluate(
    () => window.portfolio!.world!.getMiniatureSnapshot!()!
  );
  expect(snapshot.triangles).toBeLessThan(40000);
  expect(snapshot.drawCalls).toBeLessThanOrEqual(64);
  expect(snapshot.sourceNames).toContain('aquiloop-steel-parts');
  await test.info().attach('combined-miniature-budget', {
    body: JSON.stringify({
      triangles: snapshot.triangles,
      batches: snapshot.drawCalls,
    }),
    contentType: 'application/json',
  });
  await page.locator('#app canvas').focus();
  await page.keyboard.press('KeyE', { delay: 200 });
  await expect(
    page.locator(
      '.poi-tooltip-overlay a[href="https://github.com/futuroptimist/aquiloop"]'
    )
  ).toBeVisible();
  const position = await page.evaluate(() => {
    const world = window.portfolio!.world!;
    for (let i = 0; i < 30; i++) world.stepPlayerForTest({ dx: 0, dz: -0.1 });
    return world.getPlayerPosition();
  });
  expect(position.z).toBeGreaterThan(-27.7);
  await page.screenshot({
    path: test.info().outputPath('aquiloop-living-room.png'),
  });
});

test('text portfolio exposes Aquiloop repository and visual-only explanation', async ({
  page,
}) => {
  await page.goto('/?mode=text');
  await expect(
    page
      .getByRole('link', { name: 'GitHub repository' })
      .filter({ hasText: 'GitHub repository' })
      .first()
  ).toBeVisible();
  await expect(
    page.locator('a[href="https://github.com/futuroptimist/aquiloop"]')
  ).toBeVisible();
  await expect(page.getByText(/A 150-gallon planted aquarium/)).toBeVisible();
});
