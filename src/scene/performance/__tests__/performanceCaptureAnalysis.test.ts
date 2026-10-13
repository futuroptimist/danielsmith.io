// @vitest-environment node
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  truncateSync,
  rmSync,
  readdirSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createOperation,
  analyzeDirectory,
} = require('../../../../scripts/analyze-performance-capture.cjs');
const {
  parseCapture,
  analyzeCapture,
  compareCaptures,
  projectLegacyProbe,
  validateArtifact,
  sha256,
} = require('../../../../scripts/lib/performance-capture-analysis.cjs');
const {
  DEFAULT_BOUNDS,
} = require('../../../../scripts/lib/performance-capture-probe.cjs');
const root = mkdtempSync(path.join(tmpdir(), 'synthetic-route-capture-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const hash = 'a'.repeat(64);
const marker = (
  atMs: number,
  type: string,
  spanId: number | null = null,
  spanKind: string | null = null
) => ({ atMs, type, labelId: null, spanId, spanKind });
function raw(
  durations: number[] = [16, 16, 100, 100.001, 999.999, 1000, 1500]
) {
  const timestamps = [0];
  for (const d of durations) timestamps.push(timestamps.at(-1)! + d);
  const end = timestamps.at(-1)!;
  const markers = [
    marker(0, 'init'),
    marker(0, 'visibility_visible'),
    marker(0, 'route_begin'),
    marker(end, 'route_end'),
    marker(end, 'stop'),
  ];
  const stream = (n: number) => ({
    state: 'complete',
    retainedCount: n,
    observedCount: n,
    unrecordedCount: 0,
    firstUnrecordedAtMs: null,
  });
  return {
    kind: 'route_capture_raw',
    captureSchemaVersion: 1,
    attemptId: 'synthetic-only',
    startedAt: '2026-01-01T00:00:00Z',
    finishedAt: '2026-01-01T00:01:00Z',
    captureState: 'complete',
    stopReason: 'finished',
    source: {
      repository: 'futuroptimist/danielsmith.io',
      commit: 'a'.repeat(40),
      servedBuild: null,
      artifactId: `sha256:${hash}`,
      artifactReceiptState: 'verified',
      routeContractSha256: hash,
    },
    toolchain: { helperSha256: hash, probeSha256: hash, analyzerSha256: hash },
    profile: {
      method: 'raf_callback_cadence_v1',
      harness: 'synthetic_route_helper',
      browserFamily: 'chromium',
      browserVersion: 'synthetic',
      viewportWidth: 1280,
      viewportHeight: 720,
      devicePixelRatio: 1,
      orientation: 'landscape',
      quality: 'balanced',
      qualitySource: 'harness',
      rendererClass: 'unknown',
      rendererContinuity: 'sampled_only',
      deviceReceiptState: 'unverified',
      displayRefreshHz: null,
      headless: true,
      navigatorHintsOverridden: true,
      storageClearedInTestContext: true,
      movement: 'runtime_collision_stepping',
      normalLaunch: false,
      failoverBypassed: true,
    },
    bounds: { ...DEFAULT_BOUNDS },
    warmth: {
      state: 'unqualified',
      applicationReadyMs: null,
      assetsSettledMs: null,
      minimumDelayMs: 5000,
      settleEvidenceSha256: null,
    },
    streams: {
      raf: stream(timestamps.length),
      longTasks: stream(0),
      markers: stream(markers.length),
      snapshots: stream(0),
    },
    coverage: {
      state: 'complete',
      captureStartedAtMs: 0,
      captureStoppedAtMs: end,
      firstCallbackAtMs: 0,
      lastCallbackAtMs: end,
      leftCensoredMs: 0,
      rightCensoredMs: 0,
      plannedDeadlineAtMs: 1200000,
      deadlineOvershootMs: 0,
      reasons: [],
    },
    labels: ['synthetic'],
    rafTimestampsMs: timestamps,
    longTasks: [] as Array<{ startMs: number; durationMs: number }>,
    markers,
    snapshots: [] as Array<ReturnType<typeof snapshot>>,
    checkpointPrefixes: [],
    capabilities: {
      nativeFramePresentation: 'not_collected',
      inputToNextPaint: 'not_collected',
      gpuTiming: 'not_collected',
      wholeFramePassTotals: 'not_collected',
      geometryTextureBytes: 'not_collected',
      retainedHeap: 'not_collected',
      longTaskTiming: 'supported',
    },
  };
}
function snapshot(atMs = 0, appMode = 'immersive') {
  return {
    atMs,
    rendererClass: 'unknown',
    appMode,
    quality: 'balanced',
    devicePixelRatio: 1,
    calls: 0,
    triangles: 0,
    memoryGeometries: 0,
    memoryTextures: 0,
  };
}
function sync(c: ReturnType<typeof raw>) {
  c.streams.snapshots.retainedCount = c.snapshots.length;
  c.streams.snapshots.observedCount = c.snapshots.length;
  c.streams.markers.retainedCount = c.markers.length;
  c.streams.markers.observedCount = c.markers.length;
  return c;
}

describe('synthetic supplemental analysis oracles (not hardware evidence)', () => {
  it('compares semantic windows across different document clock origins', () => {
    const base = raw(),
      candidate = raw();
    const offset = 17;
    candidate.rafTimestampsMs = candidate.rafTimestampsMs.map(
      (t) => t + offset
    );
    candidate.markers.forEach((m) => {
      m.atMs += offset;
    });
    for (const key of [
      'captureStartedAtMs',
      'captureStoppedAtMs',
      'firstCallbackAtMs',
      'lastCallbackAtMs',
      'plannedDeadlineAtMs',
    ] as const)
      candidate.coverage[key] += offset;
    expect(compareCaptures(base, candidate)).toMatchObject({
      state: 'diagnostic_profile_comparable',
      deltaP95Ms: 0,
      hardwareQualified: false,
    });
    candidate.bounds.maxDurationMs--;
    candidate.coverage.plannedDeadlineAtMs--;
    expect(compareCaptures(base, candidate).reasons).toContain(
      'bounds_mismatch'
    );
  });
  it('preserves gap span order and strict overlap boundaries with indexed ranges', () => {
    const c = raw([150, 150, 150]);
    c.markers.push(
      marker(50, 'span_begin', 0, 'helper_screenshot'),
      marker(320, 'span_end', 0, 'helper_screenshot'),
      marker(150, 'span_begin', 1, 'interruption'),
      marker(300, 'span_end', 1, 'interruption'),
      marker(100, 'span_begin', 2, 'helper_snapshot'),
      marker(100, 'span_end', 2, 'helper_snapshot'),
      marker(320, 'visibility_hidden'),
      marker(400, 'visibility_visible')
    );
    c.markers.sort((a, b) => a.atMs - b.atMs);
    const a = analyzeCapture(sync(c));
    expect(
      a.gaps.map(
        (g: { intersectingSpanIds: number[] }) => g.intersectingSpanIds
      )
    ).toEqual([[0], [1, 0], [0]]);
    expect(
      a.gaps.map((g: { classification: string }) => g.classification)
    ).toEqual([
      'overlaps_known_helper',
      'overlaps_helper_and_interruption',
      'overlaps_helper_and_interruption',
    ]);
  });
  it('analyzes near-limit callback and span counts without Cartesian scans', () => {
    const c = raw(Array(300000).fill(4));
    c.snapshots.push(snapshot());
    Object.assign(c.warmth, {
      state: 'evidence_provided',
      applicationReadyMs: 0,
      assetsSettledMs: 0,
      settleEvidenceSha256: hash,
    });
    c.markers.push(marker(0, 'application_ready'), marker(0, 'assets_settled'));
    for (let id = 0; id < 2000; id++)
      c.markers.push(
        marker(0, 'span_begin', id, 'helper_snapshot'),
        marker(1200000, 'span_end', id, 'helper_snapshot')
      );
    c.markers.sort((a, b) => a.atMs - b.atMs);
    const a = analyzeCapture(sync(c));
    expect(a.allIntervals.sampleCount).toBe(300000);
    expect(
      a.windows.find(
        (w: { kind: string }) => w.kind === 'steady_foreground_candidate'
      ).summary.state
    ).toBe('unavailable');
  }, 10000);
  it('carries fallback observations forward until an immersive observation returns', () => {
    const c = raw([5001, 16, 16, 16, 16, 16]);
    Object.assign(c.warmth, {
      state: 'evidence_provided',
      applicationReadyMs: 0,
      assetsSettledMs: 0,
      settleEvidenceSha256: hash,
    });
    c.markers.push(marker(0, 'application_ready'), marker(0, 'assets_settled'));
    c.markers.sort((a, b) => a.atMs - b.atMs);
    c.snapshots.push(snapshot(), snapshot(5030, 'fallback'), snapshot(5065));
    const a = analyzeCapture(sync(c));
    const clean = a.windows.find(
      (w: { kind: string }) => w.kind === 'steady_foreground_candidate'
    );
    expect(clean.eligibleRanges).toEqual([
      { fromInclusive: 1, toExclusive: 2 },
      { fromInclusive: 5, toExclusive: 6 },
    ]);
    expect(
      clean.excludedRanges.find(
        (r: { range: { fromInclusive: number } }) => r.range.fromInclusive === 2
      )
    ).toMatchObject({
      range: { fromInclusive: 2, toExclusive: 5 },
      reasons: ['renderer_changed'],
    });
    expect(a.allIntervals.sampleCount).toBe(6);
  });
  it('reuses analysis output after the analyzer changes while preserving original raw bytes', () => {
    const input = path.join(root, 'old-analyzer'),
      first = path.join(root, 'new-analysis'),
      second = path.join(root, 'reanalysis');
    const op = createOperation(input, 'capture'),
      c = raw();
    c.attemptId = op.state.attemptId;
    c.toolchain = op.hashes;
    op.running();
    op.write('route-capture-raw-v1.json', c);
    op.finish('complete', 'finished');
    const manifestPath = path.join(input, 'route-capture-manifest-v1.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.toolchain.analyzerSha256 = 'b'.repeat(64);
    for (const entry of manifest.files) {
      const file = path.join(input, entry.name),
        value = JSON.parse(readFileSync(file, 'utf8'));
      value.toolchain.analyzerSha256 = 'b'.repeat(64);
      const bytes = Buffer.from(JSON.stringify(value) + '\n');
      writeFileSync(file, bytes);
      entry.byteLength = bytes.length;
      entry.sha256 = sha256(bytes);
    }
    writeFileSync(manifestPath, JSON.stringify(manifest));
    analyzeDirectory(input, first);
    analyzeDirectory(first, second);
    expect(
      readFileSync(path.join(second, 'route-capture-raw-v1.json'))
    ).toEqual(readFileSync(path.join(input, 'route-capture-raw-v1.json')));
  });
  it('refuses modified lifecycle receipts even when the raw hash still matches', () => {
    const input = path.join(root, 'receipt-input'),
      output = path.join(root, 'receipt-output');
    const op = createOperation(input, 'capture'),
      c = raw();
    c.attemptId = op.state.attemptId;
    c.toolchain = op.hashes;
    op.running();
    op.write('route-capture-raw-v1.json', c);
    op.finish('complete', 'finished');
    writeFileSync(path.join(input, 'route-capture-running-v1.json'), '{}');
    expect(() => analyzeDirectory(input, output)).toThrow('identity_invalid');
    expect(readdirSync(output)).not.toContain('route-capture-raw-v1.json');
  });
  it.each(
    [119, 120, 121].flatMap((n) =>
      [5000, 5001].map((boundary) => [n, boundary])
    )
  )(
    'requires 121 callbacks for %i intervals starting at %i ms',
    (n, boundary) => {
      const c = raw([boundary, ...Array(n).fill(16)]);
      c.snapshots.push(snapshot());
      Object.assign(c.warmth, {
        state: 'evidence_provided',
        applicationReadyMs: 0,
        assetsSettledMs: 0,
        settleEvidenceSha256: hash,
      });
      c.markers.splice(
        3,
        0,
        marker(0, 'application_ready'),
        marker(0, 'assets_settled')
      );
      const a = analyzeCapture(sync(c));
      const prefix = a.windows.find(
        (w: { kind: string }) => w.kind === 'prefix_120'
      );
      expect(prefix.summary.state).toBe(n < 120 ? 'unavailable' : 'available');
      if (n >= 120) expect(prefix.summary.sampleCount).toBe(120);
      expect(prefix.hardwareQualified).toBe(false);
      expect(a.allIntervals.maxMs).toBe(boundary);
    }
  );
  it('discloses boundary/helper exclusions without treating shared endpoints as overlap', () => {
    const c = raw([5001, 16, 16, 16]);
    c.snapshots.push(snapshot());
    Object.assign(c.warmth, {
      state: 'evidence_provided',
      applicationReadyMs: 0,
      assetsSettledMs: 0,
      settleEvidenceSha256: hash,
    });
    c.markers.push(
      marker(0, 'application_ready'),
      marker(0, 'assets_settled'),
      marker(5017, 'span_begin', 0, 'helper_screenshot'),
      marker(5033, 'span_end', 0, 'helper_screenshot')
    );
    c.markers.sort((a, b) => a.atMs - b.atMs);
    const a = analyzeCapture(sync(c));
    const clean = a.windows.find(
      (w: { kind: string }) => w.kind === 'steady_foreground_candidate'
    );
    expect(clean.eligibleRanges).toEqual([
      { fromInclusive: 1, toExclusive: 2 },
      { fromInclusive: 3, toExclusive: 4 },
    ]);
    expect(
      clean.excludedRanges.map((r: { reasons: string[] }) => r.reasons)
    ).toEqual([
      ['boundary_crossing', 'warmth_unqualified'],
      ['helper_overlap'],
    ]);
    expect(clean.observedDurationMs + clean.excludedDurationMs).toBe(5049);
    c.markers[1].type = 'visibility_hidden';
    expect(
      analyzeCapture(c).windows.find(
        (w: { kind: string }) => w.kind === 'steady_foreground_candidate'
      ).summary.state
    ).toBe('unavailable');
  });
  it('keeps raw evidence when output bounds fail and rejects oversized input before parsing', () => {
    const dir = path.join(root, 'bounded-input'),
      out = path.join(root, 'bounded-output');
    const op = createOperation(dir, 'capture'),
      c = raw();
    c.attemptId = op.state.attemptId;
    c.toolchain = op.hashes;
    c.bounds.maxAnalysisBytes = 100;
    op.running();
    op.write('route-capture-raw-v1.json', c);
    op.finish('complete', 'finished');
    expect(() => analyzeDirectory(dir, out)).toThrow('output_limit');
    expect(readdirSync(out)).toContain('route-capture-raw-v1.json');
    expect(
      JSON.parse(
        readFileSync(path.join(out, 'route-capture-terminal-v1.json'), 'utf8')
      ).reason
    ).toBe('output_limit');
    truncateSync(path.join(dir, 'route-capture-raw-v1.json'), 16777217);
    const oversized = path.join(root, 'oversized-output');
    expect(() => analyzeDirectory(dir, oversized)).toThrow('input_limit');
    expect(readdirSync(oversized)).not.toContain('route-capture-raw-v1.json');
  });
  it('preserves every interval and uses exact nearest ranks including one-second gaps', () => {
    const a = analyzeCapture(raw());
    expect(a.allIntervals).toEqual({
      state: 'available',
      sampleCount: 7,
      p50Ms: 100.001,
      p95Ms: 1500,
      p99Ms: 1500,
      maxMs: 1500,
    });
    expect(
      a.gaps.map((g: { intervalIndex: number }) => g.intervalIndex)
    ).toEqual([3, 4, 5, 6]);
    expect(
      a.gaps.filter((g: { atLeast1000Ms: boolean }) => g.atLeast1000Ms)
    ).toHaveLength(2);
    expect(a.qualification.state).toBe('incomplete');
    const unsorted = analyzeCapture(raw([1500, 16, 1000, 16]));
    expect(unsorted.allIntervals.p50Ms).toBe(16);
  });
  it.each([0, 1, 119, 120, 121])(
    'handles %i completed intervals explicitly',
    (n) => {
      const a = analyzeCapture(raw(Array(n).fill(16)));
      expect(a.allIntervals.state).toBe(n ? 'available' : 'unavailable');
      if (n) expect(a.allIntervals.sampleCount).toBe(n);
    }
  );
  it('rejects unknown keys, unsafe objects, nonfinite numbers, malformed bounds and inconsistent counts', () => {
    expect(() => parseCapture({ ...raw(), extra: true })).toThrow();
    const c = raw();
    c.rafTimestampsMs[1] = NaN;
    expect(() => parseCapture(c)).toThrow();
    const d = raw();
    d.streams.raf.retainedCount++;
    expect(() => parseCapture(d)).toThrow();
    const getter = raw();
    Object.defineProperty(getter, 'kind', {
      get: () => {
        throw new Error('getter invoked');
      },
    });
    expect(() => parseCapture(getter)).toThrow('invalid_input');
    expect(() =>
      parseCapture(Object.assign(Object.create({ malicious: true }), raw()))
    ).toThrow();
    const hook = raw();
    Object.defineProperty(hook, 'toJSON', {
      value: () => {
        throw new Error('hook invoked');
      },
    });
    expect(() => parseCapture(hook)).toThrow('invalid_input');
  });
  it('keeps duplicate/decreasing timestamps as evidence and rejects stream analysis', () => {
    for (const v of [0, -1]) {
      const c = raw();
      c.rafTimestampsMs[2] = c.rafTimestampsMs[1] + v;
      expect(parseCapture(c).rafTimestampsMs[2]).toBe(c.rafTimestampsMs[2]);
      expect(analyzeCapture(c).analysisState).toBe('rejected');
    }
  });
  it('shows symmetric ten-second censoring instead of a misleading short maximum', () => {
    const left = raw([16]);
    left.rafTimestampsMs = [10000, 10016];
    Object.assign(left.coverage, {
      captureStoppedAtMs: 10016,
      firstCallbackAtMs: 10000,
      lastCallbackAtMs: 10016,
      leftCensoredMs: 10000,
    });
    left.markers[3].atMs = 10016;
    left.markers[4].atMs = 10016;
    const right = raw([16]);
    right.coverage.captureStoppedAtMs = 10016;
    right.coverage.rightCensoredMs = 10000;
    right.markers[3].atMs = 10016;
    right.markers[4].atMs = 10016;
    for (const c of [left, right]) {
      const a = analyzeCapture(c);
      expect(a.coverage.state).toBe('incomplete');
      expect(a.allIntervals.maxMs).toBe(16);
      expect(a.windows[0].censoredDurationMs).toBe(10000);
      expect(a.windows[0].coverageState).toBe('incomplete');
    }
  });
  it('retains helper and hidden overlap while preserving unexplained foreground stalls', () => {
    const c = raw([1200]);
    expect(analyzeCapture(c).gaps[0].classification).toBe('unclassified');
    c.markers.splice(
      3,
      0,
      marker(10, 'span_begin', 0, 'helper_screenshot'),
      marker(20, 'visibility_hidden'),
      marker(30, 'span_end', 0, 'helper_screenshot')
    );
    expect(analyzeCapture(sync(c)).gaps[0].classification).toBe(
      'overlaps_helper_and_interruption'
    );
    expect(analyzeCapture(c).allIntervals.maxMs).toBe(1200);
    c.markers = c.markers.filter((m) => !m.type.startsWith('visibility'));
    expect(analyzeCapture(sync(c)).coverage.reasons).toContain(
      'visibility_unknown'
    );
  });
  it('uses retained Long Task delivery prefixes, including late earlier-start records and final drain', () => {
    const c = raw([300]);
    c.longTasks = [
      { startMs: 100, durationMs: 50 },
      { startMs: 10, durationMs: 60 },
      { startMs: 200, durationMs: 80 },
    ];
    Object.assign(c.streams.longTasks, { retainedCount: 3, observedCount: 3 });
    const p = projectLegacyProbe(c, {
      atMs: 150,
      callbackCount: 1,
      longTaskDeliveryCount: 1,
    });
    expect(p.longTaskCount).toBe(1);
    expect(p.longTaskTotalMs).toBe(50);
    expect(p.longTaskMaxMs).toBe(50);
    expect(analyzeCapture(c).longTasks.totalMs).toBe(190);
    c.streams.longTasks.state = 'unsupported';
    c.longTasks = [];
    Object.assign(c.streams.longTasks, { retainedCount: 0, observedCount: 0 });
    c.capabilities.longTaskTiming = 'unsupported';
    expect(
      projectLegacyProbe(c, {
        atMs: 300,
        callbackCount: 2,
        longTaskDeliveryCount: 0,
      }).longTaskCount
    ).toBe(-1);
    expect(analyzeCapture(c).longTasks.totalMs).toBeNull();
  });
  it('refuses incompatible or unbound comparisons and never qualifies matching synthetic data', () => {
    const c = raw();
    expect(compareCaptures(c, c)).toMatchObject({
      state: 'diagnostic_profile_comparable',
      hardwareQualified: false,
    });
    for (const change of [
      (v: typeof c) => {
        v.profile.browserVersion = 'other';
      },
      (v: typeof c) => {
        v.profile.devicePixelRatio = 2;
      },
      (v: typeof c) => {
        v.profile.quality = 'cinematic';
      },
      (v: typeof c) => {
        v.toolchain.probeSha256 = 'b'.repeat(64);
      },
      (v: typeof c) => {
        v.source.routeContractSha256 = 'b'.repeat(64);
      },
    ]) {
      const candidate = raw();
      change(candidate);
      expect(compareCaptures(c, candidate).state).toBe('incompatible');
    }
    const unknown = raw();
    unknown.source.artifactReceiptState = 'unbound';
    Object.assign(unknown.source, { artifactId: null });
    expect(compareCaptures(c, unknown).state).toBe('incompatible');
  });
  it('writes immutable receipts and hash-bound input copies, refusing collisions and invalid input', () => {
    const input = path.join(root, 'input'),
      output = path.join(root, 'output');
    const op = createOperation(input, 'capture');
    const c = raw();
    c.attemptId = op.state.attemptId;
    c.toolchain = op.hashes;
    op.running();
    op.write('route-capture-raw-v1.json', c);
    op.finish('complete', 'finished');
    analyzeDirectory(input, output);
    expect(readFileSync(path.join(input, 'route-capture-raw-v1.json'))).toEqual(
      readFileSync(path.join(output, 'route-capture-raw-v1.json'))
    );
    expect(readdirSync(output)).toHaveLength(6);
    expect(() => analyzeDirectory(input, output)).toThrow();
    const initial = readFileSync(
      path.join(input, 'route-capture-initial-v1.json')
    );
    writeFileSync(path.join(input, 'route-capture-raw-v1.json'), '{}');
    const bad = path.join(root, 'bad');
    expect(() => analyzeDirectory(input, bad)).toThrow('identity_invalid');
    expect(
      JSON.parse(
        readFileSync(path.join(bad, 'route-capture-terminal-v1.json'), 'utf8')
      ).reason
    ).toBe('identity_invalid');
    expect(
      readFileSync(path.join(input, 'route-capture-initial-v1.json'))
    ).toEqual(initial);
  });
  it('keeps interrupted receipt phases distinct and rejects contradictory terminal receipts', () => {
    const dir = path.join(root, 'interrupted');
    const op = createOperation(dir, 'analysis');
    expect(readdirSync(dir)).toEqual(['route-capture-initial-v1.json']);
    op.running();
    expect(readdirSync(dir)).toHaveLength(2);
    const receipt = JSON.parse(
      readFileSync(path.join(dir, 'route-capture-running-v1.json'), 'utf8')
    );
    expect(() =>
      validateArtifact({
        ...receipt,
        phase: 'terminal',
        state: 'complete',
        reason: 'cancelled',
      })
    ).toThrow();
    expect(
      sha256(readFileSync(path.join(dir, 'route-capture-initial-v1.json')))
    ).toHaveLength(64);
  });
});
