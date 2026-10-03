// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

type Position = { x: number; z: number };
type DoorState = 'closed' | 'opening' | 'open';

const source = readFileSync(
  path.resolve('scripts/capture-performance-route.cjs'),
  'utf8'
);

function extension(flag: string) {
  const start = source.indexOf(`    if (${flag}) {`);
  const end = source.indexOf('\n    }\n', start);
  if (start < 0 || end < 0) throw new Error(`Missing capture branch: ${flag}`);
  return source.slice(start, end + '\n    }'.length);
}

function captureHarness() {
  let position: Position = { x: 0, z: -20 };
  let frontDoor: DoorState = 'closed';
  const crossings: Array<{ from: Position; to: Position }> = [];
  const checkpoints: Array<{ name: string; position: Position }> = [];
  const manualDoors: string[] = [];
  const waits: Array<{ id: string; position: Position }> = [];
  const scope = {
    async exteriorPath(target: Position) {
      // Model the closed aperture only in the routing test. The production
      // planner and movement sampler still use the scene's actual colliders.
      if (target.z === -20 && position.x < 32 !== target.x < 32) {
        if (frontDoor !== 'open')
          throw new Error(
            'Front-door crossing planned before automatic opening'
          );
        crossings.push({ from: { ...position }, to: { ...target } });
      }
      return [target];
    },
    async walk(_name: string, waypoints: Position[], floor: string) {
      expect(floor).toBe('ground');
      position = { ...waypoints[waypoints.length - 1] };
      frontDoor =
        position.z === -15 && Math.abs(position.x - 32) === 3
          ? 'opening'
          : 'closed';
    },
    async waitForDoor(id: string, state: string) {
      waits.push({ id, position: { ...position } });
      if (id !== 'front-door') return;
      expect(state).toBe('open');
      expect(frontDoor).toBe('opening');
      // Keep opening asynchronous so a missing await cannot pass the test.
      await Promise.resolve();
      frontDoor = 'open';
    },
    async operateDoor(id: string) {
      manualDoors.push(id);
    },
    async checkpoint(name: string) {
      checkpoints.push({ name, position: { ...position } });
    },
  };
  return { scope, crossings, checkpoints, manualDoors, waits };
}

// Execute the actual route orchestration without launching a browser or
// changing the production helper's measurement and movement implementation.
function runExtension(flag: string, scope: Record<string, unknown>) {
  return runInNewContext(`(async () => {${extension(flag)}})()`, {
    [flag]: true,
    ...scope,
  }) as Promise<void>;
}

describe('performance capture door approaches', () => {
  it('reapproaches and awaits the automatically closed front door on the garage return', async () => {
    const capture = captureHarness();
    await runExtension('includeGarage', capture.scope);

    expect(capture.crossings).toEqual([
      { from: { x: 35, z: -15 }, to: { x: 0, z: -20 } },
    ]);
    expect(capture.waits.at(-1)).toEqual({
      id: 'front-door',
      position: { x: 35, z: -15 },
    });
    expect(capture.manualDoors).not.toContain('front-door');
    expect(capture.checkpoints).toEqual([
      { name: 'garage-interior', position: { x: 41, z: 4 } },
      { name: 'garage-door-closed', position: { x: 47, z: 4 } },
      { name: 'garage-door-open', position: { x: 47, z: 4 } },
      { name: 'garage-driveway', position: { x: 55, z: 4 } },
      { name: 'garage-returned-spawn', position: { x: 0, z: -20 } },
    ]);
  });

  it('stops before planning through the front door if automatic opening fails', async () => {
    const capture = captureHarness();
    await expect(
      runExtension('includeGarage', {
        ...capture.scope,
        async waitForDoor(id: string, state: string) {
          if (id === 'front-door')
            throw new Error('Automatic opening timed out');
          await capture.scope.waitForDoor(id, state);
        },
      })
    ).rejects.toThrow('Automatic opening timed out');

    expect(capture.crossings).toEqual([]);
    expect(capture.checkpoints.map(({ name }) => name)).not.toContain(
      'garage-returned-spawn'
    );
  });
});
