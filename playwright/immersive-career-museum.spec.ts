import { mkdir, writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';
import { source as axeSource } from 'axe-core';
import type { AxeResults } from 'axe-core';

import { CAREER_HISTORY } from '../src/assets/careers';
import { AVAILABLE_LOCALES, getCareerCopy } from '../src/assets/i18n';
import { IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET } from '../src/assets/performance';

const URL = '/?mode=immersive&disablePerformanceFailover=1';
const DISCLAIMER =
  'This is my personal portfolio. The views and content here are my own and do not represent Muon Space.';
const APPROACHES = [
  {
    id: 'career-southern-mississippi',
    title: 'Southern Mississippi',
    path: [
      { x: -24, z: -32.5 },
      { x: -24, z: -15.5 },
      { x: -18, z: -15.5 },
    ],
  },
  {
    id: 'career-naval-research',
    title: 'Naval Research Laboratory',
    path: [
      { x: -24, z: -15.5 },
      { x: -24, z: 4.5 },
      { x: -18, z: 4.5 },
    ],
  },
  { id: 'career-youtube', title: 'YouTube', path: [{ x: 20, z: 4.5 }] },
  {
    id: 'career-muon-space',
    title: 'Muon Space',
    path: [
      { x: 26, z: 4.5 },
      { x: 26, z: -17.5 },
      { x: 20, z: -17.5 },
    ],
  },
];

async function ready(page: Page) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.appMode === 'immersive' &&
      !!window.portfolio?.world &&
      !!window.portfolio?.poi
  );
  const safe = page.locator('[data-action="continue-safe-immersive"]');
  if (await safe.isVisible()) await safe.click();
  // Resume the scene's normal keyboard focus after the optional renderer warning.
  await page.locator('#app canvas').click({ position: { x: 20, y: 200 } });
}

async function walk(page: Page, points: { x: number; z: number }[]) {
  await page.evaluate(async (points) => {
    const w = window.portfolio!.world!;
    for (const point of points) {
      for (let count = 0; count < 4000; count += 1) {
        const current = w.getPlayerPosition();
        const dx = Math.max(-0.1, Math.min(0.1, point.x - current.x));
        const dz = Math.max(-0.1, Math.min(0.1, point.z - current.z));
        if (Math.abs(dx) + Math.abs(dz) < 0.0001) break;
        const next = w.stepPlayerForTest({ dx, dz });
        if ((dx && !next.movedX) || (dz && !next.movedZ))
          throw new Error(
            `Museum route blocked: ${JSON.stringify({ point, next })}`
          );
        if (count === 3999)
          throw new Error('Museum route did not reach its target');
        if (count % 30 === 0)
          await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }, points);
  await page.waitForTimeout(650);
}

async function enterMuseum(page: Page) {
  await walk(page, [
    { x: 0, z: -11 },
    { x: 3.8, z: -11 },
    { x: 3.8, z: -32.5 },
  ]);
  expect(
    await page.evaluate(() => window.portfolio!.world!.getActiveFloor())
  ).toBe('basement');
}

for (const width of [1280, 901]) {
  for (const panel of ['tutorial', 'controls'] as const) {
    const title =
      'opens a nearby career with remapped Interact ' +
      `while ${panel} stays open at ${width}px`;
    test(title, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await ready(page);
      await enterMuseum(page);
      await walk(page, APPROACHES[0].path);
      await page.evaluate(() =>
        window.portfolio!.input!.keyBindings!.setBinding('interact', ['k'])
      );
      await page.locator(`[data-role="${panel}-button"]`).click();
      await expect(page.locator('html')).toHaveAttribute(
        'data-active-hud-panel',
        panel
      );
      await page.locator('#app canvas').focus();
      await page.keyboard.press('KeyK', { delay: 400 });
      const overlay = page.locator('.poi-tooltip-overlay');
      await expect(overlay).toHaveAttribute('aria-hidden', 'false');
      await expect(overlay.locator('.poi-tooltip-overlay__title')).toHaveText(
        APPROACHES[0].title
      );
      await expect(
        overlay.locator('.poi-tooltip-overlay__visited')
      ).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute(
        'data-active-hud-panel',
        panel
      );
      const detailBounds = (await overlay.boundingBox())!;
      const panelBounds = (await page
        .locator(
          panel === 'tutorial' ? '#tutorial-panel' : '#control-overlay-popover'
        )
        .boundingBox())!;
      expect(detailBounds.x).toBeGreaterThanOrEqual(0);
      expect(detailBounds.x + detailBounds.width).toBeLessThanOrEqual(
        panelBounds.x
      );
      await page.screenshot({
        path: test.info().outputPath(`${panel}-career-${width}.png`),
      });
      if (panel === 'tutorial') {
        await page.locator('[data-testid="tutorial-sidebar-collapse"]').click();
        await expect(
          page.locator('[data-testid="tutorial-sidebar-collapse"]')
        ).toHaveAttribute('aria-expanded', 'false');
      }
      await overlay.locator('.poi-tooltip-overlay__close').click();
      await expect(overlay).toBeHidden();
      await expect(page.locator('#app canvas')).toBeFocused();
    });
  }
}

async function assertAxe(page: Page) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    const api = (
      window as unknown as {
        axe: { run(target: Element, options: object): Promise<AxeResults> };
      }
    ).axe;
    return api.run(document.querySelector('#app')!, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
  });
  expect(
    result.violations.map((entry) => ({
      id: entry.id,
      nodes: entry.nodes.map((node) => node.target),
    }))
  ).toEqual([]);
}

