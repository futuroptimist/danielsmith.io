import { writeFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import {
  readyExterior,
  waitDoor,
  walkExteriorTo,
} from './helpers/exteriorJourney';
import { pressNativeMovementChord } from './helpers/nativeMovementChord';

const approaches = [{ id: 'front-door', x: 32, z: -15 }];

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
        `opens ${door.id} during uninterrupted native maximum-speed approach ` +
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
        await walkExteriorTo(page, { x: door.x + side * 6, z: door.z });
        await waitDoor(page, door.id, 'closed');
        await page.locator('#app canvas').focus();
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
        const evidencePath = test
          .info()
          .outputPath('native-door-approach.json');
        writeFileSync(
          evidencePath,
          JSON.stringify(
            { approach: door, side, reducedMotion, ...state },
            null,
            2
          )
        );
        await test.info().attach('native-door-approach', {
          path: evidencePath,
          contentType: 'application/json',
        });
        expect((state.position.x - door.x) * -side).toBeGreaterThan(3);
        expect(state.door.blocked).toBe(false);
        expect(state.floor).toBe('ground');
      });
    }
  }
}
