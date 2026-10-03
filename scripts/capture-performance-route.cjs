/* Read-only diagnostics plus genuine runtime collision stepping. No scene edits. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireFromRepo = createRequire(path.join(process.cwd(), 'package.json'));
const { chromium } = requireFromRepo('@playwright/test');
const output = process.argv[2];
if (!output)
  throw new Error(
    'Usage: node scripts/capture-performance-route.cjs OUTPUT_DIRECTORY'
  );
const dwellMs = 5000;
const includeBasement = process.argv.includes('--basement');
(async () => {
  // Refuse to overwrite an earlier attempt, including failed or unsupported runs.
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  await fs.mkdir(output);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const result = {
    schemaVersion: 1,
    profile: includeBasement
      ? 'house-basement-route-v1'
      : 'house-common-route-v1',
    startedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    viewport: { width: 1280, height: 720 },
    dwellMs,
    checkpoints: [],
    legs: [],
    unavailableCheckpoints: includeBasement
      ? ['exterior']
      : ['basement', 'exterior'],
    state: 'running',
  };
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [key, value] of Object.entries({
      webdriver: false,
      hardwareConcurrency: 8,
      deviceMemory: 8,
    })) {
      for (const target of [navigator, Navigator.prototype]) {
        try {
          Object.defineProperty(target, key, {
            configurable: true,
            get: () => value,
          });
        } catch {
          /* Reported overrides match existing suite. */
        }
      }
    }
    const times = [];
    let previous;
    let longTaskCount = 0,
      longTaskTotalMs = 0,
      longTaskMaxMs = 0;
    const tick = (now) => {
      if (previous !== undefined) times.push(now - previous);
      previous = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          longTaskCount++;
          longTaskTotalMs += entry.duration;
          longTaskMaxMs = Math.max(longTaskMaxMs, entry.duration);
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      longTaskCount = -1;
    }
    window.__routeProbe = {
      read: () => {
        const sorted = [...times].sort((a, b) => a - b);
        return {
          elapsedMs: performance.now(),
          rafSampleCount: times.length,
          rafP95Ms:
            sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
          rafMaxMs: sorted.at(-1) ?? null,
          rafIntervalsAtLeast1000Ms: times.filter((t) => t >= 1000).length,
          longTaskCount,
          longTaskTotalMs,
          longTaskMaxMs,
        };
      },
    };
  });
  async function checkpoint(name) {
    const arrival = await page.evaluate(() => ({
      timeMs: performance.now(),
      snapshot: window.portfolio.performance.getSnapshot(),
    }));
    await page.waitForTimeout(dwellMs);
    const record = await page.evaluate(() => {
      const p = window.portfolio;
      const cameraState = p.world.getCameraState?.() ?? null;
      const snapshot = p.performance.getSnapshot();
      // Keep bounded class/policy metadata. Do not retain raw GPU identifiers.
      snapshot.renderer = {
        isSoftwareRenderer: snapshot.renderer.isSoftwareRenderer,
        isDangerousSoftwareRenderer:
          snapshot.renderer.isDangerousSoftwareRenderer,
        riskLevel: snapshot.renderer.riskLevel,
      };
      return {
        timeMs: performance.now(),
        snapshot,
        position: p.world.getPlayerPosition(),
        floor: p.world.getActiveFloor(),
        coordinates: p.debugCoordinates.getState(),
        visibility: p.world.getFloorVisibilitySnapshot(),
        camera: {
          zoom: p.graphics.getCameraZoom(),
          zoomTarget: p.graphics.getCameraZoomTarget(),
          initialFraming: p.graphics.getInitialCameraFraming(),
          position: cameraState?.position ?? null,
          focus: cameraState?.focus ?? null,
          cutawaySourceIds: cameraState?.cutawaySourceIds ?? null,
          positionUnavailableReason: cameraState
            ? null
            : 'Camera state API unavailable in this source commit',
          panInput: { x: 0, y: 0 },
        },
        overlay: {
          visibleDialogCount: [
            ...document.querySelectorAll('[role=dialog]'),
          ].filter((e) => e.getClientRects().length > 0).length,
          debugCoordinatesEnabled: p.debugCoordinates.getState().enabled,
        },
        stallProbe: window.__routeProbe.read(),
        locale: document.documentElement.lang,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    });
    result.checkpoints.push({
      name,
      measuredAt: new Date().toISOString(),
      arrivalMs: arrival.timeMs,
      capturedMs: record.timeMs,
      actualDwellMs: record.timeMs - arrival.timeMs,
      arrivalSampleCount: arrival.snapshot.sampleCount,
      rollingWindowWhollyAfterArrival: null,
      ...record,
    });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
    await fs.writeFile(
      path.join(output, 'route.json'),
      `${JSON.stringify(result, null, 2)}\n`
    );
  }
  async function walk(name, waypoints, requiredFloor) {
    const leg = await page.evaluate(
      async ({ name, waypoints, requiredFloor }) => {
        const w = window.portfolio.world;
        const startMs = performance.now();
        const start = {
          position: w.getPlayerPosition(),
          floor: w.getActiveFloor(),
        };
        let stepCount = 0,
          blockedSteps = 0,
          maxHeightChange = 0;
        const floors = new Set([start.floor]);
        const reached = [];
        for (const target of waypoints) {
          let complete = false;
          for (let i = 0; i < 600; i++) {
            const before = w.getPlayerPosition();
            const dx = Math.max(-0.12, Math.min(0.12, target.x - before.x));
            const dz = Math.max(-0.12, Math.min(0.12, target.z - before.z));
            if (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) {
              complete = true;
              break;
            }
            const step = w.stepPlayerForTest({ dx, dz });
            stepCount++;
            floors.add(step.activeFloor);
            maxHeightChange = Math.max(
              maxHeightChange,
              Math.abs(step.position.y - before.y)
            );
            if ((dx && !step.movedX) || (dz && !step.movedZ)) {
              blockedSteps++;
              return {
                name,
                state: 'blocked',
                startMs,
                endMs: performance.now(),
                start,
                target,
                position: step.position,
                blockedBy: step.blockedBy ?? [],
                stepCount,
                blockedSteps,
                maxHeightChange,
                floors: [...floors],
                reached,
              };
            }
            if (requiredFloor && step.activeFloor !== requiredFloor)
              throw new Error(
                `Unexpected floor ${step.activeFloor} in ${name}`
              );
            // Runtime stepping follows real axis-by-axis collision logic; pacing lets rendering run.
            if (stepCount % 8 === 0)
              await new Promise((r) => setTimeout(r, 16));
          }
          if (!complete) throw new Error(`Waypoint not reached in ${name}`);
          reached.push(target);
        }
        return {
          name,
          state: 'completed',
          startMs,
          endMs: performance.now(),
          start,
          final: { position: w.getPlayerPosition(), floor: w.getActiveFloor() },
          stepCount,
          blockedSteps,
          maxHeightChange,
          floors: [...floors],
          reached,
        };
      },
      { name, waypoints, requiredFloor }
    );
    result.legs.push(leg);
    await fs.writeFile(
      path.join(output, 'route.json'),
      `${JSON.stringify(result, null, 2)}\n`
    );
    if (leg.state !== 'completed')
      throw new Error(`Route blocked: ${JSON.stringify(leg)}`);
  }
  try {
    await page.goto(
      'http://127.0.0.1:5173/?mode=immersive&disablePerformanceFailover=1',
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.appMode === 'immersive' &&
        !!window.portfolio?.world &&
        !!window.portfolio?.performance,
      null,
      { timeout: 45000 }
    );
    result.servedBuild = await (
      await page.request.get('http://127.0.0.1:5173/runtime/build-info.json')
    ).json();
    result.stairMetrics = await page.evaluate(() =>
      window.portfolio.world.getStairMetrics()
    );
    result.spawn = await page.evaluate(() =>
      window.portfolio.world.getPlayerPosition()
    );
    await checkpoint('spawn');
    if (includeBasement) {
      const metrics = await page.evaluate(() =>
        window.portfolio.world.getStairMetrics('basement-ground')
      );
      const landing = { x: metrics.stairCenterX, z: metrics.stairTopZ + 3 };
      const toe = { x: metrics.stairCenterX, z: metrics.stairBottomZ - 3.2 };
      await walk(
        'spawn-to-basement-landing',
        [{ x: 0, z: landing.z }, landing],
        'ground'
      );
      await checkpoint('basement-ground-landing');
      await walk('basement-descent', [toe]);
      await checkpoint('basement-lower-toe');
      await walk(
        'basement-museum-loop',
        [
          { x: -3, z: toe.z },
          { x: -18, z: toe.z },
          { x: -18, z: -15.5 },
          { x: -18, z: 4.5 },
          { x: 20, z: 4.5 },
          { x: 20, z: -17.5 },
          { x: 20, z: toe.z },
          toe,
        ],
        'basement'
      );
      await checkpoint('basement-museum-loop-complete');
      await walk('basement-ascent', [landing]);
      await walk(
        'basement-landing-to-spawn',
        [{ x: 0, z: landing.z }, result.spawn],
        'ground'
      );
    }
    const m = result.stairMetrics;
    const entrance = {
      x: m.stairCenterX,
      z: m.stairBottomZ - m.stairDirection * 0.3,
    };
    // Frozen source-audited route, found with read-only occupancy BFS and verified by runtime steps.
    const groundPath = [
      { x: 0, z: -20.0 },
      { x: -15.0, z: -20.0 },
      { x: -15.0, z: -7.1 },
      { x: -14.7, z: -7.1 },
      { x: -14.7, z: -6.8 },
      { x: -10.2, z: -6.8 },
      { x: -10.2, z: -5.0 },
      { x: -9.9, z: -5.0 },
      { x: -9.9, z: -4.7 },
      { x: -8.7, z: -4.7 },
      { x: -8.7, z: -4.4 },
      { x: -5.1, z: -4.4 },
      { x: -5.1, z: 0.7 },
      { x: -4.8, z: 0.7 },
      { x: -4.8, z: 1.0 },
      { x: 1.2, z: 1.0 },
      { x: 1.2, z: -1.1 },
      { x: 12.3, z: -1.1 },
      { x: 12.3, z: -10.1 },
      { x: 12.4, z: -10.3 },
    ];
    await walk('spawn-to-stair-entrance', groundPath, 'ground');
    await walk('upper-ascent', [
      { x: m.stairCenterX, z: m.stairTopZ + m.stairDirection * 0.9 },
    ]);
    await checkpoint('upper-landing');
    const laneX = m.stairCenterX - m.stairHalfWidth + 0.75 * 0.75;
    const upperPath = [
      { x: m.stairCenterX, z: m.stairTopZ + m.stairDirection * 0.05 },
      { x: laneX, z: m.stairTopZ + m.stairDirection * 0.05 },
      { x: laneX, z: -29 },
      { x: 4.75, z: -29 },
      { x: 3.25, z: -29 },
      { x: -8, z: -29 },
      { x: -8, z: -16 },
    ];
    await walk('upper-west-egress-to-studio', upperPath, 'upper');
    await checkpoint('upper-creators-studio');
    await walk('studio-to-upper-landing', [...upperPath].reverse(), 'upper');
    await walk('upper-descent', [entrance]);
    await walk('stair-entrance-to-spawn', [...groundPath].reverse(), 'ground');
    await checkpoint('returned-spawn');
    result.state = 'completed';
    result.wholeRouteStallProbe = await page.evaluate(() =>
      window.__routeProbe.read()
    );
  } catch (error) {
    result.state = 'failed';
    result.error = error.message;
    await page
      .screenshot({ path: path.join(output, 'failure.png') })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    result.finishedAt = new Date().toISOString();
    await fs.writeFile(
      path.join(output, 'route.json'),
      `${JSON.stringify(result, null, 2)}\n`
    );
    await context.close();
    await browser.close();
  }
  console.log(
    JSON.stringify(
      {
        state: result.state,
        error: result.error,
        checkpoints: result.checkpoints.map((c) => ({
          name: c.name,
          counters: c.snapshot.rendererCounters,
          p95FrameMs: c.snapshot.p95FrameMs,
          floor: c.floor,
        })),
        legs: result.legs.map((l) => ({
          name: l.name,
          state: l.state,
          stepCount: l.stepCount,
        })),
      },
      null,
      2
    )
  );
})();