async function captureCounters(page: Page, name: string) {
  const snapshot = await page.evaluate(() => {
    const api = window.portfolio!.performance!;
    if (!('getSnapshot' in api))
      throw new Error('Performance diagnostics unavailable');
    return {
      position: window.portfolio!.world!.getPlayerPosition(),
      camera: window.portfolio!.world!.getCameraState(),
      floor: window.portfolio!.world!.getActiveFloor(),
      diagnostics: api.getSnapshot(),
    };
  });
  await mkdir(test.info().outputDir, { recursive: true });
  await writeFile(
    test.info().outputPath(`${name}.json`),
    JSON.stringify(snapshot, null, 2)
  );
  // The repository's established ceiling is a launch gate; post-route residency is measured.
  if (name === 'spawn-counters') {
    const counters = snapshot.diagnostics.rendererCounters;
    expect(counters.calls).toBeLessThanOrEqual(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxDrawCalls
    );
    expect(counters.triangles).toBeLessThanOrEqual(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxTriangles
    );
    expect(counters.memoryGeometries).toBeLessThanOrEqual(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxGeometries
    );
    expect(counters.memoryTextures).toBeLessThanOrEqual(
      IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET.maxTextures
    );
  }
  return snapshot;
}

async function selectByKeyboard(page: Page, id: string) {
  for (let index = 0; index < 5; index += 1) {
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(150);
    const active = await page.evaluate(
      () => window.portfolio!.poi!.getTooltipState().overlayVisiblePoiId
    );
    expect(active?.startsWith('career-')).toBe(true);
    if (active === id) {
      await page.keyboard.press('Enter');
      return;
    }
  }
  throw new Error(`Career keyboard target unavailable: ${id}`);
}

