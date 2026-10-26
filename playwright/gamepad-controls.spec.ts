import { writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { createExteriorDoorDefinitions } from '../src/scene/level/exteriorLayout';

import { readyExterior } from './helpers/exteriorJourney';

interface SyntheticWindow extends Window {
  doorwaySamples?: { t: number; x: number; z: number; door: unknown }[];
  syntheticPad: {
    id: string;
    index: number;
    mapping: string;
    connected: boolean;
    axes: number[];
    buttons: { pressed: boolean; value: number }[];
  };
  portfolio?: {
    world?: { getPlayerPosition(): { x: number; z: number } };
    graphics?: { getCameraZoomTarget(): number };
  };
}

test('synthetic standard gamepad moves and zooms; HUD and disconnect remain safe', async ({
  page,
}) => {
  test.slow();
  await page.addInitScript(() => {
    const win = window as unknown as SyntheticWindow;
    win.syntheticPad = {
      id: 'Synthetic generic standard controller',
      index: 0,
      mapping: 'standard',
      connected: true,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    };
    Object.defineProperty(navigator, 'getGamepads', {
      value: () => [
        {
          ...win.syntheticPad,
        },
      ],
    });
  });
  await page.goto(
    '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous'
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-app-mode',
    'immersive'
  );
  const canvas = page.locator('#app canvas');
  await canvas.focus();
  const position = () =>
    page.evaluate(() =>
      (
        window as unknown as SyntheticWindow
      ).portfolio!.world!.getPlayerPosition()
    );
  const zoom = () =>
    page.evaluate(() =>
      (
        window as unknown as SyntheticWindow
      ).portfolio!.graphics!.getCameraZoomTarget()
    );
  await page.waitForTimeout(250);
  const before = await position();
  const initialZoom = await zoom();
  await page.evaluate(() => {
    const pad = (window as unknown as SyntheticWindow).syntheticPad;
    pad.axes = [0.7, 0, 0.5, 0];
    pad.buttons[6] = { pressed: true, value: 1 };
  });
  await expect
    .poll(async () => {
      const next = await position();
      return Math.hypot(next.x - before.x, next.z - before.z);
    })
    .toBeGreaterThan(0.05);
  await expect.poll(zoom).toBeLessThan(initialZoom);
  await page.evaluate(() => {
    // Keep the polled pad connected and held here: only the event can stop input.
    window.dispatchEvent(
      Object.assign(new Event('gamepaddisconnected'), {
        gamepad: (window as unknown as SyntheticWindow).syntheticPad,
      })
    );
  });
  await page.waitForTimeout(500);
  const disconnected = await position();
  const stoppedZoom = await zoom();
  await page.waitForTimeout(350);
  const stopped = await position();
  expect(
    Math.hypot(stopped.x - disconnected.x, stopped.z - disconnected.z)
  ).toBeLessThan(0.03);
  expect(await zoom()).toBe(stoppedZoom);

  await page.evaluate(() => {
    (window as unknown as SyntheticWindow).syntheticPad.connected = false;
  });

  await page.locator('[data-role="controls-button"]').click();
  const category = page.locator('[data-role="gamepad-controls"]');
  await expect(category).toBeVisible();
  await expect(category.getByRole('heading')).toHaveText('Gamepad controls');
  await expect(category).toContainText('Bottom face button (A / Cross)');
  await expect(
    page.locator('[data-control-item="keyboardMove"]')
  ).toBeVisible();
  await page.locator('[data-role="controls-close"]').click();
  await expect(category).toBeHidden();

  await canvas.focus();
  await page.evaluate(() => {
    const pad = (window as unknown as SyntheticWindow).syntheticPad;
    pad.connected = true;
    pad.mapping = '';
    pad.axes = [1, 0, 1, 0];
  });
  await page.waitForTimeout(350);
  expect(await zoom()).toBe(stoppedZoom);
  const unsupported = await position();
  expect(
    Math.hypot(unsupported.x - stopped.x, unsupported.z - stopped.z)
  ).toBeLessThan(0.03);
});

for (const opening of ['automatic', 'preopened'] as const) {
  for (const gait of ['walk', 'run'] as const) {
    for (const side of [-1, 1]) {
      test(`gamepad ${gait} crosses the ${opening} front doorway off-axis from ${side}`, async ({
        page,
      }) => {
        test.setTimeout(60_000);
        await page.addInitScript(() => {
          const win = window as unknown as SyntheticWindow;
          win.syntheticPad = {
            id: 'Synthetic generic standard controller',
            index: 0,
            mapping: 'standard',
            connected: true,
            axes: [0, 0, 0, 0],
            buttons: Array.from({ length: 17 }, () => ({
              pressed: false,
              value: 0,
            })),
          };
          Object.defineProperty(navigator, 'getGamepads', {
            value: () => [{ ...win.syntheticPad }],
          });
        });
        await readyExterior(
          page,
          '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous'
        );
        const door = createExteriorDoorDefinitions().find(
          (d) => d.id === 'front-door'
        )!;
        const angle = ((gait === 'walk' ? 10 : -10) * Math.PI) / 180;
        const start = {
          x: door.center.x + side * (opening === 'preopened' ? 3 : 6),
          z:
            door.center.z +
            side * (opening === 'preopened' ? 3 : 6) * Math.tan(angle),
          floorId: 'ground' as const,
        };
        await page.evaluate(
          (p) => window.portfolio!.world!.movePlayerTo(p),
          opening === 'preopened' ? { ...start, z: door.center.z } : start
        );
        if (opening === 'preopened') {
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  window
                    .portfolio!.world!.getDoorSnapshots()
                    .find((d) => d.id === 'front-door')!.state
              )
            )
            .toBe('open');
        }
        if (opening === 'preopened') {
          const shift = await page.evaluate(
            (dz) => window.portfolio!.world!.stepPlayerForTest({ dx: 0, dz }),
            start.z - door.center.z
          );
          expect(shift.position.z).toBeCloseTo(start.z, 5);
        }
        if (
          (await page.evaluate(() => window.portfolio!.avatar!.getGait!())) !==
          gait
        )
          await page.locator('[data-avatar-gait-control]').click();
        await page.locator('#app canvas').focus();
        const dx = -side * Math.cos(angle),
          dz = -side * Math.sin(angle);
        await page.evaluate(
          ({ dx, dz }) => {
            const camera = window.portfolio!.world!.getCameraState();
            const fx = camera.focus.x - camera.position.x;
            const fz = camera.focus.z - camera.position.z;
            const length = Math.hypot(fx, fz);
            (window as unknown as SyntheticWindow).syntheticPad.axes = [
              (-fz * dx + fx * dz) / length,
              -(fx * dx + fz * dz) / length,
              0,
              0,
            ];
          },
          { dx, dz }
        );
        let crossingError: unknown;
        try {
          await page.waitForFunction(
            ({ cx, side }) => {
              const p = window.portfolio!.world!.getPlayerPosition();
              const win = window as unknown as SyntheticWindow;
              (win.doorwaySamples ??= []).push({
                t: performance.now(),
                x: p.x,
                z: p.z,
                door: window
                  .portfolio!.world!.getDoorSnapshots()
                  .find((d) => d.id === 'front-door'),
              });
              return (p.x - cx) * -side > 2.5;
            },
            { cx: door.center.x, side },
            { timeout: 30_000, polling: 'raf' }
          );
        } catch (error) {
          crossingError = error;
        } finally {
          await page.evaluate(() => {
            (window as unknown as SyntheticWindow).syntheticPad.axes = [
              0, 0, 0, 0,
            ];
          });
        }
        await page.waitForTimeout(500);
        const end = await page.evaluate(
          (side) => ({
            position: window.portfolio!.world!.getPlayerPosition(),
            floor: window.portfolio!.world!.getActiveFloor(),
            gait: window.portfolio!.avatar!.getGait!(),
            blockers: window.portfolio!.debugColliders!.getBlockingCollidersAt({
              ...window.portfolio!.world!.getPlayerPosition(),
              floorId: 'ground',
              x: window.portfolio!.world!.getPlayerPosition().x - side * 0.03,
            }),
          }),
          side
        );
        const samples = await page.evaluate(
          () => (window as unknown as SyntheticWindow).doorwaySamples
        );
        const pathError = Math.abs(
          end.position.z -
            door.center.z -
            (end.position.x - door.center.x) * Math.tan(angle)
        );
        const evidencePath = test
          .info()
          .outputPath('off-axis-gamepad-doorway.json');
        await writeFile(
          evidencePath,
          JSON.stringify(
            {
              opening,
              gait,
              side,
              angleDegrees: (angle * 180) / Math.PI,
              start,
              end,
              pathError,
              samples,
            },
            null,
            2
          )
        );
        await test.info().attach('off-axis-gamepad-doorway.json', {
          path: evidencePath,
          contentType: 'application/json',
        });
        if (crossingError) throw crossingError;
        expect(end.floor).toBe('ground');
        expect(end.gait).toBe(gait);
        expect((end.position.x - door.center.x) * -side).toBeGreaterThan(2.5);
        expect(pathError).toBeLessThan(0.12);
      });
    }
  }
}
