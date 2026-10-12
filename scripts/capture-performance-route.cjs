/* Read-only diagnostics plus genuine runtime collision stepping. No scene edits. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireFromRepo = createRequire(path.join(process.cwd(), 'package.json'));
const output = process.argv[2];
if (require.main === module && !output)
  throw new Error(
    'Usage: node scripts/capture-performance-route.cjs OUTPUT_DIRECTORY'
  );
const dwellMs = 5000;
const includeStreet = process.argv.includes('--street');
const includeGarage = process.argv.includes('--garage') || includeStreet;
const includeExterior = process.argv.includes('--exterior') || includeGarage;
const includeBasement = process.argv.includes('--basement') || includeExterior;
async function runRoute(evidence = null) {
  const { chromium } = requireFromRepo('@playwright/test');
  // Refuse to overwrite an earlier attempt, including failed or unsupported runs.
  await fs.mkdir(path.dirname(path.resolve(output)), { recursive: true });
  if (!evidence) await fs.mkdir(output);
  const browser = await chromium.launch();
  if (evidence) evidence.browser = browser;
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    reducedMotion: 'no-preference',
  });
  if (evidence) evidence.context = context;
  const originalPage = await context.newPage();
  const page = evidence ? evidence.attach(originalPage) : originalPage;
  const result = {
    schemaVersion: 1,
    profile: includeStreet
      ? 'house-residential-street-route-v3'
      : includeGarage
        ? 'house-attached-garage-route-v3'
        : includeExterior
          ? 'house-front-entry-route-v2'
          : includeBasement
            ? 'house-basement-route-v1'
            : 'house-common-route-v1',
    startedAt: new Date().toISOString(),
    browserVersion: browser.version(),
    viewport: { width: 1280, height: 720 },
    dwellMs,
    checkpoints: [],
    legs: [],
    unavailableCheckpoints: includeStreet
      ? []
      : includeGarage
        ? ['street']
        : includeExterior
          ? ['garage', 'street']
          : includeBasement
            ? ['exterior']
            : ['basement', 'exterior'],
    state: 'running',
  };
  if (evidence) await evidence.install();
  await page.addInitScript((captureEvidence) => {
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
    if (captureEvidence) {
      window.__routeProbe = {
        read: () => ({
          ...window.__routeCapture.prefix(),
          rafP95Ms: null,
          rafMaxMs: null,
        }),
      };
      return;
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
  }, Boolean(evidence));
  async function exteriorPath(target) {
    return page.evaluate(function searchPath(target) {
      const w = window.portfolio.world;
      const start = w.getPlayerPosition();
      const grid = 0.2;
      // Anchor the grid to the valid live pose instead of snapping into a solid.
      const queue = [
        {
          x: start.x,
          z: start.z,
          cellX: 0,
          cellZ: 0,
          parent: -1,
        },
      ];
      const seen = new Set(['0,0']);
      const connections = w.getFloorConnectionSnapshot().connections;
      for (let index = 0; index < queue.length && index < 300000; index++) {
        const node = queue[index];
        if (Math.hypot(node.x - target.x, node.z - target.z) < 0.3) {
          const path = [];
          for (let i = index; i >= 0; i = queue[i].parent)
            path.push({ x: queue[i].x, z: queue[i].z });
          return [...path.reverse(), target];
        }
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const cellX = node.cellX + dx;
          const cellZ = node.cellZ + dz;
          const next = {
            x: start.x + cellX * grid,
            z: start.z + cellZ * grid,
            cellX,
            cellZ,
            parent: index,
          };
          const key = `${cellX},${cellZ}`;
          if (
            seen.has(key) ||
            next.x < -32 ||
            next.x > 80 ||
            next.z < -36 ||
            next.z > 48
          )
            continue;
          seen.add(key);
          if (
            !w.canOccupyPosition({ ...next, floorId: 'ground' }) ||
            w.predictFloorAt({ ...next, currentFloor: 'ground' }) !== 'ground'
          )
            continue;
          if (
            connections.some(
              (c) =>
                ![
                  'outsideStairs',
                  'safeUpperFloor',
                  'upperLanding',
                  'lowerStairEntrance',
                ].includes(
                  w.getStairTransitionZone({
                    ...next,
                    currentFloor: 'ground',
                    connectionId: c.id,
                  })
                )
            )
          )
            continue;
          queue.push(next);
        }
      }
      throw new Error(`No exterior capture route to ${JSON.stringify(target)}`);
    }, target);
  }
  async function waitForDoor(id, state) {
    await page.waitForFunction(
      ({ id, state }) => {
        const door = window.portfolio.world
          .getDoorSnapshots()
          .find((door) => door.id === id);
        return (
          door?.state === state && door.target === (state === 'open' ? 1 : 0)
        );
      },
      { id, state }
    );
  }
  async function operateDoor(id, state) {
    // Only deliberate stationary manual changes use a click. First approach
    // waits for proximity, which can change target between a read and a click.
    await waitForDoor(id, state === 'open' ? 'closed' : 'open');
    await page
      .locator(`[data-exterior-door-control][data-door-id="${id}"]`)
      .click();
    await waitForDoor(id, state);
  }
  async function checkpoint(name, expectedDoor = null) {
    if (evidence) await evidence.mark('checkpoint', name);
    const assertDoorState = (doors) => {
      if (!expectedDoor) return;
      const door = doors.find((candidate) => candidate.id === expectedDoor.id);
      if (door?.state !== expectedDoor.state)
        throw new Error(
          `Unexpected door state at ${name}: ${JSON.stringify({ expectedDoor, door })}`
        );
    };
    const arrival = await page.evaluate(() => ({
      timeMs: performance.now(),
      snapshot: window.portfolio.performance.getSnapshot(),
      doors: window.portfolio.world.getDoorSnapshots?.() ?? [],
    }));
    assertDoorState(arrival.doors);
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
        doors: p.world.getDoorSnapshots?.() ?? [],
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
        ...(window.__routeCapture
          ? {
              captureAppMode: ['immersive', 'fallback'].includes(
                document.documentElement.dataset.appMode
              )
                ? document.documentElement.dataset.appMode
                : 'unknown',
            }
          : {}),
        locale: document.documentElement.lang,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      };
    });
    assertDoorState(record.doors);
    if (evidence) await evidence.checkpoint(name, record);
    result.checkpoints.push({
      name,
      expectedDoor,
      measuredAt: new Date().toISOString(),
      arrivalMs: arrival.timeMs,
      capturedMs: record.timeMs,
      actualDwellMs: record.timeMs - arrival.timeMs,
      arrivalSampleCount: arrival.snapshot.sampleCount,
      rollingWindowWhollyAfterArrival: null,
      ...record,
    });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
    await writeRouteFile(
      path.join(output, 'route.json'),
      () => `${JSON.stringify(result, null, 2)}\n`
    );
  }
  async function walk(name, waypoints, requiredFloor) {
    const leg = await page.evaluate(
      async function stepRoute({ name, waypoints, requiredFloor }) {
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
    await writeRouteFile(
      path.join(output, 'route.json'),
      () => `${JSON.stringify(result, null, 2)}\n`
    );
    if (leg.state !== 'completed')
      throw new Error(`Route blocked: ${JSON.stringify(leg)}`);
  }
  async function writeRouteFile(file, serialize) {
    if (evidence) {
      const data = await evidence.span('helper_serialization', serialize);
      return evidence.span('helper_file_io', () => fs.writeFile(file, data));
    }
    return fs.writeFile(file, serialize());
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
    if (evidence) {
      await evidence.mark('application_ready');
      await evidence.mark('route_begin');
    }
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
      const museum = await page.evaluate(() =>
        window.portfolio.poi?.getCareerMuseumState?.()
      );
      if (museum?.exhibits?.length) {
        // These source-audited approaches match the native museum regression.
        // The shell-only route intersects the now-solid display stands.
        if (!includeExterior) result.profile = 'house-career-museum-route-v1';
        const approaches = [
          [
            'career-southern-mississippi',
            [
              { x: -24, z: toe.z },
              { x: -24, z: -15.5 },
              { x: -18, z: -15.5 },
            ],
          ],
          [
            'career-naval-research',
            [
              { x: -24, z: -15.5 },
              { x: -24, z: 4.5 },
              { x: -18, z: 4.5 },
            ],
          ],
          ['career-youtube', [{ x: 20, z: 4.5 }]],
          [
            'career-muon-space',
            [
              { x: 26, z: 4.5 },
              { x: 26, z: -17.5 },
              { x: 20, z: -17.5 },
            ],
          ],
        ];
        for (const [id, points] of approaches) {
          if (!museum.exhibits.some((exhibit) => exhibit.id === id))
            throw new Error(`Museum capture requires exhibit ${id}`);
          await walk(`museum-approach-${id}`, points, 'basement');
          await checkpoint(id);
        }
        await walk(
          'museum-perimeter-return',
          [
            { x: 26, z: -17.5 },
            { x: 29, z: -17.5 },
            { x: 29, z: 12.5 },
            { x: -29, z: 12.5 },
            { x: -29, z: toe.z },
            toe,
          ],
          'basement'
        );
      } else {
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
      }
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
    if (includeExterior) {
      await walk(
        'spawn-to-front-entry',
        await exteriorPath({ x: 29, z: -15 }),
        'ground'
      );
      // Settle automatic opening before requesting a stationary close.
      await waitForDoor('front-door', 'open');
      await operateDoor('front-door', 'closed');
      await checkpoint('front-entry-closed', {
        id: 'front-door',
        state: 'closed',
      });
      await operateDoor('front-door', 'open');
      await checkpoint('front-entry-open', { id: 'front-door', state: 'open' });
      await walk(
        'front-entry-to-sidewalk',
        await exteriorPath({ x: 55, z: -15 }),
        'ground'
      );
      await checkpoint('front-sidewalk');
      await walk(
        'sidewalk-to-front-entry',
        await exteriorPath({ x: 35, z: -15 }),
        'ground'
      );
      await operateDoor('front-door', 'closed');
      await checkpoint('front-entry-outside-closed', {
        id: 'front-door',
        state: 'closed',
      });
      await operateDoor('front-door', 'open');
      await walk(
        'front-entry-to-spawn',
        await exteriorPath({ x: 0, z: -20 }),
        'ground'
      );
      await checkpoint('exterior-returned-spawn');
    }
    if (includeGarage) {
      await walk(
        'spawn-to-house-garage-door',
        await exteriorPath({ x: 29, z: -2 }),
        'ground'
      );
      await waitForDoor('house-garage-door', 'open');
      await walk(
        'house-door-to-garage-interior',
        await exteriorPath({ x: 41, z: 4 }),
        'ground'
      );
      await checkpoint('garage-interior');
      await walk(
        'garage-interior-to-vehicle-door',
        await exteriorPath({ x: 47, z: 4 }),
        'ground'
      );
      await waitForDoor('garage-door', 'open');
      await operateDoor('garage-door', 'closed');
      await checkpoint('garage-door-closed', {
        id: 'garage-door',
        state: 'closed',
      });
      await operateDoor('garage-door', 'open');
      await checkpoint('garage-door-open', {
        id: 'garage-door',
        state: 'open',
      });
      await walk(
        'garage-to-driveway',
        await exteriorPath({ x: 55, z: 4 }),
        'ground'
      );
      await checkpoint('garage-driveway');
      await walk(
        'driveway-to-front-sidewalk',
        await exteriorPath({ x: 55, z: -15 }),
        'ground'
      );
      await walk(
        'garage-loop-to-front-entry',
        await exteriorPath({ x: 35, z: -15 }),
        'ground'
      );
      // Departure closes the entrance; approach and settle it before planning across.
      await waitForDoor('front-door', 'open');
      await walk(
        'garage-loop-return-to-spawn',
        await exteriorPath({ x: 0, z: -20 }),
        'ground'
      );
      await checkpoint('garage-returned-spawn');
    }
    if (includeStreet) {
      await walk(
        'street-outbound-to-front-entry',
        await exteriorPath({ x: 29, z: -15 }),
        'ground'
      );
      await waitForDoor('front-door', 'open');
      await walk(
        'spawn-to-residential-street',
        await exteriorPath({ x: 61, z: -20 }),
        'ground'
      );
      await checkpoint('street-parked-ev');
      await walk(
        'street-to-bus-stop',
        await exteriorPath({ x: 55, z: 32 }),
        'ground'
      );
      result.street = await page.evaluate(() =>
        window.portfolio.world.getStreetSnapshot()
      );
      result.streetSign = await page.evaluate(() => {
        const description = document.querySelector(
          '[data-bus-stop-description]'
        );
        return {
          description: description?.textContent ?? null,
          available: Boolean(description && !description.hidden),
          interactiveElements: document.querySelectorAll(
            '[data-bus-stop-id="residential-bus-stop"] button, ' +
              '[data-bus-stop-id="residential-bus-stop"] a, .exterior-bus-stop-control'
          ).length,
        };
      });
      if (
        result.street.busStop.signText !== 'Bus stop Â· Coming Soon' ||
        result.streetSign.description !== 'Bus stop: Coming Soon' ||
        !result.streetSign.available ||
        result.streetSign.interactiveElements !== 0 ||
        result.street.lamps.length !== 4 ||
        !result.street.lamps.every((lamp) => lamp.groundPoolVisible)
      ) {
        throw new Error(
          'Street checkpoint requires the passive sign and four visible light pools'
        );
      }
      await checkpoint('street-bus-stop-coming-soon');
      await walk(
        'bus-stop-to-shelter-interior',
        await exteriorPath({ x: 50, z: 32 }),
        'ground'
      );
      await checkpoint('street-shelter-interior');
      await walk(
        'street-return-to-front-entry',
        await exteriorPath({ x: 35, z: -15 }),
        'ground'
      );
      await waitForDoor('front-door', 'open');
      await walk(
        'street-return-to-spawn',
        await exteriorPath({ x: 0, z: -20 }),
        'ground'
      );
      await checkpoint('street-returned-spawn');
    }
    result.state = 'completed';
    if (evidence) await evidence.mark('route_end');
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
    if (evidence)
      await evidence.finish(
        result.state === 'completed' ? 'finished' : 'failure',
        result
      );
    if (!evidence)
      await fs.writeFile(
        path.join(output, 'route.json'),
        `${JSON.stringify(result, null, 2)}\n`
      );
    if (!evidence) {
      await context.close();
      await browser.close();
    }
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
}

// Supplemental support is loaded only for explicit opt-in. The legacy runner and
// history path neither import nor install the bounded probe.
function createCaptureSession(directory, options = {}) {
  const { createOperation } = require('./analyze-performance-capture.cjs');
  const {
    installRouteCapture,
    validateRouteCaptureConfig,
    DEFAULT_BOUNDS,
  } = require('./lib/performance-capture-probe.cjs');
  const {
    parseCapture,
    analyzeCapture,
    projectLegacyProbe,
    sha256,
  } = require('./lib/performance-capture-analysis.cjs');
  const labels = [
    'spawn',
    'basement-ground-landing',
    'basement-lower-toe',
    'career-southern-mississippi',
    'career-naval-research',
    'career-youtube',
    'career-muon-space',
    'basement-museum-loop-complete',
    'upper-landing',
    'upper-creators-studio',
    'returned-spawn',
    'front-entry-closed',
    'front-entry-open',
    'front-sidewalk',
    'front-entry-outside-closed',
    'exterior-returned-spawn',
    'garage-interior',
    'garage-door-closed',
    'garage-door-open',
    'garage-driveway',
    'garage-returned-spawn',
    'street-parked-ev',
    'street-bus-stop-coming-soon',
    'street-shelter-interior',
    'street-returned-spawn',
  ];
  const bounds = { ...DEFAULT_BOUNDS, ...options.bounds };
  validateRouteCaptureConfig({ bounds, labels });
  const operation = createOperation(directory, 'capture');
  const startedAt = new Date().toISOString();
  operation.running();
  const checkpoints = [];
  let page = null,
    finalization = null,
    deadline = null,
    timedOut = false,
    installed = false;
  const error = (code) => Object.assign(new Error(code), { code });
  const session = { browser: null, context: null };
  async function bounded(work) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw error('export_timeout');
    let timeout;
    try {
      return await Promise.race([
        Promise.resolve().then(work),
        new Promise((_, reject) => {
          timeout = setTimeout(
            () => {
              timedOut = true;
              reject(error('export_timeout'));
            },
            Math.min(remaining, bounds.maxPageCallMs)
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  }
  const call = (fn, arg) => {
    if (timedOut) return Promise.reject(error('export_timeout'));
    if (!page || page.isClosed()) return Promise.reject(error('page_lost'));
    return deadline === null
      ? page.evaluate(fn, arg)
      : bounded(() => page.evaluate(fn, arg));
  };
  session.mark = async (type, name = null) => {
    if (finalization) throw error('cancelled');
    const labelId = name === null ? null : labels.indexOf(name);
    if (labelId === -1) throw error('invalid_input');
    return call(
      ({ type, labelId }) => window.__routeCapture.mark(type, labelId),
      { type, labelId }
    );
  };
  session.span = async (kind, work) => {
    if (finalization) throw error('cancelled');
    if (!installed) return work();
    const id = await call(
      (kind) => window.__routeCapture?.beginSpan(kind) ?? null,
      kind
    );
    try {
      return await work();
    } finally {
      if (!finalization && id !== null)
        await call((id) => window.__routeCapture.endSpan(id), id);
    }
  };
  session.attach = (p) => {
    page = p;
    let navigationCount = 0;
    p.on('framenavigated', (frame) => {
      if (frame !== p.mainFrame()) return;
      if (++navigationCount > 1 && !finalization) {
        // A new document has a different clock. Never export it as the original
        // attempt or stitch its samples to already retained checkpoint prefixes.
        page = null;
        void session.finish('pagehide');
      }
    });
    p.on('close', () => {
      if (!finalization) void session.finish('page_closed');
    });
    return new Proxy(p, {
      get(target, key) {
        if (key === 'evaluate')
          return (fn, arg) =>
            session.span(
              fn.name === 'searchPath'
                ? 'helper_path_search'
                : fn.name === 'stepRoute'
                  ? 'route'
                  : 'helper_snapshot',
              () => target.evaluate(fn, arg)
            );
        if (key === 'screenshot')
          return (...args) =>
            session.span('helper_screenshot', () => target.screenshot(...args));
        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  };
  session.install = async () => {
    await page.addInitScript(installRouteCapture, { bounds, labels });
    installed = true;
  };
  session.checkpoint = async (name, record) => {
    if (checkpoints.length >= bounds.maxSnapshots) throw error('capacity');
    const p = record.stallProbe;
    if (p.atMs === null) throw error('invalid_clock');
    checkpoints.push({
      labelId: labels.indexOf(name),
      atMs: p.atMs,
      callbackCount: p.callbackCount,
      longTaskDeliveryCount: p.longTaskDeliveryCount,
    });
    const s = record.snapshot;
    const snapshot = {
      atMs: p.atMs,
      rendererClass: s.renderer.isSoftwareRenderer ? 'software' : 'unknown',
      appMode: record.captureAppMode ?? 'unknown',
      quality: ['performance', 'balanced', 'cinematic'].includes(
        s.quality.level
      )
        ? s.quality.level
        : 'unknown',
      devicePixelRatio: s.rendererSize.pixelRatio,
      calls: s.rendererCounters.calls,
      triangles: s.rendererCounters.triangles,
      memoryGeometries: s.rendererCounters.memoryGeometries,
      memoryTextures: s.rendererCounters.memoryTextures,
    };
    await call(
      (snapshot) => window.__routeCapture.snapshot(snapshot),
      snapshot
    );
  };
  session.finish = (reason, result = null) => {
    if (finalization) return finalization;
    deadline = Date.now() + bounds.maxFinalizationGraceMs;
    finalization = (async () => {
      let terminalReason =
        reason === 'finished'
          ? 'finished'
          : reason === 'cancelled'
            ? 'cancelled'
            : reason === 'deadline'
              ? 'deadline'
              : reason === 'pagehide'
                ? 'navigation'
                : reason === 'page_closed'
                  ? 'page_lost'
                  : 'internal_error';
      let state =
        reason === 'finished'
          ? 'complete'
          : reason === 'cancelled'
            ? 'cancelled'
            : 'partial';
      try {
        const status = await call(
          (reason) => window.__routeCapture.stop(reason),
          reason
        );
        operation.state.captureStoppedAtMs = status.captureStoppedAtMs;
        const data = {};
        for (const [name, key] of [
          ['rafTimestampsMs', 'raf'],
          ['longTasks', 'longTasks'],
          ['markers', 'markers'],
          ['snapshots', 'snapshots'],
        ]) {
          data[name] = [];
          for (
            let offset = 0;
            offset < status.streams[key].retainedCount;
            offset += bounds.maxChunkRecords
          ) {
            const chunk = await call(
              ({ name, offset, limit }) =>
                window.__routeCapture.readChunk(name, offset, limit),
              { name, offset, limit: bounds.maxChunkRecords }
            );
            if (
              chunk.length !==
              Math.min(
                bounds.maxChunkRecords,
                status.streams[key].retainedCount - offset
              )
            )
              throw error('invalid_input');
            data[name].push(...chunk);
          }
        }
        const t = data.rafTimestampsMs,
          stop = status.captureStoppedAtMs;
        const reasons = [];
        if (!t.length) reasons.push('no_callbacks');
        if (t.length && t[0] - status.captureStartedAtMs > 100)
          reasons.push('unobserved_start');
        if (stop === null || (t.length && stop - t.at(-1) > 100))
          reasons.push('open_tail');
        if (status.unfinishedSpanIds.length) reasons.push('unmatched_span');
        if (
          Object.values(status.streams).some((s) => s.state === 'capacity_stop')
        )
          reasons.push('capacity');
        if (
          Object.values(status.streams).some((s) => s.state === 'clock_invalid')
        )
          reasons.push('invalid_clock');
        if (status.stopReason === 'deadline') reasons.push('deadline');
        if (status.stopReason === 'pagehide') reasons.push('navigation');
        if (reason === 'cancelled') reasons.push('cancelled');
        if (reasons.length && state === 'complete') {
          state = 'partial';
          terminalReason = reasons.includes('capacity')
            ? 'capacity'
            : reasons.includes('deadline')
              ? 'deadline'
              : reasons.includes('invalid_clock')
                ? 'invalid_clock'
                : 'invalid_input';
        }
        const build = result?.servedBuild;
        const servedBuild =
          build &&
          ['dev', 'staging', 'prod'].includes(build.environment) &&
          typeof build.tag === 'string' &&
          /^[A-Za-z0-9._:-]{1,80}$/.test(build.tag)
            ? { environment: build.environment, tag: build.tag }
            : null;
        const ready =
          data.markers.find((m) => m.type === 'application_ready')?.atMs ??
          null;
        const raw = {
          kind: 'route_capture_raw',
          captureSchemaVersion: 1,
          attemptId: operation.state.attemptId,
          startedAt,
          finishedAt: new Date().toISOString(),
          captureState: state,
          stopReason: status.stopReason ?? reason,
          source: {
            repository: 'futuroptimist/danielsmith.io',
            commit: null,
            servedBuild,
            artifactId: null,
            artifactReceiptState: 'unbound',
            routeContractSha256: operation.hashes.helperSha256,
          },
          toolchain: operation.hashes,
          profile: {
            method: 'raf_callback_cadence_v1',
            harness: 'synthetic_route_helper',
            browserFamily: 'chromium',
            browserVersion: session.browser?.version() ?? 'unknown',
            viewportWidth: 1280,
            viewportHeight: 720,
            devicePixelRatio: 1,
            orientation: 'landscape',
            quality: data.snapshots.at(-1)?.quality ?? 'unknown',
            qualitySource: 'unknown',
            rendererClass: data.snapshots.at(-1)?.rendererClass ?? 'unknown',
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
          bounds,
          warmth: {
            state: ready === null ? 'unqualified' : 'readiness_delay_only',
            applicationReadyMs: ready,
            assetsSettledMs: null,
            minimumDelayMs: 5000,
            settleEvidenceSha256: null,
          },
          streams: status.streams,
          coverage: {
            state: reasons.length ? 'incomplete' : 'complete',
            captureStartedAtMs: status.captureStartedAtMs,
            captureStoppedAtMs: stop,
            firstCallbackAtMs: t[0] ?? null,
            lastCallbackAtMs: t.at(-1) ?? null,
            leftCensoredMs: t.length ? t[0] - status.captureStartedAtMs : null,
            rightCensoredMs: t.length && stop !== null ? stop - t.at(-1) : null,
            plannedDeadlineAtMs: status.plannedDeadlineAtMs,
            deadlineOvershootMs:
              stop === null
                ? null
                : Math.max(0, stop - status.plannedDeadlineAtMs),
            reasons,
          },
          labels,
          ...data,
          checkpointPrefixes: checkpoints,
          capabilities: {
            nativeFramePresentation: 'not_collected',
            inputToNextPaint: 'not_collected',
            gpuTiming: 'not_collected',
            wholeFramePassTotals: 'not_collected',
            geometryTextureBytes: 'not_collected',
            retainedHeap: 'not_collected',
            longTaskTiming:
              status.streams.longTasks.state === 'unsupported'
                ? 'unsupported'
                : status.streams.longTasks.state === 'complete'
                  ? 'supported'
                  : 'partial',
          },
        };
        const validated = parseCapture(raw),
          bytes = Buffer.from(JSON.stringify(validated) + '\n');
        operation.write(
          'route-capture-raw-v1.json',
          validated,
          bounds.maxRawBytes,
          bytes
        );
        const analysis = analyzeCapture(validated);
        analysis.rawSha256 = sha256(bytes);
        operation.write(
          'route-capture-analysis-v1.json',
          analysis,
          bounds.maxAnalysisBytes
        );
        if (result) {
          for (let i = 0; i < checkpoints.length; i++)
            result.checkpoints[i].stallProbe = projectLegacyProbe(
              validated,
              checkpoints[i]
            );
          result.wholeRouteStallProbe = projectLegacyProbe(validated, {
            atMs: stop,
            callbackCount: t.length,
            longTaskDeliveryCount: data.longTasks.length,
          });
        }
        await call(() => window.__routeCapture.dispose());
      } catch (error) {
        state = state === 'cancelled' ? 'cancelled' : 'partial';
        terminalReason =
          reason === 'pagehide'
            ? 'navigation'
            : state === 'cancelled'
              ? 'cancelled'
              : [
                    'export_timeout',
                    'page_lost',
                    'output_limit',
                    'input_limit',
                    'invalid_input',
                    'invalid_clock',
                    'capacity',
                  ].includes(error.code)
                ? error.code
                : 'page_lost';
      }
      // Cleanup shares the original absolute grace. A timed-out page request is
      // never followed by another page request, but owned resources may close.
      operation.state.cleanupState = 'complete';
      for (const resource of [session.context, session.browser])
        if (resource)
          try {
            await bounded(() => resource.close());
          } catch {
            operation.state.cleanupState = 'incomplete';
            if (terminalReason === 'finished') {
              terminalReason = 'cleanup_timeout';
              state = 'partial';
            }
          }
      if (result) {
        // Synchronous host write cannot outlive finalization. Never write from a
        // late continuation of the route after cancellation/page loss.
        require('node:fs').writeFileSync(
          path.join(directory, 'route.json'),
          JSON.stringify(result, null, 2) + '\n'
        );
      }
      operation.finish(state, terminalReason);
    })();
    return finalization;
  };
  return session;
}
async function main() {
  if (!process.argv.includes('--capture-evidence')) return runRoute();
  const evidence = createCaptureSession(output);
  let timer;
  let rejectCancellation;
  const cancellation = new Promise((_, reject) => {
    rejectCancellation = reject;
  });
  const cancel = () => {
    void evidence.finish('cancelled');
    rejectCancellation(new Error('cancelled'));
  };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    await Promise.race([
      runRoute(evidence),
      cancellation,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          void evidence.finish('deadline');
          reject(new Error('deadline'));
        }, 1200000);
      }),
    ]);
  } catch {
    process.exitCode = 1;
    await evidence.finish('failure');
  } finally {
    clearTimeout(timer);
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}
module.exports = { createCaptureSession };
if (require.main === module) {
  if (process.argv.includes('--capture-evidence'))
    main().then(
      () => process.exit(process.exitCode || 0),
      () => process.exit(1)
    );
  else void runRoute();
}