for (const profile of [
  { name: 'desktop', width: 1280, height: 720, touch: false, reduce: false },
  {
    name: 'large-desktop-reduced',
    width: 1600,
    height: 900,
    touch: false,
    reduce: true,
  },
  {
    name: 'phone-portrait',
    width: 390,
    height: 844,
    touch: true,
    reduce: false,
  },
  { name: 'small-phone', width: 360, height: 640, touch: true, reduce: true },
  {
    name: 'phone-landscape',
    width: 844,
    height: 390,
    touch: true,
    reduce: false,
  },
]) {
  test(`walks to all careers with accessible details and dismissal on ${profile.name}`, async ({
    browser,
  }) => {
    // Four exhibit journeys, screenshots and axe scans share this total budget.
    // Keep individual action/assertion limits and the zero-retry policy intact.
    test.setTimeout(120_000);
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      hasTouch: profile.touch,
      isMobile: profile.touch,
      reducedMotion: profile.reduce ? 'reduce' : 'no-preference',
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await ready(page);
    await captureCounters(page, 'spawn-counters');
    const hidden = await page.evaluate(() =>
      window.portfolio!.poi!.getCareerMuseumState()
    );
    expect(hidden.exhibits).toHaveLength(4);
    expect(
      hidden.exhibits.every(
        (exhibit) => !exhibit.visible && !exhibit.plaqueVisible
      )
    ).toBe(true);
    await page.keyboard.press('KeyE');
    expect(
      await page.evaluate(
        () =>
          window
            .portfolio!.poi!.getTooltipState()
            .worldTooltipPoiId?.startsWith('career-') ?? false
      )
    ).toBe(false);
    await page.keyboard.press('Escape');
    await enterMuseum(page);
    const visible = await page.evaluate(() =>
      window.portfolio!.poi!.getCareerMuseumState()
    );
    expect(
      visible.exhibits.every(
        (exhibit) => exhibit.visible && exhibit.plaqueVisible
      )
    ).toBe(true);
    expect(visible.resources).toMatchObject({ geometries: 4, textures: 4 });
    const beforeMetrics = await page.evaluate(() =>
      window.portfolio!.githubMetrics!.getDiagnostics()
    );
    for (const exhibit of APPROACHES) {
      await walk(page, exhibit.path);
      await captureCounters(page, `${exhibit.id}-counters`);
      const position = await page.evaluate(() =>
        window.portfolio!.world!.getPlayerPosition()
      );
      expect(position.y).toBe(-5);
      if (profile.touch) {
        const target = await page.evaluate(
          (id) =>
            window
              .portfolio!.poi!.getCareerMuseumState()
              .exhibits.find((entry) => entry.id === id)!.screen,
          exhibit.id
        );
        expect(target.x).toBeGreaterThan(0);
        expect(target.x).toBeLessThan(profile.width);
        expect(target.y).toBeGreaterThan(0);
        expect(target.y).toBeLessThan(profile.height);
        await page.touchscreen.tap(target.x, target.y);
      } else await selectByKeyboard(page, exhibit.id);
      const overlay = page.locator('.poi-tooltip-overlay');
      await expect(overlay).toHaveAttribute('aria-hidden', 'false');
      await expect(overlay.locator('.poi-tooltip-overlay__title')).toHaveText(
        exhibit.title
      );
      await expect(
        overlay.locator('.poi-tooltip-overlay__visited')
      ).toBeVisible();
      await expect(
        overlay.locator('.poi-tooltip-overlay__metrics')
      ).toBeHidden();
      await expect(
        overlay.locator('.poi-tooltip-overlay__status')
      ).toBeHidden();
      await expect(
        overlay.locator('.poi-tooltip-overlay__environments')
      ).toBeHidden();
      if (exhibit.id === 'career-muon-space') {
        await expect(overlay.locator('[data-career-disclaimer]')).toHaveText(
          DISCLAIMER
        );
        await overlay
          .locator('[data-career-disclaimer]')
          .scrollIntoViewIfNeeded();
        await expect(
          overlay.locator('[data-career-disclaimer]')
        ).toBeInViewport();
      }
      const box = await overlay.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(profile.width + 1);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(profile.height + 1);
      if (exhibit.id === 'career-muon-space') {
        await expect(
          overlay.locator('.poi-tooltip-overlay__close')
        ).toBeInViewport();
        await assertAxe(page);
      }
      await page.screenshot({
        path: test.info().outputPath(`${profile.name}-${exhibit.id}.png`),
      });
      await overlay.locator('.poi-tooltip-overlay__close').click();
      await expect(overlay).toHaveAttribute('aria-hidden', 'true');
      await expect(overlay).toBeHidden();
      const after = await page.evaluate(() =>
        window.portfolio!.world!.getPlayerPosition()
      );
      expect(after).toEqual(position);
      const collision = await page.evaluate(() =>
        window.portfolio!.world!.stepPlayerForTest({ dx: 0, dz: -1 })
      );
      expect(collision.movedZ).toBe(false);
      expect(collision.position).toEqual(position);
      await expect(page.locator('#app canvas')).toBeFocused();
      await page.screenshot({
        path: test.info().outputPath(`${profile.name}-${exhibit.id}-model.png`),
      });
    }
    await assertAxe(page);
    const afterMetrics = await page.evaluate(() =>
      window.portfolio!.githubMetrics!.getDiagnostics()
    );
    expect(afterMetrics.cachedRepoCount).toBe(beforeMetrics.cachedRepoCount);
    await walk(page, [
      { x: 26, z: -17.5 },
      { x: 29, z: -17.5 },
      { x: 29, z: 12.5 },
      { x: -29, z: 12.5 },
      { x: -29, z: -32.5 },
      { x: 3.8, z: -32.5 },
      { x: 3.8, z: -11 },
      { x: 0, z: -11 },
      { x: 0, z: -20 },
    ]);
    await captureCounters(page, 'post-museum-counters');
    const final = await page.evaluate(() => ({
      world: window.portfolio!.world!.getActiveFloor(),
      careers: window.portfolio!.poi!.getCareerMuseumState(),
      renderer: window.portfolio!.performance!.getSnapshot?.().renderer,
    }));
    expect(final.world).toBe('ground');
    expect(
      final.careers.exhibits.every(
        (exhibit) => !exhibit.visible && !exhibit.plaqueVisible
      )
    ).toBe(true);
    await test.info().attach('post-museum-resident-resources.json', {
      body: JSON.stringify(
        { profile, final, budget: IMMERSIVE_LAUNCH_PERFORMANCE_BUDGET },
        null,
        2
      ),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
    await context.close();
  });
}

test('uses native locale controls and preserves career disclaimer parity when switching to text', async ({
  page,
}) => {
  test.setTimeout(300_000);
  for (const locale of AVAILABLE_LOCALES) {
    await ready(page);
    await page.locator('[data-control="help"]').click();
    await page
      .locator(`.locale-toggle__option[data-locale="${locale}"]`)
      .click();
    await expect(page.locator('html')).toHaveAttribute(
      'data-content-locale',
      locale
    );
    await page.keyboard.press('Escape');
    await page.locator('#app canvas').click({ position: { x: 20, y: 200 } });
    await enterMuseum(page);
    await selectByKeyboard(page, 'career-muon-space');
    const expected = getCareerCopy(locale)['muon-space'];
    await expect(
      page.locator('.poi-tooltip-overlay [data-career-disclaimer]')
    ).toHaveText(expected.disclaimer!);
    await page.locator('.poi-tooltip-overlay__close').click();
    await page.evaluate(() => {
      (
        window as unknown as { oldMuseumSnapshot: () => { resources: unknown } }
      ).oldMuseumSnapshot = window.portfolio!.poi!.getCareerMuseumState;
    });
    await page.keyboard.press('KeyT');
    expect(
      await page.evaluate(
        () =>
          (
            window as unknown as {
              oldMuseumSnapshot: () => { resources: unknown };
            }
          ).oldMuseumSnapshot().resources
      )
    ).toBeNull();
    await expect(page.locator('html')).toHaveAttribute(
      'data-app-mode',
      'fallback'
    );
    await expect(
      page.locator('[data-career-id="muon-space"] [data-career-disclaimer]')
    ).toHaveText(expected.disclaimer!);
    await expect(page.locator('.text-fallback__timeline-entry')).toHaveCount(4);
    for (const career of CAREER_HISTORY) {
      const entry = page.locator(`[data-career-id="${career.id}"]`);
      const sources = career.provenance.filter((source) => source.href);
      await expect(entry.locator('a')).toHaveCount(sources.length);
      for (const source of sources) {
        const link = entry.getByRole('link', {
          name: getCareerCopy(locale)[career.id].sourceLabel,
        });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', source.href!);
        await link.focus();
        await expect(link).toBeFocused();
      }
    }
  }
});

test('keeps high-contrast career details accessible and gallery context visible at wide zoom', async ({
  page,
}) => {
  await ready(page);
  await page.locator('[data-control="help"]').click();
  await page
    .locator('.accessibility-presets__radio[value="high-contrast"]')
    .check();
  await page.keyboard.press('Escape');
  await page.locator('#app canvas').click({ position: { x: 20, y: 200 } });
  await enterMuseum(page);
  await walk(page, [
    { x: 12, z: -32.5 },
    { x: 26, z: -32.5 },
    { x: 26, z: -17.5 },
    { x: 20, z: -17.5 },
  ]);
  await selectByKeyboard(page, 'career-muon-space');
  await expect(
    page.locator('.poi-tooltip-overlay [data-career-disclaimer]')
  ).toHaveText(DISCLAIMER);
  await assertAxe(page);
  await page.locator('.poi-tooltip-overlay__close').click();
  await expect(page.locator('.poi-tooltip-overlay')).toBeHidden();
  await walk(page, [
    { x: 26, z: -17.5 },
    { x: 26, z: -4 },
    { x: 0, z: -4 },
  ]);
  for (let index = 0; index < 12; index += 1)
    await page.keyboard.press('Shift+Minus');
  await page.waitForTimeout(1000);
  expect(
    await page.evaluate(() => window.portfolio!.world!.getCameraState().zoom)
  ).toBeLessThan(6);
  await page.screenshot({
    path: test.info().outputPath('museum-gallery-overview.png'),
  });
  await captureCounters(page, 'museum-gallery-overview-counters');
});

test('records repeated residency, retains the museum resource pool, and releases it on text transition', async ({
  page,
}) => {
  // Six bounded software-rendered routes need setup and teardown time beyond
  // the single-journey default; all traversal and disposal assertions stay intact.
  test.setTimeout(120_000);
  await ready(page);
  const counts = [];
  let plateauObserved = false;
  for (let pass = 0; pass < 6; pass += 1) {
    await enterMuseum(page);
    for (const exhibit of APPROACHES) await walk(page, exhibit.path);
    await walk(page, [
      { x: 26, z: -17.5 },
      { x: 26, z: -32.5 },
      { x: 3.8, z: -32.5 },
      { x: 3.8, z: -11 },
      { x: 0, z: -11 },
      { x: 0, z: -20 },
    ]);
    const snapshot = await captureCounters(page, `repeat-route-${pass + 1}`);
    counts.push(snapshot.diagnostics.rendererCounters);
    const lifecycle = await page.evaluate(
      () => window.portfolio!.poi!.getCareerMuseumState().lifecycle
    );
    expect(lifecycle?.created).toMatchObject({
      geometries: 4,
      materials: 19,
      textures: 4,
    });
    expect(lifecycle?.disposed).toMatchObject({
      geometries: 0,
      materials: 0,
      textures: 0,
      instances: 0,
    });
    expect(
      await page.evaluate(
        () => window.portfolio!.poi!.getCareerMuseumState().resources
      )
    ).toEqual({
      geometries: 4,
      materials: 19,
      textures: 4,
    });
    if (counts.length >= 3) {
      const last = counts[counts.length - 1];
      const previous = counts[counts.length - 2];
      plateauObserved =
        last.memoryGeometries === previous.memoryGeometries &&
        last.memoryTextures === previous.memoryTextures;
      if (plateauObserved) break;
    }
  }
  await writeFile(
    test.info().outputPath('resource-lifecycle-summary.json'),
    JSON.stringify(
      {
        counts,
        plateauObserved,
        scope:
          'Museum resource-pool invariants and explicit teardown; whole-scene lazy residency is observed separately.',
        limitation:
          'A finite repeated-route sample does not prove complete GPU reclamation or absence of every leak.',
      },
      null,
      2
    )
  );
  await page.evaluate(() => {
    (
      window as unknown as { oldMuseumSnapshot: () => { resources: unknown } }
    ).oldMuseumSnapshot = window.portfolio!.poi!.getCareerMuseumState;
  });
  await page.keyboard.press('KeyT');
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  await expect(page.locator('#app canvas')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (
          window as unknown as {
            oldMuseumSnapshot: () => { resources: unknown };
          }
        ).oldMuseumSnapshot().resources
    )
  ).toBeNull();
  const disposed = await page.evaluate(
    () =>
      (
        window as unknown as {
          oldMuseumSnapshot: () => {
            lifecycle: {
              created: Record<string, number>;
              disposed: Record<string, number>;
              isDisposed: boolean;
            };
          };
        }
      ).oldMuseumSnapshot().lifecycle
  );
  expect(disposed.isDisposed).toBe(true);
  expect(disposed.disposed).toEqual(disposed.created);
  await writeFile(
    test.info().outputPath('resource-lifecycle-summary.json'),
    JSON.stringify(
      {
        counts,
        plateauObserved,
        museumLifecycle: disposed,
        limitation:
          'Own disposal events are verified; this does not prove complete old-renderer reclamation or absence of every leak.',
      },
      null,
      2
    )
  );
});
