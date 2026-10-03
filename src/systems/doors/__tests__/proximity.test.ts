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
    }

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
