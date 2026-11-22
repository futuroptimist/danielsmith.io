import { expect, test, type Page } from '@playwright/test';

const url = '/?mode=immersive&disablePerformanceFailover=1';
const northLoungeApproach = {
  x: -28.5 * Math.SQRT1_2 + 0.3 - 1.63,
  z: -22.8 * Math.SQRT1_2 - 0.9,
};

async function expectBlockedSeatApproach(
  page: Page,
  position: { x: number; z: number },
  furnishing: string
) {
  const target = { ...position, floorId: 'ground' as const };
  const before = await page.evaluate((p) => {
    const { world, debugColliders } = window.portfolio!;
    debugColliders!.setEnabled(true);
    return {
      position: world!.getPlayerPosition(),
      canOccupy: world!.canOccupyPosition(p),
      blockers: debugColliders!.getBlockingCollidersAt(p).map((c) => c.name),
    };
  }, target);
  expect(before.canOccupy).toBe(false);
  expect(before.blockers).toContain(
    `LowerFloorFurnishingCollider:${furnishing}`
  );
  await expect(() =>
    page.evaluate((p) => window.portfolio!.world!.movePlayerTo(p), target)
  ).rejects.toThrow(/Cannot occupy/);
  expect(
    await page.evaluate(() => ({
      position: window.portfolio!.world!.getPlayerPosition(),
      floor: window.portfolio!.world!.getActiveFloor(),
      seating: window.portfolio!.avatar!.getSeatingState!().phase,
    }))
  ).toEqual({ position: before.position, floor: 'ground', seating: 'free' });
}

async function expectFreeGroundMovement(page: Page) {
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.keyboard.down('w');
  try {
    await expect
      .poll(() =>
        page.evaluate((start) => {
          const p = window.portfolio!.world!.getPlayerPosition();
          return Math.hypot(p.x - start.x, p.z - start.z);
        }, before)
      )
      .toBeGreaterThan(0.1);
  } finally {
    await page.keyboard.up('w');
  }
}

test('approved avatar loads, gait toggles and the blocked north lounge approach is rejected', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded,
    null,
    { timeout: 60_000 }
  );
  await page.keyboard.press('Escape');
  const softwareNotice = page.locator(
    '[data-action="continue-safe-immersive"]'
  );
  if (await softwareNotice.isVisible()) await softwareNotice.click();
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  // CDP does not emulate the OS lock LED; use the browser's real modifier-event API.
  const reportLock = async (
    caps: boolean,
    key = 'CapsLock',
    code = 'CapsLock'
  ) =>
    page.evaluate(
      ({ caps, key, code }) => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key,
            code,
            modifierCapsLock: caps,
            bubbles: true,
          })
        );
        window.dispatchEvent(
          new KeyboardEvent('keyup', {
            key,
            code,
            modifierCapsLock: caps,
            bubbles: true,
          })
        );
      },
      { caps, key, code }
    );
  await reportLock(true);
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(true, 'Shift', 'ShiftLeft');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(false);
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  await page.locator('[data-avatar-gait-control]').click();
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(false, 'ArrowUp', 'ArrowUp');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'run'
  );
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await reportLock(true, 'Z', 'KeyW');
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await reportLock(false);
  await expectBlockedSeatApproach(
    page,
    northLoungeApproach,
    'living-room-tv-pothos-left'
  );
  await expectFreeGroundMovement(page);
  expect(errors).toEqual([]);
});

test('changing quality reloads at a clear standing position while a lounge approach is blocked', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded,
    null,
    { timeout: 60_000 }
  );
  await page.keyboard.press('Escape');
  await expectBlockedSeatApproach(
    page,
    northLoungeApproach,
    'living-room-tv-pothos-left'
  );
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate(() => {
      const graphics = window.portfolio!.graphics as {
        getLevel(): string;
        setLevel(level: string): void;
      };
      graphics.setLevel(
        graphics.getLevel() === 'performance' ? 'balanced' : 'performance'
      );
    }),
  ]);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded,
    null,
    { timeout: 60_000 }
  );
  expect(
    await page.evaluate(
      () => window.portfolio?.avatar?.getSeatingState?.().phase
    )
  ).toBe('free');
  await page.keyboard.press('Escape');
  expect(
    await page.evaluate(() => {
      const world = window.portfolio!.world!;
      return world.canOccupyPosition({
        ...world.getPlayerPosition(),
        floorId: 'ground',
      });
    })
  ).toBe(true);
  await expectFreeGroundMovement(page);
});

test('asset failure keeps the existing mannequin available', async ({
  page,
}) => {
  await page.route('**/daniel-animated-avatar.glb', (route) => route.abort());
  await page.goto(url);
  await page.waitForFunction(() =>
    Boolean(window.portfolio?.avatar?.getAnimationState)
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({
      loaded: false,
      presentation: 'fallback',
      fallbackVisible: true,
      loadingMarkerVisible: false,
    });
  await page.keyboard.press('Escape');
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.keyboard.down('w');
  try {
    await expect
      .poll(() =>
        page.evaluate((start) => {
          const p = window.portfolio!.world!.getPlayerPosition();
          return Math.hypot(p.x - start.x, p.z - start.z);
        }, before)
      )
      .toBeGreaterThan(0.1);
  } finally {
    await page.keyboard.up('w');
  }
  await expect(page.locator('[data-avatar-chair-control]')).toBeHidden();
});

test('cold slow load shows only a marker, times out safely, and accepts a late rig', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(url);
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({
      loaded: false,
      presentation: 'pending',
      fallbackVisible: false,
      loadingMarkerVisible: true,
    });
  await page.screenshot({ path: 'test-results/avatar-loading-marker.png' });
  await page.waitForTimeout(1500);
  expect(
    await page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
  ).toMatchObject({
    presentation: 'pending',
    fallbackVisible: false,
    loadingMarkerVisible: true,
  });
  await expect
    .poll(
      () =>
        page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.()),
      { timeout: 20_000 }
    )
    .toMatchObject({
      presentation: 'fallback',
      fallbackVisible: true,
      loadingMarkerVisible: false,
    });
  release();
  await expect
    .poll(
      () =>
        page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.()),
      { timeout: 30_000 }
    )
    .toMatchObject({
      loaded: true,
      presentation: 'ready',
      fallbackVisible: false,
      loadingMarkerVisible: false,
    });
});

