import { describe, expect, it } from 'vitest';

import { createExteriorDoorDefinitions } from '../../../scene/level/exteriorLayout';
import { collidesWithColliders } from '../../collision';
import { createDoorController } from '../controller';

const speed = 12;
// Uses the native frame order: animate the aperture, then move against its blocker.
describe.each(createExteriorDoorDefinitions(2))(
  'automatic $id approach',
  (definition) => {
    const occupant = (x: number, z = definition.center.z) => ({
      x,
      z,
      radius: 0.75,
      floorId: 'ground',
    });
    for (const side of [-1, 1]) {
      it.each([1.1, 2.5])(
        `clears the safety zone at gait speed %s from ${side}`,
        (gaitSpeed) => {
          const door = createDoorController(definition);
          const person = occupant(definition.center.x + side * 6);
          const delta = 1 / 60;
          let reached = false;
          for (let frame = 0; frame < 600; frame++) {
            const movement = { x: -side * gaitSpeed * delta, z: 0 };
            const state = door.update(delta, person, false, {
              maximumSpeed: gaitSpeed,
              movement,
            });
            person.x += movement.x;
            if (
              person.x + person.radius >= definition.threshold.minX &&
              person.x - person.radius <= definition.threshold.maxX
            ) {
              expect(state.progress).toBeGreaterThanOrEqual(
                definition.clearanceProgress
              );
              expect(state.blocked).toBe(false);
              reached = true;
              break;
            }
          }
          expect(reached).toBe(true);
        }
      );
      for (const delta of [1 / 60, 0.1, 0.4, 1.5]) {
        it(`clears an uninterrupted maximum-speed approach from ${side} at ${delta}s`, () => {
          const door = createDoorController(definition);
          const person = occupant(definition.center.x + side * 18);
          let opened = false;
          for (
            let frame = 0;
            frame < Math.ceil(36 / (speed * delta));
            frame++
          ) {
            const movement = { x: -side * speed * delta, z: 0 };
            const state = door.update(delta, person, false, {
              maximumSpeed: speed,
              movement,
            });
            opened ||= state.target === 1;
            // Check the whole frame's swept path, as runtime movement does.
            for (let step = 1; step <= 100; step++) {
              const x = person.x + (movement.x * step) / 100;
              expect(
                collidesWithColliders(
                  x,
                  person.z,
                  person.radius,
                  state.blocked ? [definition.blockingBounds] : []
                ),
                `frame ${frame}, x ${x}, progress ${state.progress}`
              ).toBe(false);
            }
            person.x += movement.x;
            expect(state.blocked).toBe(
              state.progress < definition.clearanceProgress
            );
          }
          expect(opened).toBe(true);
        });
      }

      it.each([false, true])(
        `closes after departure from ${side}, with reduced motion %s`,
        (reduced) => {
          const door = createDoorController(definition);
          const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
          const near = occupant(definition.center.x + side * 3);
          expect(
            door.update(definition.duration, near, reduced, approach)
          ).toMatchObject({ progress: 1, target: 1, blocked: false });
          // Stopping inside the near-door zone keeps the aperture open.
          expect(
            door.update(definition.duration * 3, near, reduced, approach)
          ).toMatchObject({ progress: 1, target: 1 });
          const departed = occupant(definition.center.x + side * 4);
          const progress: number[] = [];
          for (let frame = 0; frame < 4; frame++) {
            const state = door.update(
              definition.duration / 4,
              departed,
              reduced,
              approach
            );
            expect(state.target).toBe(0);
            expect(state.blocked).toBe(
              state.progress < definition.clearanceProgress
            );
            progress.push(state.progress);
          }
          expect(progress).toEqual(
            reduced ? [0, 0, 0, 0] : [0.84375, 0.5, 0.15625, 0]
          );
          expect(door.snapshot()).toMatchObject({
            state: 'closed',
            blocked: true,
          });
        }
      );

      it(`closes a turn-away before reaching the aperture from ${side}`, () => {
        const door = createDoorController(definition);
        const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
        const position = (distance: number) =>
          occupant(definition.center.x + side * distance);
        // Eight units is outside the hold zone, inside every max-speed lead.
        expect(
          door.update(definition.duration, position(8), false, approach)
        ).toMatchObject({ target: 1, progress: 1 });
        expect(
          door.update(definition.duration * 3, position(8), false, approach)
        ).toMatchObject({ target: 1, progress: 1 });
        const turning = door.update(
          definition.duration / 4,
          position(8.8),
          false,
          approach
        );
        expect(turning).toMatchObject({ target: 0, progress: 0.84375 });
        // Still inside the broad opening radius, yet stationary departure
        // must finish closing rather than repeatedly reopen the door.
        expect(
          door.update(definition.duration, position(8.8), false, approach)
        ).toMatchObject({ state: 'closed', progress: 0, target: 0 });
      });

      it(`ignores departure jitter and smoothly reverses repeated approaches from ${side}`, () => {
        const door = createDoorController(definition);
        const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
        const position = (distance: number) =>
          occupant(definition.center.x + side * distance);
        door.update(definition.duration, position(3), false, approach);
        for (let cycle = 0; cycle < 3; cycle++) {
          const closing = door.update(
            definition.duration / 4,
            position(4.1),
            false,
            approach
          );
          expect(closing).toMatchObject({ target: 0, progress: 0.84375 });
          for (const distance of [3.79, 3.81, 4, 3.9])
            expect(
              door.update(0, position(distance), false, approach)
            ).toMatchObject({ target: 0, progress: closing.progress });
          expect(door.update(0, position(3.2), false, approach)).toMatchObject({
            target: 1,
            progress: closing.progress,
          });
          const reopened = door.update(
            definition.duration / 20,
            position(3.2),
            false,
            approach
          );
          expect(reopened.progress).toBeGreaterThan(closing.progress);
          expect(reopened.progress).toBeLessThan(1);
          door.update(definition.duration, position(3), false, approach);
        }
      });
    }

    it('does not chatter across the lateral approach boundary', () => {
      const door = createDoorController(definition);
      const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
      const person = occupant(definition.center.x - 3);
      door.update(definition.duration, person, false, approach);
      const laneEdge = definition.width / 2 - person.radius;
      for (const offset of [0.01, -0.01, 0.02, -0.02]) {
        person.z = definition.center.z + laneEdge + offset;
        expect(
          door.update(definition.duration, person, false, approach)
        ).toMatchObject({ target: 1, progress: 1 });
      }
      person.z += 8;
      expect(
        door.update(definition.duration, person, false, approach)
      ).toMatchObject({ target: 0, progress: 0 });
    });

    it.each([false, true])(
      'protects an automatically closing doorway and panel sweep with reduced motion %s',
      (reduced) => {
        const door = createDoorController(definition);
        const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
        const person = occupant(definition.center.x - 3);
        door.update(definition.duration, person, reduced, approach);
        door.update(
          definition.duration / 10,
          occupant(definition.center.x - 4),
          false,
          approach
        );
        expect(door.snapshot().target).toBe(0);
        expect(
          door.update(
            definition.duration,
            occupant(definition.center.x),
            reduced,
            approach
          )
        ).toMatchObject({
          target: 1,
          progress: 1,
          occupied: true,
          blocked: false,
        });
        const sweep = occupant(definition.center.x, definition.sweep.maxZ);
        expect(
          door.update(definition.duration, sweep, reduced, approach)
        ).toMatchObject({ target: 1, progress: 1, blocked: false });
        expect(
          door.update(
            definition.duration,
            { ...sweep, floorId: 'basement' },
            reduced,
            approach
          )
        ).toMatchObject({ target: 0, progress: 0, occupied: false });
      }
    );

    it.each([false, true])(
      'opens a late sideways approach with reduced motion %s',
      (reduced) => {
        const door = createDoorController(definition);
        const person = occupant(
          definition.center.x - 1,
          definition.center.z - 4
        );
        const movement = { x: 1.5, z: 4 };
        const state = door.update(0.4, person, reduced, {
          maximumSpeed: speed,
          movement,
        });
        expect(state).toMatchObject({ target: 1, blocked: false });
        expect(state.progress).toBeGreaterThanOrEqual(
          definition.clearanceProgress
        );
      }
    );

    it('allows stationary manual closing, then reopens on renewed approach and re-entry', () => {
      const door = createDoorController(definition);
      const person = occupant(definition.center.x - 3);
      const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
      door.update(1, person, false, approach);
      expect(door.snapshot().target).toBe(1);
      door.request(0, person);
      expect(door.update(0.2, person, false, approach).target).toBe(0);
      const closingProgress = door.snapshot().progress;
      expect(
        door.update(0.01, person, false, {
          ...approach,
          movement: { x: 0.12, z: 0 },
        })
      ).toMatchObject({ target: 1 });
      expect(door.snapshot().progress).toBeGreaterThan(closingProgress);
      door.update(1, person, true, approach);
      door.request(0, person);
      door.update(1, person, false, approach);
      door.update(0, occupant(definition.center.x - 30), false, approach);
      expect(door.update(0.1, person, false, approach).target).toBe(1);
    });

    it.each([-1, 1])(
      'ignores microscopic settling but keeps slow approach from %s',
      (side) => {
        const door = createDoorController(definition);
        const start = definition.center.x + side * 3;
        const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
        door.update(definition.duration, occupant(start), false, approach);
        door.request(0, occupant(start));
        for (const offset of [0.000000106, 0.0000002, 0.0000008]) {
          expect(
            door.update(0.1, occupant(start - side * offset), false, approach)
              .target
          ).toBe(0);
        }
        expect(
          door.update(
            definition.duration,
            occupant(start - side * 0.0000008),
            false,
            approach
          ).state
        ).toBe('closed');
        // Tiny individual steps still accumulate into a meaningful new approach.
        for (let step = 1; step <= 40; step++) {
          expect(
            door.update(
              0.01,
              occupant(start - side * step * 0.00002),
              false,
              approach
            ).target
          ).toBe(0);
        }
        for (let step = 41; step <= 60; step++)
          door.update(
            0.01,
            occupant(start - side * step * 0.00002),
            false,
            approach
          );
        expect(door.snapshot().target).toBe(1);
      }
    );

    it.each([-1, 1])(
      'reopens after a manual-close retreat and renewed approach from %s',
      (side) => {
        const door = createDoorController(definition);
        const position = (distance: number) =>
          occupant(definition.center.x + side * distance);
        const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
        door.update(definition.duration, position(3), false, approach);
        door.request(0, position(3));
        expect(
          door.update(definition.duration, position(4), false, approach).state
        ).toBe('closed');
        expect(door.update(0, position(3.5), false, approach).target).toBe(1);
      }
    );

    it.each([false, true])(
      'protects an occupied closing threshold with reduced motion %s',
      (reduced) => {
        const door = createDoorController(definition);
        const person = occupant(definition.center.x - 3);
        const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
        door.update(1, person, reduced, approach);
        door.request(0, person);
        expect(
          door.update(0.5, occupant(definition.center.x), reduced, approach)
        ).toMatchObject({ target: 1, blocked: false, occupied: true });
      }
    );

    it('honors a stationary manual close before the first proximity update', () => {
      const door = createDoorController(definition);
      const person = occupant(definition.center.x - 3);
      door.request(1, person);
      door.update(definition.duration, person);
      door.request(0, person);
      expect(
        door.update(definition.duration, person, false, {
          maximumSpeed: speed,
          movement: { x: 0, z: 0 },
        })
      ).toMatchObject({ target: 0, progress: 0, blocked: true });
    });

    it('does not sense through an adjacent wall or across floors', () => {
      const approach = { maximumSpeed: speed, movement: { x: 0, z: 0 } };
      for (const person of [
        occupant(definition.center.x, definition.center.z + definition.width),
        { ...occupant(definition.center.x), floorId: 'basement' },
      ]) {
        const door = createDoorController(definition);
        expect(door.update(1, person, false, approach)).toMatchObject({
          target: 0,
          progress: 0,
        });
      }
    });
  }
);
