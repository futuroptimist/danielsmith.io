import { expect, test } from '@playwright/test';

import { FLOOR_PLAN } from '../src/assets/floorPlan';

const url = '/?mode=immersive&disablePerformanceFailover=1';
const interiorRoomCount = FLOOR_PLAN.rooms.filter(
  (room) => room.category !== 'exterior'
).length;

test('decorative lighting survives quality round trips without leaking point lights', async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('decorative-lighting-test-started')) {
      localStorage.setItem('danielsmith:graphics-quality-level', 'performance');
      sessionStorage.setItem('decorative-lighting-test-started', '1');
    }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  for (const [index, level] of [
    'performance',
    'balanced',
    'performance',
    'cinematic',
    'performance',
  ].entries()) {
    if (index > 0) {
      await Promise.all([
        page.waitForEvent('domcontentloaded'),
        page.evaluate(
          (level) => window.portfolio!.graphics!.setLevel!(level),
          level
        ),
      ]);
    }
    await page.waitForFunction(
      (level) =>
        document.documentElement.dataset.appMode === 'immersive' &&
        window.portfolio?.graphics?.getLevel?.() === level &&
        !!window.portfolio?.graphics?.getDecorativeLightingState,
      level,
      { timeout: 45_000 }
    );
    const safe = page.locator('[data-action="continue-safe-immersive"]');
    if (await safe.isVisible()) await safe.click();
    const state = await page.evaluate(() =>
      window.portfolio!.graphics!.getDecorativeLightingState!()
    );
    const enabled = level !== 'performance';
    expect(state.ledPointLights).toBe(enabled ? interiorRoomCount * 5 : 0);
    expect(state.visibleLedPointLights).toBe(state.ledPointLights);
    expect(state.gabrielPointLights).toBe(enabled ? 1 : 0);
    expect(state.visibleGabrielPointLights).toBe(state.gabrielPointLights);
    expect(state.emissiveLedMaterials).toBe(interiorRoomCount);
    expect(state.gabrielBeaconEmissiveIntensity).toBeGreaterThan(0);
    await expect(page.locator('#app canvas')).toHaveCount(1);
    for (const pose of [
      { name: 'main-house', x: -15, z: -20, floorId: 'ground' as const },
      { name: 'gabriel-studio', x: -17, z: -11, floorId: 'upper' as const },
    ]) {
      await page.evaluate(
        (pose) => window.portfolio!.world!.movePlayerTo(pose),
        pose
      );
      await page.waitForTimeout(600);
      await page.screenshot({
        path: test
          .info()
          .outputPath(`decorative-lighting-${index}-${level}-${pose.name}.png`),
      });
    }
    await test.info().attach(`lighting-${index}-${level}`, {
      body: JSON.stringify(state),
      contentType: 'application/json',
    });
  }
});
