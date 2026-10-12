// @vitest-environment node
import { readFileSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createContext, runInContext, runInNewContext } from 'node:vm';

import { afterAll, describe, expect, it, vi } from 'vitest';

type Position = { x: number; z: number };
type DoorState = 'closed' | 'opening' | 'open';

const source = readFileSync(
  path.resolve('scripts/capture-performance-route.cjs'),
  'utf8'
).replace(/\r\n/g, '\n');

const require = createRequire(import.meta.url);
const {
  createCaptureSession,
} = require('../../../../scripts/capture-performance-route.cjs');
const temporary = mkdtempSync(
  path.join(tmpdir(), 'synthetic-route-orchestration-')
);
afterAll(() => rmSync(temporary, { recursive: true, force: true }));

describe('opt-in capture lifecycle with synthetic pages', () => {
  it('never stitches a replacement document into the original attempt', async () => {
    const directory = path.join(temporary, 'navigation');
    const session = createCaptureSession(directory);
    const handlers = new Map<string, (frame: object) => void>();
    const frame = {};
    const evaluate = vi.fn();
    session.attach({
      on: (name: string, fn: (frame: object) => void) => handlers.set(name, fn),
      mainFrame: () => frame,
      isClosed: () => false,
      evaluate,
    });
    handlers.get('framenavigated')!(frame);
    handlers.get('framenavigated')!(frame);
    await session.finish('failure');
    expect(evaluate).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        readFileSync(
          path.join(directory, 'route-capture-terminal-v1.json'),
          'utf8'
        )
      )
    ).toMatchObject({ reason: 'navigation', captureStoppedAtMs: null });
  });
  it('preserves the exact scene bus-stop separator', () => {
    expect(source).toContain('Bus stop \u00b7 Coming Soon');
    expect(source).not.toContain('Bus stop \u00c2\u00b7 Coming Soon');
  });
  it.each([false, true])(
    'exports the actual probe and retains prefixes after capacity stop=%s',
    async (capacity) => {
      const directory = path.join(
        temporary,
        capacity ? 'capacity' : 'complete'
      );
      let now = 0;
      let callback: ((time: number) => void) | null = null;
      const vm = createContext({
        performance: { now: () => now },
        document: {
          visibilityState: 'visible',
          addEventListener() {},
          removeEventListener() {},
        },
        requestAnimationFrame(fn: (time: number) => void) {
          callback = fn;
          return 1;
        },
        cancelAnimationFrame() {
          callback = null;
        },
        setTimeout() {
          return 1;
        },
        clearTimeout() {},
        PerformanceObserver: { supportedEntryTypes: [] },
      });
      runInContext(
        'window=globalThis;window.top=window;window.addEventListener=()=>{};window.removeEventListener=()=>{};',
        vm
      );
      const evaluate = async (
        fn: (...args: never[]) => unknown,
        arg: unknown
      ) => {
        const value = await runInContext(
          `(${fn.toString()})(${JSON.stringify(arg) ?? 'undefined'})`,
          vm
        );
        return value === undefined
          ? undefined
          : JSON.parse(JSON.stringify(value));
      };
      const page = {
        on: vi.fn(),
        isClosed: () => false,
        evaluate,
        addInitScript: evaluate,
        screenshot: async () => {
          now = 1216;
          callback?.(now);
        },
      };
      const session = createCaptureSession(
        directory,
        capacity ? { bounds: { maxRafIntervals: 1 } } : {}
      );
      session.browser = { version: () => 'synthetic', close: vi.fn() };
      session.context = { close: vi.fn() };
      const wrapped = session.attach(page);
      await session.install();
      await session.mark('application_ready');
      await session.mark('route_begin');
      runInContext('window.__routeCapture.mark("checkpoint",0)', vm);
      callback?.(0);
      now = 16;
      callback?.(now);
      const prefix = await evaluate(
        () => window.__routeCapture.prefix(),
        undefined
      );
      const record = {
        stallProbe: prefix,
        snapshot: {
          renderer: { isSoftwareRenderer: true },
          quality: { level: 'balanced' },
          rendererSize: { pixelRatio: 1 },
          rendererCounters: {
            calls: 1,
            triangles: 2,
            memoryGeometries: 3,
            memoryTextures: 4,
          },
        },
      };
      await session.checkpoint('spawn', record);
      await wrapped.screenshot();
      if (capacity) {
        await expect(
          evaluate(() => window.__routeCapture.prefix(), undefined)
        ).rejects.toThrow('capture_stopped');
        await expect(session.mark('route_end')).rejects.toThrow(
          'capture_stopped'
        );
      } else await session.mark('route_end');
      const result = { checkpoints: [record] };
      await session.finish(capacity ? 'failure' : 'finished', result);
      const raw = JSON.parse(
        readFileSync(path.join(directory, 'route-capture-raw-v1.json'), 'utf8')
      );
      const analysis = JSON.parse(
        readFileSync(
          path.join(directory, 'route-capture-analysis-v1.json'),
          'utf8'
        )
      );
      const terminal = JSON.parse(
        readFileSync(
          path.join(directory, 'route-capture-terminal-v1.json'),
          'utf8'
        )
      );
      expect(terminal).toMatchObject({
        state: capacity ? 'partial' : 'complete',
        reason: capacity ? 'capacity' : 'finished',
        cleanupState: 'complete',
      });
      expect(raw.rafTimestampsMs).toEqual(capacity ? [0, 16] : [0, 16, 1216]);
      expect(raw.checkpointPrefixes[0].callbackCount).toBe(2);
      expect(result.checkpoints[0].stallProbe.rafMaxMs).toBe(16);
      expect(analysis.allIntervals.maxMs).toBe(capacity ? 16 : 1200);
      if (!capacity)
        expect(analysis.gaps[0].classification).toBe('overlaps_known_helper');
    }
  );
  it('does not import supplemental modules when merely loading the default runner', () => {
    const imports: string[] = [];
    const requireStub = (id: string) => {
      imports.push(id);
      return require(id);
    };
    runInNewContext(source, {
      require: requireStub,
      module: { exports: {} },
      process: { argv: [], cwd: () => process.cwd() },
    });
    expect(imports.some((id) => id.includes('performance-capture'))).toBe(
      false
    );
    expect(source.replace(/\s/g, '')).toContain(
      "if(!process.argv.includes('--capture-evidence'))returnrunRoute();"
    );
  });
  it('preserves initial/running receipts on a lost page and refuses reuse', async () => {
    const directory = path.join(temporary, 'lost');
    const session = createCaptureSession(directory);
    expect(readdirSync(directory).sort()).toEqual([
      'route-capture-initial-v1.json',
      'route-capture-running-v1.json',
    ]);
    const initial = readFileSync(
      path.join(directory, 'route-capture-initial-v1.json')
    );
    await session.finish('page_closed');
    await session.finish('cancelled');
    const terminal = JSON.parse(
      readFileSync(
        path.join(directory, 'route-capture-terminal-v1.json'),
        'utf8'
      )
    );
    expect(terminal.reason).toBe('page_lost');
    expect(terminal.captureStoppedAtMs).toBeNull();
    expect(
      readFileSync(path.join(directory, 'route-capture-initial-v1.json'))
    ).toEqual(initial);
    expect(() => createCaptureSession(directory)).toThrow();
  });
  it('bounds a never-resolving page call and owned cleanup by one finalization grace', async () => {
    vi.useFakeTimers();
    try {
      const directory = path.join(temporary, 'timeout');
      const session = createCaptureSession(directory, {
        bounds: { maxFinalizationGraceMs: 2500 },
      });
      const evaluate = vi.fn(() => new Promise(() => {}));
      session.attach({ on: vi.fn(), isClosed: () => false, evaluate });
      session.context = { close: () => new Promise(() => {}) };
      const finished = session.finish('finished');
      await vi.advanceTimersByTimeAsync(2500);
      await finished;
      const terminal = JSON.parse(
        readFileSync(
          path.join(directory, 'route-capture-terminal-v1.json'),
          'utf8'
        )
      );
      expect(terminal).toMatchObject({
        reason: 'export_timeout',
        captureStoppedAtMs: null,
        cleanupState: 'incomplete',
      });
      expect(evaluate).toHaveBeenCalledTimes(1);
      expect(readdirSync(directory)).not.toContain('route-capture-raw-v1.json');
    } finally {
      vi.useRealTimers();
    }
  });
});

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

