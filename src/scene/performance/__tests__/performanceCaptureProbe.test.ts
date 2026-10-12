// @vitest-environment node
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  installRouteCapture,
  DEFAULT_BOUNDS,
  validateRouteCaptureConfig,
} = require('../../../../scripts/lib/performance-capture-probe.cjs');

function fixture(overrides = {}, hidden = false, supported = true) {
  let clock = 0,
    next = 0;
  const callbacks = new Map<number, (time: number) => void>();
  const timers = new Map<number, () => void>();
  const listeners = new Map<string, (event?: unknown) => void>();
  let delivery: (list: unknown) => void = () => {};
  let pending: unknown[] = [];
  let disconnected = 0;
  const context = {
    performance: { now: () => clock },
    document: {
      visibilityState: hidden ? 'hidden' : 'visible',
      addEventListener: (k: string, fn: (e?: unknown) => void) =>
        listeners.set(k, fn),
      removeEventListener: (k: string) => listeners.delete(k),
    },
    requestAnimationFrame: (fn: (t: number) => void) => {
      callbacks.set(++next, fn);
      return next;
    },
    cancelAnimationFrame: (id: number) => callbacks.delete(id),
    setTimeout: (fn: () => void) => {
      timers.set(++next, fn);
      return next;
    },
    clearTimeout: (id: number) => timers.delete(id),
    PerformanceObserver: class {
      static supportedEntryTypes = supported ? ['longtask'] : [];
      constructor(fn: (list: unknown) => void) {
        delivery = fn;
      }
      observe() {}
      takeRecords() {
        const records = pending;
        pending = [];
        return records;
      }
      disconnect() {
        disconnected++;
      }
    },
  };
  const config = {
    bounds: { ...DEFAULT_BOUNDS, ...overrides },
    labels: ['synthetic'],
  };
  const source = `
    window = globalThis;
    window.top = window;
    window.addEventListener = (k,f)=>hostListeners.set(k,f);
    window.removeEventListener=k=>hostListeners.delete(k);
    (${installRouteCapture.toString()})(${JSON.stringify(config)});
    window.__routeCapture;
  `;
  const sandbox = {
    ...context,
    hostListeners: listeners,
  };
  const probe = runInNewContext(source, sandbox);
  return {
    probe,
    callbacks,
    timers,
    listeners,
    get disconnected() {
      return disconnected;
    },
    tick(time: number) {
      clock = time;
      const fn = callbacks.values().next().value;
      callbacks.clear();
      fn?.(time);
    },
    time(time: number) {
      clock = time;
    },
    tasks(records: unknown[]) {
      delivery({ getEntries: () => records });
    },
    pending(records: unknown[]) {
      pending = records;
    },
    event(name: string, event = {}) {
      listeners.get(name)?.(event);
    },
    duplicate() {
      return runInNewContext(
        `(${installRouteCapture.toString()})(${JSON.stringify(config)})`,
        sandbox
      );
    },
  };
}

