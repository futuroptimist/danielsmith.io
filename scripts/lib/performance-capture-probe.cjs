// This function is serialized by Playwright. Keep every dependency inside it.
function installRouteCapture(config, validateOnly = false) {
  const maxima = {
    maxDurationMs: 1200000,
    maxRafIntervals: 300000,
    maxLongTasks: 10000,
    maxMarkers: 4096,
    maxSnapshots: 512,
    maxLabels: 256,
    maxWindows: 128,
    maxChunkRecords: 4096,
    maxRawBytes: 16777216,
    maxAnalysisBytes: 16777216,
    maxFinalizationGraceMs: 15000,
    maxPageCallMs: 2000,
  };
  const reject = () => {
    throw new Error('invalid_input');
  };
  const plain = (v) =>
    v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype;
  if (
    !plain(config) ||
    Object.keys(config).sort().join(',') !== 'bounds,labels' ||
    !plain(config.bounds) ||
    Object.keys(config.bounds).length !== Object.keys(maxima).length
  )
    reject();
  for (const [k, max] of Object.entries(maxima))
    if (
      !Number.isInteger(config.bounds[k]) ||
      config.bounds[k] < 1 ||
      config.bounds[k] > max ||
      (k === 'maxPageCallMs' && config.bounds[k] !== 2000)
    )
      reject();
  if (
    !Array.isArray(config.labels) ||
    config.labels.length > config.bounds.maxLabels ||
    new Set(config.labels).size !== config.labels.length ||
    !config.labels.every(
      (x) => typeof x === 'string' && /^[A-Za-z0-9._:-]{1,64}$/.test(x)
    )
  )
    reject();
  if (validateOnly) return;
  if (window !== window.top) return;
  if (Object.hasOwn(window, '__routeCapture'))
    throw new Error('capture_already_installed');
  const bounds = { ...config.bounds },
    labels = [...config.labels];
  const types = [
    'init',
    'application_ready',
    'assets_settled',
    'route_begin',
    'route_end',
    'checkpoint',
    'cycle_begin',
    'cycle_end',
    'visibility_hidden',
    'visibility_visible',
    'app_mode_changed',
    'span_begin',
    'span_end',
    'synthetic_pagehide',
    'real_pagehide',
    'cancel',
    'limit',
    'stop',
  ];
  const kinds = [
    'helper_path_search',
    'helper_screenshot',
    'helper_snapshot',
    'helper_file_io',
    'helper_serialization',
    'route',
    'visibility',
    'interruption',
  ];
  const times = new Float64Array(bounds.maxRafIntervals + 1),
    tasks = new Float64Array(bounds.maxLongTasks * 2);
  const markers = [],
    snapshots = [],
    open = new Map();
  const stream = () => ({
    state: 'complete',
    retainedCount: 0,
    observedCount: 0,
    unrecordedCount: 0,
    firstUnrecordedAtMs: null,
  });
  const streams = {
    raf: stream(),
    longTasks: stream(),
    markers: stream(),
    snapshots: stream(),
  };
  let stopped = false,
    disposed = false,
    stopping = false,
    callback = null,
    timer = null,
    observer = null,
    stopAt = null,
    reason = null,
    nextSpan = 0;
  const finite = (t) =>
    typeof t === 'number' &&
    Number.isFinite(t) &&
    t >= 0 &&
    t <= Number.MAX_SAFE_INTEGER;
  const startedAt = performance.now();
  if (!finite(startedAt)) throw new Error('invalid_clock');
  let lastClock = startedAt;
  function now() {
    const t = performance.now();
    if (!finite(t) || t < lastClock) {
      streams.raf.state = 'clock_invalid';
      streams.raf.unrecordedCount = null;
      stop('failure', null);
      return null;
    }
    lastClock = t;
    return t;
  }
  function capacity(name, t) {
    reason = 'capacity';
    const s = streams[name];
    s.state = 'capacity_stop';
    s.firstUnrecordedAtMs = t;
    s.unrecordedCount = null;
    stop('capacity', t);
  }
  function record(
    type,
    labelId = null,
    spanId = null,
    spanKind = null,
    at = now()
  ) {
    if (at === null || stopped) return false;
    const s = streams.markers;
    s.observedCount++;
    if (markers.length === bounds.maxMarkers) {
      capacity('markers', at);
      return false;
    }
    markers.push({ atMs: at, type, labelId, spanId, spanKind });
    s.retainedCount++;
    return true;
  }
  function label(id) {
    if (id !== null && (!Number.isInteger(id) || id < 0 || id >= labels.length))
      reject();
  }
  function mark(type, id = null) {
    if (!types.includes(type) || type === 'span_begin' || type === 'span_end')
      reject();
    label(id);
    return record(type, id);
  }
  function beginSpan(kind, id = null) {
    if (!kinds.includes(kind)) reject();
    label(id);
    if (stopped) return null;
    if (nextSpan >= 4096) {
      capacity('markers', now());
      return null;
    }
    const span = nextSpan++;
    if (record('span_begin', id, span, kind)) open.set(span, { kind, id });
    return span;
  }
  function endSpan(id) {
    if (stopped) return;
    const span = open.get(id);
    if (!span) throw new Error('unmatched_span');
    if (record('span_end', span.id, id, span.kind)) open.delete(id);
  }
  function acceptTasks(entries) {
    if (stopped) return;
    const at = now();
    if (at === null) return;
    for (const entry of entries) {
      const s = streams.longTasks;
      s.observedCount++;
      if (
        !finite(entry.startTime) ||
        !finite(entry.duration) ||
        entry.startTime + entry.duration > at
      ) {
        s.state = 'clock_invalid';
        s.unrecordedCount = null;
        stop('failure', at);
        return;
      }
      if (s.retainedCount === bounds.maxLongTasks) {
        capacity('longTasks', at);
        return;
      }
      tasks[s.retainedCount * 2] = entry.startTime;
      tasks[s.retainedCount * 2 + 1] = entry.duration;
      s.retainedCount++;
    }
  }
  function tick(t) {
    callback = null;
    if (stopped) return;
    const s = streams.raf;
    s.observedCount++;
    if (!finite(t) || t < startedAt) {
      s.state = 'clock_invalid';
      s.unrecordedCount = null;
      stop('failure', now());
      return;
    }
    if (s.retainedCount === times.length) {
      capacity('raf', t);
      return;
    }
    times[s.retainedCount++] = t;
    if (t >= startedAt + bounds.maxDurationMs) {
      stop('deadline', t);
      return;
    }
    callback = requestAnimationFrame(tick);
  }
  function stop(why = 'finished', at) {
    if (stopped || stopping) return status();
    if (
      ![
        'finished',
        'pagehide',
        'page_closed',
        'cancelled',
        'failure',
        'capacity',
        'deadline',
      ].includes(why)
    )
      reject();
    stopping = true;
    reason = why;
    if (at === undefined) {
      const t = performance.now();
      at = finite(t) && t >= lastClock ? t : null;
      if (at === null) {
        streams.raf.state = 'clock_invalid';
        streams.raf.unrecordedCount = null;
        reason = 'failure';
      }
    }
    stopAt = at;
    if (callback !== null) cancelAnimationFrame(callback);
    callback = null;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (observer) {
      const pending = observer.takeRecords();
      acceptTasks(pending);
      observer.disconnect();
      observer = null;
    }
    // Do not fabricate a final marker when the marker stream is exhausted.
    if (at !== null && streams.markers.state === 'complete')
      record('stop', null, null, null, at);
    stopped = true;
    stopping = false;
    removeListeners();
    return status();
  }
  function status() {
    return {
      stopped,
      stopReason: reason,
      captureStartedAtMs: startedAt,
      captureStoppedAtMs: stopAt,
      plannedDeadlineAtMs: startedAt + bounds.maxDurationMs,
      streams: Object.fromEntries(
        Object.entries(streams).map(([k, v]) => [k, { ...v }])
      ),
      unfinishedSpanIds: [...open.keys()],
      numericBufferBytes: times.byteLength + tasks.byteLength,
    };
  }
  function visibility() {
    mark(
      document.visibilityState === 'hidden'
        ? 'visibility_hidden'
        : 'visibility_visible'
    );
  }
  function pagehide(event) {
    if (event.isTrusted) {
      mark('real_pagehide');
      stop('pagehide');
    } else mark('synthetic_pagehide');
  }
  function removeListeners() {
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('pagehide', pagehide);
  }
  function dispose() {
    if (disposed) return;
    stop('cancelled');
    removeListeners();
    disposed = true;
  }
  window.__routeCapture = {
    mark,
    beginSpan,
    endSpan,
    prefix: () => ({
      atMs: now(),
      lastCallbackAtMs: streams.raf.retainedCount
        ? times[streams.raf.retainedCount - 1]
        : null,
      callbackCount: streams.raf.retainedCount,
      longTaskDeliveryCount: streams.longTasks.retainedCount,
    }),
    stop,
    dispose,
    snapshot(value) {
      if (stopped) return;
      const keys = [
        'atMs',
        'rendererClass',
        'appMode',
        'quality',
        'devicePixelRatio',
        'calls',
        'triangles',
        'memoryGeometries',
        'memoryTextures',
      ];
      if (
        !plain(value) ||
        Object.keys(value).length !== keys.length ||
        !keys.every((k) => Object.hasOwn(value, k))
      )
        reject();
      if (
        !['hardware', 'software', 'unknown', 'fallback'].includes(
          value.rendererClass
        ) ||
        !['immersive', 'fallback', 'unknown'].includes(value.appMode) ||
        !['performance', 'balanced', 'cinematic', 'unknown'].includes(
          value.quality
        ) ||
        !finite(value.atMs) ||
        !(value.devicePixelRatio > 0 && value.devicePixelRatio <= 16) ||
        !['calls', 'triangles', 'memoryGeometries', 'memoryTextures'].every(
          (k) => Number.isSafeInteger(value[k]) && value[k] >= 0
        )
      )
        reject();
      streams.snapshots.observedCount++;
      if (snapshots.length === bounds.maxSnapshots) {
        capacity('snapshots', now());
        return;
      }
      snapshots.push({ ...value });
      streams.snapshots.retainedCount++;
    },
    readChunk(name, offset, limit) {
      if (!stopped) throw new Error('capture_running');
      if (
        !Number.isInteger(offset) ||
        offset < 0 ||
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > bounds.maxChunkRecords
      )
        reject();
      const key = {
        rafTimestampsMs: 'raf',
        longTasks: 'longTasks',
        markers: 'markers',
        snapshots: 'snapshots',
      }[name];
      if (!key || offset > streams[key].retainedCount) reject();
      const end = Math.min(offset + limit, streams[key].retainedCount),
        out = [];
      for (let i = offset; i < end; i++)
        out.push(
          name === 'rafTimestampsMs'
            ? times[i]
            : name === 'longTasks'
              ? { startMs: tasks[i * 2], durationMs: tasks[i * 2 + 1] }
              : { ...(name === 'markers' ? markers[i] : snapshots[i]) }
        );
      return out;
    },
  };
  record('init', null, null, null, startedAt);
  record(
    document.visibilityState === 'hidden'
      ? 'visibility_hidden'
      : 'visibility_visible',
    null,
    null,
    null,
    startedAt
  );
  if (stopped) return;
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', pagehide);
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes('longtask'))
      throw new Error('unsupported');
    observer = new PerformanceObserver((list) =>
      acceptTasks(list.getEntries())
    );
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    observer?.disconnect();
    observer = null;
    streams.longTasks.state = 'unsupported';
  }
  callback = requestAnimationFrame(tick);
  timer = setTimeout(() => stop('deadline'), bounds.maxDurationMs);
}
const DEFAULT_BOUNDS = {
  maxDurationMs: 1200000,
  maxRafIntervals: 300000,
  maxLongTasks: 10000,
  maxMarkers: 4096,
  maxSnapshots: 512,
  maxLabels: 256,
  maxWindows: 128,
  maxChunkRecords: 4096,
  maxRawBytes: 16777216,
  maxAnalysisBytes: 16777216,
  maxFinalizationGraceMs: 15000,
  maxPageCallMs: 2000,
};
module.exports = {
  installRouteCapture,
  validateRouteCaptureConfig: (config) => installRouteCapture(config, true),
  DEFAULT_BOUNDS,
};
