import { readFileSync, writeFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';
import { source as axeSource } from 'axe-core';

import { EXTERIOR_LOCALE_COPY } from '../src/assets/i18n/exterior';
import type { StreetSnapshot } from '../src/scene/structures/residentialStreet';

import {
  injectExteriorInitializationFailure,
  readExteriorFailureSnapshot,
} from './helpers/exteriorFailure';
import {
  readyExterior,
  waitDoor,
  walkExteriorTo,
} from './helpers/exteriorJourney';

const stop = '[data-bus-stop-id="residential-bus-stop"]';
for (const mode of ['handler', 'throw'] as const) {
  for (const phase of ['build', 'controls'] as const) {
    test(`releases street resources after a ${mode} ${phase} initialization failure`, async ({
      page,
    }) => {
      await injectExteriorInitializationFailure(page, phase, mode, 'street');
      await page.goto('/?mode=immersive&disablePerformanceFailover=1', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('html')).toHaveAttribute(
        'data-app-mode',
        'fallback'
      );
      const snapshot = await readExteriorFailureSnapshot(page);
      await test.info().attach(`partial-street-${mode}-${phase}.json`, {
        body: JSON.stringify(snapshot, null, 2),
        contentType: 'application/json',
      });
      expect(snapshot.lifecycle.isDisposed).toBe(true);
      expect(snapshot.expected).toMatchObject({
        geometries: 7,
        materials: 11,
        textures: 1,
        lights: 4,
      });
      expect(snapshot.expected.instances).toBeGreaterThan(0);
      expect(snapshot.disposed).toEqual(snapshot.expected);
      expect(snapshot.groupAttached).toBe(false);
      expect(snapshot.controlsRemaining).toBe(0);
      expect(snapshot.worldAvailable).toBe(false);
      expect(snapshot.rendererDisposals).toBe(1);
      const allocated = phase === 'controls' ? 2 : 0;
      expect(snapshot.controlsAllocated).toBe(allocated);
      expect(snapshot.listeners).toEqual({
        keyAdded: allocated,
        keyRemoved: allocated,
        blurAdded: Number(allocated > 0),
        blurRemoved: Number(allocated > 0),
        resizeAdded: allocated,
        resizeRemoved: allocated,
      });
      await page.evaluate(() =>
        (
          window as unknown as { repeatExteriorFailure(): void }
        ).repeatExteriorFailure()
      );
      expect(await readExteriorFailureSnapshot(page)).toEqual(snapshot);
    });
  }
}

for (const mode of ['throw-cleanup', 'async-cleanup'] as const) {
  test(`preserves street cleanup and renderer fallback after ${mode}`, async ({
    page,
  }) => {
    await injectExteriorInitializationFailure(page, 'controls', mode, 'street');
    await page.goto('/?mode=immersive&disablePerformanceFailover=1', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    const snapshot = await readExteriorFailureSnapshot(page);
    await test.info().attach(`street-disposer-${mode}.json`, {
      body: JSON.stringify(snapshot, null, 2),
      contentType: 'application/json',
    });
    expect(snapshot.cleanupFailures).toBe(1);
    expect(snapshot.rendererDisposals).toBe(1);
    expect(snapshot.lifecycle.isDisposed).toBe(true);
    expect(snapshot.expected).toMatchObject({
      geometries: 7,
      materials: 11,
      textures: 1,
      lights: 4,
    });
    expect(snapshot.disposed).toEqual(snapshot.expected);
    expect(snapshot.controlsAllocated).toBe(2);
    expect(snapshot.controlsRemaining).toBe(0);
    expect(snapshot.groupAttached).toBe(false);
    expect(snapshot.worldAvailable).toBe(false);
    expect(snapshot.listeners).toEqual({
      keyAdded: 2,
      keyRemoved: 2,
      blurAdded: 1,
      blurRemoved: 1,
      resizeAdded: 2,
      resizeRemoved: 2,
    });
  });
}

async function exitHouse(page: Page) {
  await walkExteriorTo(page, { x: 29, z: -15 });
  await page
    .locator('[data-exterior-door-control][data-door-id="front-door"]')
    .click();
  await waitDoor(page, 'front-door', 'open');
  await walkExteriorTo(page, { x: 55, z: -15 });
}
async function reachStop(page: Page) {
  await exitHouse(page);
  await walkExteriorTo(page, { x: 55, z: 32 });
  await expect(page.locator(stop)).toBeVisible();
}
async function nativeZ(page: Page, target: number, positive: boolean) {
  await page.locator('#app canvas').focus();
  // One native chord keeps the two keydowns together despite software-renderer
  // trace/snapshot latency between separate Playwright API calls.
  const chord = positive ? 'KeyS+KeyA' : 'KeyW+KeyD';
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const position = await page.evaluate(() =>
      window.portfolio!.world!.getPlayerPosition()
    );
    if (positive ? position.z >= target : position.z <= target) return;
    await page.keyboard.press(chord, { delay: 160 });
    await page.waitForTimeout(100);
  }
  const diagnostics = await page.evaluate(() => {
    const world = window.portfolio!.world!;
    const position = world.getPlayerPosition();
    return {
      position,
      floor: world.getActiveFloor(),
      camera: world.getCameraState(),
      blockers: window.portfolio!.debugColliders!.getBlockingCollidersAt({
        ...position,
        z: position.z + 0.3,
        floorId: 'ground',
      }),
    };
  });
  throw new Error(
    `Native sidewalk movement stalled: ${JSON.stringify(diagnostics)}`
  );
}

const streetCaseTitle1 =
  'records a fresh-spawn renderer smoke snapshot without ' +
  'claiming a hardware performance gate';
test(streetCaseTitle1, async ({ page }) => {
  await readyExterior(page);
  await page.waitForTimeout(2000);
  const snapshot = await page.evaluate(() => {
    const p = window.portfolio!;
    const d = p.performance!.getSnapshot();
    return {
      counters: d.rendererCounters,
      renderer: {
        isSoftwareRenderer: d.renderer.isSoftwareRenderer,
        riskLevel: d.renderer.riskLevel,
      },
      camera: p.world!.getCameraState(),
      floor: p.world!.getActiveFloor(),
    };
  });
  writeFileSync(
    test.info().outputPath('fresh-spawn-renderer-smoke.json'),
    JSON.stringify(snapshot, null, 2)
  );
  await test.info().attach('fresh-spawn-renderer-smoke.json', {
    body: JSON.stringify(
      {
        snapshot,
        limits: {
          calls: 150,
          triangles: 50000,
          geometries: 125,
          textures: 32,
        },
        limitation:
          'Ad-hoc software-WebGL fresh-spawn snapshot; formal performance ' +
          'suite and hardware timing remain independent.',
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
  expect(snapshot.counters.calls).toBeLessThanOrEqual(150);
  expect(snapshot.counters.triangles).toBeLessThanOrEqual(50000);
  expect(snapshot.counters.memoryGeometries).toBeLessThanOrEqual(125);
  expect(snapshot.counters.memoryTextures).toBeLessThanOrEqual(32);
  await page.screenshot({
    path: test.info().outputPath('street-stage-fresh-spawn.png'),
  });
});

const streetCaseTitle2 =
  'walks from the house along the sidewalk to the stop and ' +
  'around a genuinely solid parked sedan';
test(streetCaseTitle2, async ({ page }) => {
  test.setTimeout(150000);
  await readyExterior(page);
  await exitHouse(page);
  await walkExteriorTo(page, { x: 61, z: -20 });
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.locator('#app canvas').focus();
  await page.keyboard.down('KeyS');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2200);
  await page.keyboard.up('KeyS');
  await page.keyboard.up('KeyD');
  await page.waitForTimeout(400);
  const stopped = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  expect(stopped.x).toBeGreaterThan(before.x);
  expect(stopped.x).toBeLessThan(63.05);
  expect(
    await page.evaluate(() =>
      window.portfolio!.world!.canOccupyPosition({
        x: 66,
        z: -20,
        floorId: 'ground',
      })
    )
  ).toBe(false);
  await page.screenshot({
    path: test.info().outputPath('parked-original-ev.png'),
  });
  await walkExteriorTo(page, { x: 72, z: -14 });
  const boundaries = await page.evaluate(() =>
    [
      { x: 80, z: 0 },
      { x: 70, z: 40 },
      { x: 70, z: -36 },
      { x: 45, z: 40 },
    ].map((point) => ({
      point,
      canOccupy: window.portfolio!.world!.canOccupyPosition({
        ...point,
        floorId: 'ground',
      }),
      blockers: window
        .portfolio!.debugColliders!.getBlockingCollidersAt({
          ...point,
          floorId: 'ground',
        })
        .map((collider) => collider.sourceId),
    }))
  );
  for (const boundary of boundaries) {
    expect(boundary.canOccupy).toBe(false);
    expect(boundary.blockers.length).toBeGreaterThan(0);
  }

  await walkExteriorTo(page, { x: 55, z: 23 });
  await nativeZ(page, 31.8, true);
  // Reproducible normal-view sign pose after native traversal.
  await walkExteriorTo(page, { x: 55, z: 32 });
  await expect(page.locator(stop)).toBeVisible();
  const snapshot = await page.evaluate(() =>
    window.portfolio!.world!.getStreetSnapshot()
  );
  expect(snapshot.lamps).toHaveLength(4);
  for (const lamp of snapshot.lamps) {
    expect(lamp.position.x).toBe(lamp.target.x);
    expect(lamp.position.z).toBe(lamp.target.z);
    expect(lamp.position.y).toBeGreaterThan(lamp.target.y);
    expect(lamp.angle).toBeLessThan(Math.PI / 2);
    expect(lamp.hoodOpaque).toBe(true);
    expect(lamp.castShadow).toBe(false);
  }
  await page.screenshot({
    path: test.info().outputPath('street-bus-stop-normal-view.png'),
  });
  await page.locator('#app canvas').focus();
  for (let i = 0; i < 30; i++) await page.keyboard.press('Shift+Minus');
  await page.waitForTimeout(700);
  const minimumZoom = await page.evaluate(
    () => window.portfolio!.world!.getCameraState().zoom
  );
  expect(minimumZoom).toBeCloseTo(0.65, 2);
  writeFileSync(
    test.info().outputPath('street-minimum-camera.json'),
    JSON.stringify(
      await page.evaluate(() => window.portfolio!.world!.getCameraState()),
      null,
      2
    )
  );
  await page.screenshot({
    path: test.info().outputPath('street-minimum-zoom.png'),
  });
  for (let i = 0; i < 30; i++) await page.keyboard.press('Shift+Equal');
  await page.waitForTimeout(700);
  expect(
    await page.evaluate(() => window.portfolio!.world!.getCameraState().zoom)
  ).toBeCloseTo(12, 1);
  writeFileSync(
    test.info().outputPath('street-maximum-camera.json'),
    JSON.stringify(
      await page.evaluate(() => window.portfolio!.world!.getCameraState()),
      null,
      2
    )
  );
  await page.screenshot({
    path: test.info().outputPath('street-maximum-zoom.png'),
  });
  for (let i = 0; i < 9; i++) await page.keyboard.press('Shift+Minus');
  await walkExteriorTo(page, { x: 50, z: 32 });
  await page.screenshot({
    path: test.info().outputPath('shelter-interior-cutaway.png'),
  });
  await walkExteriorTo(page, { x: 55, z: 32 });
  await nativeZ(page, 23, false);
  await walkExteriorTo(page, { x: 55, z: -15 });
  await walkExteriorTo(page, { x: 0, z: -20 });
  expect(
    await page.evaluate(() => window.portfolio!.world!.getActiveFloor())
  ).toBe('ground');
});

const streetCaseTitle3 =
  'keeps Coming Soon informational through native repeats, ' +
  'dismissal, settings, range changes and accessibility checks';
test(streetCaseTitle3, async ({ page }) => {
  test.setTimeout(150000);
  await readyExterior(page);
  await reachStop(page);
  const button = page.locator(`${stop} button`);
  await expect(button).toHaveAccessibleName('Bus stop: Coming Soon');
  const url = page.url();
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await button.focus();
  await page.keyboard.down('Enter');
  for (let i = 0; i < 3; i++) await page.keyboard.down('Enter');
  await page.keyboard.up('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`${stop} p`)).toHaveText(
    EXTERIOR_LOCALE_COPY.en.busStopMessage
  );
  expect(page.url()).toBe(url);
  expect(
    await page.evaluate(() => window.portfolio!.world!.getPlayerPosition())
  ).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#app canvas')).toBeFocused();
  await button.focus();
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Escape');
  await page.keyboard.down('KeyF');
  await page.keyboard.down('KeyF');
  await page.keyboard.up('KeyF');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.locator('[data-control="help"]').click();
  await expect(page.locator(stop)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () =>
    (
      await (
        window as unknown as {
          axe: {
            run(
              element: HTMLElement,
              options: object
            ): Promise<{ violations: { id: string }[] }>;
          };
        }
      ).axe.run(document.querySelector('#app')!, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      })
    ).violations.map((v) => v.id)
  );
  expect(violations).toEqual([]);
  await walkExteriorTo(page, { x: 55, z: 22 });
  await expect(page.locator(stop)).toBeHidden();
});

for (const key of ['w', 'h']) {
  test(`keeps conflicting ${key} input from activating the bus stop`, async ({
    page,
  }) => {
    await readyExterior(page);
    await reachStop(page);
    const button = page.locator(`${stop} button`);
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.help-modal-backdrop')).toHaveCount(1);
    await page.evaluate((binding) => {
      window.portfolio!.input!.keyBindings!.setBinding('interact', [binding]);
    }, key);
    await page.locator('#app canvas').focus();
    const before = await page.evaluate(() =>
      window.portfolio!.world!.getPlayerPosition()
    );
    await page.keyboard.press(key, { delay: 400 });
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    if (key === 'w') {
      await expect(page.locator('.help-modal-backdrop')).toBeHidden();
      const after = await page.evaluate(() =>
        window.portfolio!.world!.getPlayerPosition()
      );
      expect(
        Math.hypot(after.x - before.x, after.z - before.z)
      ).toBeGreaterThan(0.25);
    } else {
      await expect(page.locator('.help-modal-backdrop')).toBeVisible();
    }
  });
}

const streetCaseTitle4 =
  'uses all nine native locale choices for the world sign, ' +
  'disclosure and text alternative';
test(streetCaseTitle4, async ({ page }) => {
  test.setTimeout(300000);
  for (const [locale, strings] of Object.entries(EXTERIOR_LOCALE_COPY)) {
    await readyExterior(page);
    await page.locator('[data-control="help"]').click();
    await page
      .locator(`.locale-toggle__option[data-locale="${locale}"]`)
      .click();
    await page.keyboard.press('Escape');
    await reachStop(page);
    await expect(page.locator(`${stop} button`)).toHaveText(
      `${strings.busStop}: ${strings.comingSoon}`
    );
    expect(
      (await page.evaluate(() => window.portfolio!.world!.getStreetSnapshot()))
        .busStop.signText
    ).toBe(`${strings.busStop} · ${strings.comingSoon}`);
    await page.locator(`${stop} button`).click();
    await expect(page.locator(`${stop} p`)).toHaveText(strings.busStopMessage);
    await page.keyboard.press('Escape');
    await page.keyboard.press('KeyT');
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(page.locator(stop)).toHaveAttribute(
      'data-availability',
      'coming-soon'
    );
    await expect(page.locator(`${stop} p`)).toHaveText(strings.busStopMessage);
  }
});

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
  { width: 360, height: 720 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
])
  test(`keeps street and stop usable at ${viewport.width}x${viewport.height}`, async ({
    browser,
  }) => {
    test.setTimeout(150000);
    const context = await browser.newContext({
      viewport,
      hasTouch: true,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await readyExterior(page);
    if (viewport.width <= 360 || viewport.height === 390) {
      await page.locator('[data-control="help"]').click();
      await page
        .locator('.locale-toggle__option[data-locale="en-x-pseudo"]')
        .click();
      await page.keyboard.press('Escape');
    }
    await reachStop(page);
    const control = page.locator(stop);
    await control.locator('button').tap();
    await expect(control.locator('button')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    const bounds = (await control.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({
      path: test.info().outputPath('street-mobile-disclosure.png'),
    });
    await control.locator('button').tap();
    await expect(control.locator('button')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    if (viewport.width === 390) {
      const session = await context.newCDPSession(page);
      const origin = { x: 120, y: 620 };
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [origin],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 168, y: 572 }],
      });
      try {
        await page.waitForFunction(
          () => window.portfolio!.world!.getPlayerPosition().z < 26,
          undefined,
          { timeout: 15000 }
        );
      } finally {
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        });
      }
      await expect(control).toBeHidden();
    }
    await context.close();
  });

const streetCaseTitle5 =
  'releases street resources on text transition and recreates ' +
  'a bounded fresh street on re-entry';
test(streetCaseTitle5, async ({ page }) => {
  test.setTimeout(150000);
  await readyExterior(page);
  await reachStop(page);
  const first = await page.evaluate(
    () => window.portfolio!.world!.getStreetSnapshot().lifecycle
  );
  await page.evaluate(() => {
    (window as unknown as { oldStreet: () => StreetSnapshot }).oldStreet =
      window.portfolio!.world!.getStreetSnapshot;
  });
  await page.locator('#app canvas').focus();
  await page.keyboard.press('KeyT');
  await expect(page.locator('#app canvas')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { oldStreet: () => StreetSnapshot }).oldStreet()
          .lifecycle.isDisposed
    )
  ).toBe(true);
  await page.locator('[data-action="immersive"]').click();
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.appMode === 'immersive' &&
      !!window.portfolio?.world?.getStreetSnapshot
  );
  expect(
    await page.evaluate(
      () => window.portfolio!.world!.getStreetSnapshot().lifecycle
    )
  ).toEqual(first);
  await reachStop(page);
  await expect(page.locator(`${stop} button`)).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

// The diagram is generated from the same source-owned wall apertures and boundaries.
test('renders the source-authored ground-floor diagram for visual review', async ({
  page,
}) => {
  await page.setContent(
    `<body style="margin:0">${readFileSync('docs/assets/floorplan-ground.svg', 'utf8')}</body>`
  );
  await page.locator('svg').evaluate((svg) => {
    svg.style.width = '1200px';
    svg.style.height = 'auto';
  });
  await page.screenshot({
    path: test.info().outputPath('street-ground-floorplan.png'),
    fullPage: true,
    timeout: 10000,
  });
});