describe('serialized supplemental capture with synthetic clocks', () => {
  it('rejects a second collector without adding a callback or observer', () => {
    const f = fixture();
    expect(() => f.duplicate()).toThrow('capture_already_installed');
    expect(f.callbacks.size).toBe(1);
    f.probe.dispose();
  });
  it('runs without module closures, records initial visibility and retains long gaps', () => {
    const f = fixture();
    f.tick(16);
    f.tick(32);
    f.tick(1232);
    const status = f.probe.stop('finished');
    expect(status.streams.raf.retainedCount).toBe(3);
    expect(f.probe.readChunk('rafTimestampsMs', 0, 4096)).toEqual([
      16, 32, 1232,
    ]);
    expect(
      f.probe
        .readChunk('markers', 0, 4096)
        .filter((m: { type: string }) => m.type.startsWith('visibility'))
    ).toEqual([
      {
        atMs: 0,
        type: 'visibility_visible',
        labelId: null,
        spanId: null,
        spanKind: null,
      },
    ]);
    expect(status.numericBufferBytes).toBeLessThan(4 * 1024 * 1024);
    expect(f.callbacks.size + f.listeners.size + f.timers.size).toBe(0);
    expect(f.probe.stop('cancelled')).toEqual(status);
    f.probe.dispose();
    f.probe.dispose();
  });
  it('retains hidden init and synthetic pagehide around 120 intervals', () => {
    const f = fixture({}, true);
    f.event('pagehide');
    for (let i = 0; i <= 120; i++) f.tick(i * 16);
    f.event('pagehide');
    expect(f.probe.prefix().callbackCount).toBe(121);
    expect(f.callbacks.size).toBe(1);
    f.event('pagehide', { isTrusted: true });
    expect(f.probe.stop().stopReason).toBe('pagehide');
    expect(f.disconnected).toBe(1);
    const markers = f.probe.readChunk('markers', 0, 4096);
    expect(markers[1].type).toBe('visibility_hidden');
    expect(
      markers.filter((m: { type: string }) => m.type === 'synthetic_pagehide')
    ).toHaveLength(2);
  });
  it('keeps observer delivery order and drains pending records only at stop', () => {
    const f = fixture();
    f.time(300);
    f.tasks([{ startTime: 100, duration: 50 }]);
    expect(f.probe.prefix().longTaskDeliveryCount).toBe(1);
    f.tasks([{ startTime: 10, duration: 60 }]);
    f.pending([{ startTime: 200, duration: 80 }]);
    f.probe.stop();
    expect(f.probe.readChunk('longTasks', 0, 4096)).toEqual([
      { startMs: 100, durationMs: 50 },
      { startMs: 10, durationMs: 60 },
      { startMs: 200, durationMs: 80 },
    ]);
  });
  it('retains the finite prefix on invalid clocks and whole deadline overshoot', () => {
    const f = fixture();
    f.tick(16);
    f.tick(NaN);
    expect(f.probe.stop().streams.raf.state).toBe('clock_invalid');
    expect(f.probe.readChunk('rafTimestampsMs', 0, 10)).toEqual([16]);
    const d = fixture({ maxDurationMs: 100 });
    d.tick(16);
    d.tick(1200);
    expect(d.probe.stop().captureStoppedAtMs).toBe(1200);
    expect(d.probe.readChunk('rafTimestampsMs', 0, 10)).toEqual([16, 1200]);
  });
  it.each(['raf', 'longTasks', 'markers', 'snapshots'])(
    'retains exact capacity and reports first overflow for %s',
    (stream) => {
      const f = fixture({
        maxRafIntervals: 1,
        maxLongTasks: 1,
        maxMarkers: 3,
        maxSnapshots: 1,
      });
      if (stream === 'raf') {
        f.tick(1);
        f.tick(2);
        f.tick(3);
      }
      if (stream === 'longTasks') {
        f.time(300);
        f.tasks([
          { startTime: 0, duration: 50 },
          { startTime: 60, duration: 50 },
        ]);
      }
      if (stream === 'markers') {
        f.probe.mark('checkpoint', 0);
        f.probe.mark('checkpoint', 0);
      }
      if (stream === 'snapshots') {
        // Construct the approved primitive snapshot in the same VM realm.
        const make = f.probe.snapshot.constructor(
          `return {
            atMs:0, rendererClass:'unknown', appMode:'unknown', quality:'unknown',
            devicePixelRatio:1, calls:0, triangles:0, memoryGeometries:0, memoryTextures:0
          }`
        );
        f.probe.snapshot(make());
        f.probe.snapshot(make());
      }
      const s = f.probe.stop().streams[stream];
      expect(s.state).toBe('capacity_stop');
      expect(s.firstUnrecordedAtMs).not.toBeNull();
      expect(s.unrecordedCount).toBeNull();
      expect(f.callbacks.size).toBe(0);
      f.time(1000);
      expect(() => f.probe.prefix()).toThrow('capture_stopped');
      expect(() => f.probe.mark('checkpoint', 0)).toThrow('capture_stopped');
      expect(() => f.probe.beginSpan('helper_snapshot', 0)).toThrow(
        'capture_stopped'
      );
    }
  );
  it('rejects live export, excessive chunks, unmatched spans and unsupported configuration', () => {
    const f = fixture({}, false, false);
    expect(() => f.probe.readChunk('markers', 0, 1)).toThrow('capture_running');
    expect(() => f.probe.endSpan(100)).toThrow('unmatched_span');
    f.probe.beginSpan('helper_screenshot', 0);
    expect(f.probe.stop().unfinishedSpanIds).toHaveLength(1);
    expect(f.probe.stop().streams.longTasks.state).toBe('unsupported');
    expect(() => f.probe.readChunk('markers', 0, 4097)).toThrow();
    expect(() =>
      validateRouteCaptureConfig({
        bounds: { ...DEFAULT_BOUNDS, maxDurationMs: 1200001 },
        labels: [],
      })
    ).toThrow();
    expect(() =>
      validateRouteCaptureConfig({
        bounds: DEFAULT_BOUNDS,
        labels: ['private URL https://example.com'],
      })
    ).toThrow();
  });
});