function streetDiagnostics() {
  return {
    result: {},
    page: {
      evaluate: vi
        .fn()
        .mockResolvedValueOnce({
          busStop: { signText: 'Bus stop · Coming Soon' },
          lamps: Array.from({ length: 4 }, () => ({ groundPoolVisible: true })),
        })
        .mockResolvedValueOnce({
          description: 'Bus stop: Coming Soon',
          available: true,
          interactiveElements: 0,
        }),
    },
  };
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

  it('approaches and awaits automatic opening on both street crossings', async () => {
    const capture = captureHarness();
    await runExtension('includeStreet', {
      ...capture.scope,
      ...streetDiagnostics(),
    });

    expect(capture.crossings).toEqual([
      { from: { x: 29, z: -15 }, to: { x: 61, z: -20 } },
      { from: { x: 35, z: -15 }, to: { x: 0, z: -20 } },
    ]);
    expect(capture.waits).toEqual([
      { id: 'front-door', position: { x: 29, z: -15 } },
      { id: 'front-door', position: { x: 35, z: -15 } },
    ]);
    expect(capture.manualDoors).toEqual([]);
    expect(capture.checkpoints).toEqual([
      { name: 'street-parked-ev', position: { x: 61, z: -20 } },
      { name: 'street-bus-stop-coming-soon', position: { x: 55, z: 32 } },
      { name: 'street-shelter-interior', position: { x: 50, z: 32 } },
      { name: 'street-returned-spawn', position: { x: 0, z: -20 } },
    ]);
  });

  it.each([1, 2])(
    'stops before street crossing %s when automatic opening fails',
    async (failedOpening) => {
      const capture = captureHarness();
      let openings = 0;
      await expect(
        runExtension('includeStreet', {
          ...capture.scope,
          ...streetDiagnostics(),
          async waitForDoor(id: string, state: string) {
            if (++openings === failedOpening)
              throw new Error('Automatic opening timed out');
            await capture.scope.waitForDoor(id, state);
          },
        })
      ).rejects.toThrow('Automatic opening timed out');

      expect(capture.crossings).toHaveLength(failedOpening - 1);
      expect(capture.checkpoints.map(({ name }) => name)).not.toContain(
        'street-returned-spawn'
      );
    }
  );
});
