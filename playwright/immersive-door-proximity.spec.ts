import { writeFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import type { DoorSnapshot } from '../src/systems/doors/controller';

import {
  readyExterior,
  waitDoor,
  walkExteriorTo,
} from './helpers/exteriorJourney';
import { pressNativeMovementChord } from './helpers/nativeMovementChord';

const approaches = [
  { id: 'front-door', x: 32, z: -15 },
  { id: 'house-garage-door', x: 32, z: -2 },
  { id: 'garage-door', x: 50, z: 4 },
];

interface DoorMotionSample {
  time: number;
  x: number;
  door: DoorSnapshot;
}
declare global {
  interface Window {
    exteriorDoorMotion?: { samples: DoorMotionSample[]; running: boolean };
  }
}

async function recordDoorMotion(page: Page, id: string) {
  await page.evaluate((id) => {
    const record = { samples: [] as DoorMotionSample[], running: true };
    window.exteriorDoorMotion = record;
    const sample = () => {
      if (!record.running) return;
      const world = window.portfolio!.world!;
      record.samples.push({
        time: performance.now(),
        x: world.getPlayerPosition().x,
        door: world.getDoorSnapshots().find((door) => door.id === id)!,
      });
      requestAnimationFrame(sample);
    };
    sample();
  }, id);
}

async function waitForApproachOpen(page: Page, id: string) {
  // Proximity can open between a snapshot read and a click. The initial
  // approach only waits; deliberate stationary manual actions stay separate.
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const door = window
          .portfolio!.world!.getDoorSnapshots()
          .find((door) => door.id === id);
        return door?.target === 1 && door.state === 'open';
      }, id)
    )
    .toBe(true);
}

for (const door of approaches) {
  for (const side of [-1, 1]) {
    for (const reducedMotion of [false, true]) {
      const title =
        `opens and closes ${door.id} during native maximum-speed passage ` +
        `from ${side} (reduced ${reducedMotion})`;
      test(title, async ({ page }) => {
        test.setTimeout(120_000);
        await page.emulateMedia({
          reducedMotion: reducedMotion ? 'reduce' : 'no-preference',
        });
        await readyExterior(page);
        if (door.id === 'garage-door') {
          await walkExteriorTo(page, { x: 29, z: -2 });
          await waitForApproachOpen(page, 'house-garage-door');
        }
        await walkExteriorTo(page, { x: door.x - 3, z: door.z });
        await waitForApproachOpen(page, door.id);
        if (side > 0) await walkExteriorTo(page, { x: door.x + 3, z: door.z });
        // Close from a valid approach, then retreat through real movement. The
        // measured crossing starts with a closed door and never uses Interact.
        await page
          .locator(`[data-exterior-door-control][data-door-id="${door.id}"]`)
          .click();
        await waitDoor(page, door.id, 'closed');
        if (door.id === 'garage-door' && side < 0 && !reducedMotion)
          await page.screenshot({
            path: test.info().outputPath('garage-closed-panel-cutaway.png'),
          });
        await walkExteriorTo(page, { x: door.x + side * 6, z: door.z });
        await waitDoor(page, door.id, 'closed');
        await page.locator('#app canvas').focus();
        await recordDoorMotion(page, door.id);
        await pressNativeMovementChord(
          page,
          side < 0 ? ['KeyS', 'KeyD'] : ['KeyW', 'KeyA'],
          1000
        );
        const state = await page.evaluate(
          (id) => ({
            position: window.portfolio!.world!.getPlayerPosition(),
            door: window
              .portfolio!.world!.getDoorSnapshots()
              .find((door) => door.id === id)!,
            floor: window.portfolio!.world!.getActiveFloor(),
          }),
          door.id
        );
        // Wait at the natural native endpoint. Walking back to a fixed target
        // after coasting farther away would be a genuine inward re-approach.
        expect((state.position.x - door.x) * -side).toBeGreaterThan(3.8);
        await waitDoor(page, door.id, 'closed');
        const motion = await page.evaluate(() => {
          const record = window.exteriorDoorMotion!;
          record.running = false;
          return record.samples;
        });
        const crossing = motion.filter(
          (sample) => Math.abs(sample.x - door.x) <= 1.2
        );
        expect(crossing.length).toBeGreaterThan(0);
        for (const sample of crossing) expect(sample.door.blocked).toBe(false);
        if (!reducedMotion) {
          const closing = motion.filter(
            (sample) => sample.door.state === 'closing'
          );
          expect(
            new Set(closing.map((sample) => sample.door.progress)).size
          ).toBeGreaterThan(2);
          for (let i = 1; i < closing.length; i++) {
            const previous = closing[i - 1].door.progress;
            const current = closing[i].door.progress;
            expect(current).toBeLessThanOrEqual(previous);
            expect(previous - current).toBeLessThan(0.7);
          }
        }
        const evidencePath = test
          .info()
          .outputPath('native-door-approach.json');
        writeFileSync(
          evidencePath,
          JSON.stringify(
            { approach: door, side, reducedMotion, ...state, motion },
            null,
            2
          )
        );
        await test.info().attach('native-door-approach', {
          path: evidencePath,
          contentType: 'application/json',
        });
        expect((state.position.x - door.x) * -side).toBeGreaterThan(3);
        expect(crossing.at(-1)!.door.blocked).toBe(false);
        expect(state.floor).toBe('ground');
      });
    }
  }
}
