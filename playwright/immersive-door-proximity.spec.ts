import { writeFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import { createExteriorDoorDefinitions } from '../src/scene/level/exteriorLayout';

import {
  validateDoorMotion,
  type DoorMotionSample,
} from './helpers/doorMotionEvidence';
import {
  readyExterior,
  waitDoor,
  walkExteriorTo,
} from './helpers/exteriorJourney';
import { pressNativeMovementChord } from './helpers/nativeMovementChord';

const approaches = createExteriorDoorDefinitions(2).map((definition) => ({
  ...definition,
  x: definition.center.x,
  z: definition.center.z,
}));

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
      const position = world.getPlayerPosition();
      record.samples.push({
        time: performance.now(),
        x: position.x,
        z: position.z,
        floor: world.getActiveFloor(),
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
        let state:
          | {
              position: { x: number; y: number; z: number };
              door: DoorMotionSample['door'];
              floor: string;
            }
          | undefined;
        let motion: DoorMotionSample[] = [];
        let initialDepartureDistance: number | undefined;
        let departurePulses = 0;
        const readState = () =>
          page.evaluate(
            (id) => ({
              position: window.portfolio!.world!.getPlayerPosition(),
              door: window
                .portfolio!.world!.getDoorSnapshots()
                .find((door) => door.id === id)!,
              floor: window.portfolio!.world!.getActiveFloor(),
            }),
            door.id
          );
        const codes =
          side < 0 ? (['KeyS', 'KeyD'] as const) : (['KeyW', 'KeyA'] as const);
        try {
          await pressNativeMovementChord(page, codes, 1000);
          state = await readState();
          initialDepartureDistance = (state.position.x - door.x) * -side;
          // The uninterrupted input must already establish the crossing.
          // Extra departure pulses cannot rescue a blocked or incomplete pass.
          expect(initialDepartureDistance).toBeGreaterThan(3);
          const departureDeadline = Date.now() + 5000;
          for (
            let pulse = 0;
            pulse < 8 &&
            Date.now() < departureDeadline &&
            (state.position.x - door.x) * -side <= 4.2;
            pulse++
          ) {
            // Wall-clock key duration does not guarantee simulated distance.
            // Release every bounded pulse before reading the actual endpoint.
            await pressNativeMovementChord(page, codes, 100);
            departurePulses++;
            state = await readState();
          }
          // Continue away from the door; returning toward a fixed pose would
          // be a renewed approach and could legitimately reopen it.
          expect((state.position.x - door.x) * -side).toBeGreaterThan(3.8);
          await waitDoor(page, door.id, 'closed');
        } finally {
          motion = await page.evaluate(() => {
            const record = window.exteriorDoorMotion!;
            record.running = false;
            return record.samples;
          });
          const evidencePath = test
            .info()
            .outputPath('native-door-approach.json');
          writeFileSync(
            evidencePath,
            JSON.stringify(
              {
                approach: door,
                side,
                reducedMotion,
                ...state,
                departure: {
                  initialDistance: initialDepartureDistance,
                  additionalPulses: departurePulses,
                  targetDistance: 4.2,
                  requiredDistance: 3.8,
                },
                motion,
              },
              null,
              2
            )
          );
          await test.info().attach('native-door-approach', {
            path: evidencePath,
            contentType: 'application/json',
          });
        }
        if (!state) throw new Error('Native endpoint was not recorded');
        const crossing = validateDoorMotion(motion, door, reducedMotion);
        expect((state.position.x - door.x) * -side).toBeGreaterThan(3);
        expect(crossing.at(-1)!.after.door.blocked).toBe(false);
        expect(state.floor).toBe('ground');
      });
    }
  }
}