test('reload retries a failed rig with a fresh loading presentation', async ({
  page,
}) => {
  await page.route('**/daniel-animated-avatar.glb', (route) => route.abort());
  await page.goto(url);
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({ presentation: 'fallback', fallbackVisible: true });
  await page.unroute('**/daniel-animated-avatar.glb');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({
      presentation: 'pending',
      fallbackVisible: false,
      loadingMarkerVisible: true,
    });
  release();
  await expect
    .poll(
      () =>
        page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.()),
      { timeout: 30_000 }
    )
    .toMatchObject({
      loaded: true,
      presentation: 'ready',
      fallbackVisible: false,
      loadingMarkerVisible: false,
    });
});

test('leaving immersive mode during avatar loading does not attach to a disposed scene', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(url);
  await page.waitForFunction(() =>
    Boolean(window.portfolio?.avatar?.getAnimationState)
  );
  await page.keyboard.press('Escape');
  await page.keyboard.press('t');
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'fallback'
  );
  release();
  await page.waitForTimeout(250);
  expect(errors).toEqual([]);
});

test('reduced motion retains free movement when the east lounge and reading-chair approaches are blocked', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (window.portfolio?.avatar?.getAnimationState?.() as { loaded?: boolean })
        ?.loaded
  );
  await page.keyboard.press('Escape');
  await expectBlockedSeatApproach(
    page,
    { x: -26.1 * Math.SQRT1_2 - 1.63, z: -15.9 * Math.SQRT1_2 + 0.55 },
    'living-room-floor-lamp'
  );
  await expectBlockedSeatApproach(
    page,
    { x: 22.2 * Math.SQRT1_2 - 1.52, z: 12.6 * Math.SQRT1_2 - 1.1 },
    'studio-round-side-table'
  );
  await expectFreeGroundMovement(page);
});

test('delayed avatar fades in while movement and Caps Lock gait survive the handoff', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/daniel-animated-avatar.glb', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(url);
  await expect
    .poll(() =>
      page.evaluate(() => window.portfolio?.avatar?.getAnimationState?.())
    )
    .toMatchObject({ presentation: 'pending', fallbackVisible: false });
  await page.keyboard.press('Escape');
  const notice = page.locator('[data-action="continue-safe-immersive"]');
  if (await notice.isVisible()) await notice.click();
  await page.evaluate(() =>
    window.portfolio?.avatar?.setAccessoryEnabled('holo-drone', true)
  );
  const before = await page.evaluate(() =>
    window.portfolio!.world!.getPlayerPosition()
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'w',
        code: 'KeyW',
        modifierCapsLock: true,
        bubbles: true,
      })
    )
  );
  await expect
    .poll(() =>
      page.evaluate((start) => {
        const p = window.portfolio!.world!.getPlayerPosition();
        return Math.hypot(p.x - start.x, p.z - start.z);
      }, before)
    )
    .toBeGreaterThan(0.1);
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await page.screenshot({ path: 'test-results/avatar-muted-loading.png' });
  // Record every frame so a short transition cannot be missed by a slow CI assertion poll.
  const sequence = page.evaluate(
    () =>
      new Promise<
        Array<{
          presentation: string;
          revealProgress: number;
          fallbackVisible: boolean;
          position: { x: number; z: number };
        }>
      >((resolve) => {
        const frames: Array<{
          presentation: string;
          revealProgress: number;
          fallbackVisible: boolean;
          position: { x: number; z: number };
        }> = [];
        const sample = () => {
          const state = window.portfolio!.avatar!
            .getAnimationState!() as (typeof frames)[number];
          frames.push({
            ...state,
            position: window.portfolio!.world!.getPlayerPosition(),
          });
          if (state.presentation === 'ready') resolve(frames);
          else requestAnimationFrame(sample);
        };
        sample();
      })
  );
  release();
  const frames = await sequence;
  expect(
    frames.some(
      (s) =>
        s.presentation === 'revealing' &&
        s.revealProgress > 0 &&
        s.revealProgress < 1
    )
  ).toBe(true);
  expect(frames.every((s) => !s.fallbackVisible)).toBe(true);
  const duringReveal = frames.find(
    (s) => s.presentation === 'revealing'
  )!.position;
  const afterReveal = frames[frames.length - 1].position;
  expect(
    Math.hypot(afterReveal.x - duringReveal.x, afterReveal.z - duringReveal.z)
  ).toBeGreaterThan(0.01);
  await expect
    .poll(() =>
      page.evaluate((start) => {
        const p = window.portfolio!.world!.getPlayerPosition();
        return Math.hypot(p.x - start.x, p.z - start.z);
      }, afterReveal)
    )
    .toBeGreaterThan(0.1);
  expect(await page.evaluate(() => window.portfolio?.avatar?.getGait?.())).toBe(
    'walk'
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'w',
        code: 'KeyW',
        modifierCapsLock: true,
        bubbles: true,
      })
    )
  );
  await page.screenshot({ path: 'test-results/avatar-revealed.png' });
});
