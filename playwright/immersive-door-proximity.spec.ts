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
import {
  pressNativeMovementChord,
  selectNativeRunGait,
  runHoldForDistance,
} from './helpers/nativeMovementChord';

const approaches = createExteriorDoorDefinitions().map((definition) => ({
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
          await walkExteriorTo(page, {
            x: 32 * Math.SQRT1_2 - 3,
            z: -2 * Math.SQRT1_2,
          });
          await waitForApproachOpen(page, 'house-garage-door');
        }
        await walkExteriorTo(page, { x: door.x - 3, z: door.z + side * 0.05 });
        await waitForApproachOpen(page, door.id);
        if (side > 0)
          await walkExteriorTo(page, {
            x: door.x + 3,
            z: door.z + side * 0.05,
          });
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
        await walkExteriorTo(page, {
          x: door.x + side * 6,
          z: door.z + side * 0.05,
        });
        await waitDoor(page, door.id, 'closed');
        await page.locator('#app canvas').focus();
        await selectNativeRunGait(page);
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
          await pressNativeMovementChord(page, codes, runHoldForDistance(12));
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

// Setup uses normal browser interactions, route planning, and door animations.
// Keep those moving with explicit, serialized clock advances until setup settles.
async function runWithClockFrames(page: Page, setup: () => Promise<void>) {
  let finished = false;
  const setupDone = setup().finally(() => {
    finished = true;
  });
  const tickUntilReady = async () => {
    while (!finished) await page.clock.runFor(32);
  };
  await Promise.all([setupDone, tickUntilReady()]);
}

for (const side of [-1, 1]) {
  const keys = side < 0 ? ['KeyS', 'KeyD'] : ['KeyW', 'KeyA'];
  for (const leadKey of keys) {
    test(`front-door native chord tolerates one coarse frame with ${leadKey} first from ${side}`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      // Start the application with a paused clock, so no in-flight real-time
      // Playwright clock tick can race the transition into the measured frame.
      const clockStart = new Date('2026-01-01T00:00:00Z');
      await page.clock.install({ time: clockStart });
      await page.clock.pauseAt(new Date(clockStart.getTime() + 60_000));
      const door = approaches.find(({ id }) => id === 'front-door')!;
      const trailingKey = keys.find((key) => key !== leadKey)!;
      const zDirection = leadKey === 'KeyS' || leadKey === 'KeyA' ? 1 : -1;
      const start = { x: door.x + side * 6, z: door.z + zDirection * 0.05 };
      const advanceDoorTo = async (state: 'open' | 'closed') => {
        const readDoor = () =>
          page.evaluate(
            (id) =>
              window
                .portfolio!.world!.getDoorSnapshots()
                .find((snapshot) => snapshot.id === id),
            door.id
          );
        const expected = state === 'open' ? { state, target: 1 } : { state };
        if ((await readDoor())?.state !== state) {
          // Let the runtime complete its animation in ordinary frames. The
          // virtual duration doesn't depend on how quickly CI renders them.
          await page.clock.runFor(Math.ceil(door.duration * 1000) + 32);
        }
        expect(await readDoor()).toMatchObject(expected);
      };
      await runWithClockFrames(page, async () => {
        await readyExterior(
          page,
          '/?mode=immersive&disablePerformanceFailover=1&softwareRendererMode=continuous'
        );
        // Move to a valid entry side and manually close before retreat, as in
        // the real-time test. The measured crossing itself is native keys only.
        await walkExteriorTo(page, { x: door.x - 3, z: start.z });
      });
      await advanceDoorTo('open');
      await runWithClockFrames(page, async () => {
        if (side > 0) await walkExteriorTo(page, { x: door.x + 3, z: start.z });
        await page
          .locator(`[data-exterior-door-control][data-door-id="${door.id}"]`)
          .click();
      });
      await advanceDoorTo('closed');
      await runWithClockFrames(page, async () => {
        await walkExteriorTo(page, start);
        await page.locator('#app canvas').focus();
        await selectNativeRunGait(page);
      });
      await advanceDoorTo('closed');

      const readPose = () =>
        page.evaluate(() => window.portfolio!.world!.getPlayerPosition());
      await recordDoorMotion(page, door.id);
      await page.clock.runFor(48);
      const readFrame = () =>
        page.evaluate(() => {
          const samples = window.exteriorDoorMotion!.samples;
          const time = samples.at(-1)!.time;
          const { minFps } = window.portfolio!.performance!.getFrameStats();
          return {
            count: samples.length,
            time,
            sinceLast: performance.now() - time,
            // The application records the delta it actually used, separately
            // from this test's RAF recorder.
            maxAppFrameMs: 1000 / minFps,
          };
        });
      const frame = await readFrame();
      const before = await readPose();
      const session = await page.context().newCDPSession(page);
      const nativeKey = (code: string, type: 'keyDown' | 'keyUp') =>
        session.send('Input.dispatchKeyEvent', {
          code,
          key: code.slice(3).toLowerCase(),
          windowsVirtualKeyCode: code.charCodeAt(3),
          type,
          ...(type === 'keyDown'
            ? { text: code.slice(3).toLowerCase(), autoRepeat: false }
            : {}),
        });
      let lead: Awaited<ReturnType<typeof readPose>> | undefined;
      let endpoint: Awaited<ReturnType<typeof readPose>> | undefined;
      let leadFrame: Awaited<ReturnType<typeof readFrame>> | undefined;
      let motion: DoorMotionSample[] = [];
      const coarseFrameMs = 100;
      try {
        try {
          expect(before.z).toBeCloseTo(start.z, 5);
          await nativeKey(leadKey, 'keyDown');
          // Advance one coarse RAF rather than sleeping for an unknown number of
          // frames. Movement and collision still use the standard app loop.
          await page.clock.fastForward(
            coarseFrameMs - Math.round(frame.sinceLast)
          );
          lead = await readPose();
          leadFrame = await readFrame();
          expect(leadFrame.count).toBe(frame.count + 1);
          expect(leadFrame.time - frame.time).toBe(coarseFrameMs);
          expect(frame.maxAppFrameMs).toBeLessThan(coarseFrameMs);
          expect(leadFrame.maxAppFrameMs).toBeCloseTo(coarseFrameMs, 5);
          expect((lead.x - before.x) * -side).toBeGreaterThan(0.15);
          expect((lead.z - before.z) * zDirection).toBeGreaterThan(0.15);
          await nativeKey(trailingKey, 'keyDown');
          await page.clock.runFor(runHoldForDistance(12));
        } finally {
          try {
            await Promise.all([
              nativeKey(leadKey, 'keyUp'),
              nativeKey(trailingKey, 'keyUp'),
            ]);
          } finally {
            await session.detach();
          }
        }
        endpoint = await readPose();
        await page.clock.runFor(1200);
      } finally {
        motion = await page.evaluate(() => {
          const record = window.exteriorDoorMotion!;
          record.running = false;
          return record.samples;
        });
        const evidencePath = test
          .info()
          .outputPath('staggered-front-door-motion.json');
        writeFileSync(
          evidencePath,
          JSON.stringify({
            side,
            leadKey,
            trailingKey,
            coarseFrameMs,
            frame,
            leadFrame,
            before,
            lead,
            endpoint,
            motion,
          })
        );
        await test.info().attach('staggered-front-door-motion', {
          path: evidencePath,
          contentType: 'application/json',
        });
      }
      expect(motion[0].door.state).toBe('closed');
      expect((endpoint.x - door.x) * -side).toBeGreaterThan(3);
      expect(validateDoorMotion(motion, door, false)).toHaveLength(1);
    });
  }
}
