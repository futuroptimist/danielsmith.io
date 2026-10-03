import { expect, type Page } from '@playwright/test';

export type ExteriorFailurePhase = 'build' | 'controls' | 'ready';

/** Inject faults into the served module, preserving its real builders and fatal handler. */
export async function injectExteriorInitializationFailure(
  page: Page,
  phase: ExteriorFailurePhase,
  mode: 'handler' | 'throw' | 'throw-cleanup' | 'async-cleanup',
  options: {
    target?: 'exterior' | 'street';
    cleanupScope?: 'exterior' | 'initialization';
  } = {}
) {
  const target = options.target ?? 'exterior';
  const cleanupScope = options.cleanupScope ?? 'exterior';
  await page.addInitScript(() => {
    const counts = {
      keyAdded: 0,
      keyRemoved: 0,
      blurAdded: 0,
      blurRemoved: 0,
      resizeAdded: 0,
      resizeRemoved: 0,
    };
    const tracked = new Map<
      EventListenerOrEventListenerObject,
      'key' | 'blur' | 'resize'
    >();
    const add = window.addEventListener;
    const remove = window.removeEventListener;
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) => {
      const name = typeof listener === 'function' ? listener.name : '';
      const kind =
        type === 'keydown' && options === true
          ? 'key'
          : type === 'blur' && name === 'stopMovementOnBlur'
            ? 'blur'
            : type === 'resize' && name === 'invalidate'
              ? 'resize'
              : null;
      if (kind) {
        tracked.set(listener, kind);
        counts[`${kind}Added`]++;
      }
      add.call(window, type, listener, options);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) => {
      const kind = tracked.get(listener);
      if (kind) counts[`${kind}Removed`]++;
      remove.call(window, type, listener, options);
    }) as typeof window.removeEventListener;
    (
      window as unknown as { exteriorListenerCounts: typeof counts }
    ).exteriorListenerCounts = counts;
  });

  await page.route('**/src/immersiveScene.ts*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    const builder =
      target === 'street' ? 'residentialStreet' : 'residentialExterior';
    const lifecycleRead =
      target === 'street'
        ? `${builder}.getSnapshot().lifecycle`
        : `${builder}.getLifecycle()`;
    const anchor =
      phase === 'build'
        ? new RegExp(`groundEnvironmentGroup\\.add\\(${builder}\\.group\\);`)
        : phase === 'controls'
          ? /let helpKeyWasPressed = false;/
          : /immersiveLifecycle = ["']ready["'];/;
    const directHandlerFailure =
      phase !== 'ready' && mode === 'handler'
        ? 'handleFatalError(failure); handleFatalError(failure);'
        : '';
    expect(body.match(anchor)).not.toBeNull();
    // Keep real resources and disposal events. A direct throw separately checks
    // initializer exception routing rather than only invoking the error handler.
    body = body.replace(
      anchor,
      (line) => `${line}
      const failureResources = {
        geometries: new Set(), materials: new Set(), instances: new Set(),
        textures: new Set(), lights: new Set()
      };
      const failureCounts = {
        geometries: 0, materials: 0, instances: 0, textures: 0, lights: 0
      };
      ${builder}.group.traverse((object) => {
        if (object.geometry) failureResources.geometries.add(object.geometry);
        if (object.material) {
          for (const material of [object.material].flat()) {
            failureResources.materials.add(material);
            if (material.map?.isTexture) failureResources.textures.add(material.map);
          }
        }
        if (object.isInstancedMesh) failureResources.instances.add(object);
        if (object.isLight) failureResources.lights.add(object);
      });
      for (const [kind, resources] of Object.entries(failureResources)) {
        for (const resource of resources) {
          if (kind === 'lights') {
            const original = resource.dispose;
            resource.dispose = () => {
              failureCounts[kind]++;
              original.call(resource);
            };
          } else resource.addEventListener('dispose', () => failureCounts[kind]++);
        }
      }
      const failureMuseum = careerMuseum;
      const failureMiniature = portfolioMiniatureTable;
      const failureReaper = prReaperInstallation;
      const laterGeometryDisposals = { miniature: 0, reaper: 0 };
      for (const [kind, build] of Object.entries({
        miniature: failureMiniature, reaper: failureReaper
      })) {
        const geometries = new Set();
        build?.group.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
        });
        for (const geometry of geometries) {
          geometry.addEventListener('dispose', () => laterGeometryDisposals[kind]++);
        }
      }
      let rendererDisposals = 0;
      const originalRendererDispose = renderer.dispose;
      renderer.dispose = () => {
        rendererDisposals++;
        originalRendererDispose.call(renderer);
      };
      const failure = new Error('Injected exterior initialization failure: ${phase}');
      const controlsAllocated = document.querySelectorAll(
        '[data-exterior-door-control], .exterior-bus-stop-control'
      ).length;
      window.exteriorCleanupFailures = 0;
      ${
        mode.endsWith('-cleanup')
          ? `${cleanupScope}Cleanup.add(() => {
        window.exteriorCleanupFailures++;
        throw new Error('Injected disposer failure');
      });`
          : ''
      }
      window.repeatExteriorFailure = () => handleFatalError(failure);
      window.readExteriorFailure = () => ({
        immersiveLifecycle,
        museum: failureMuseum?.getResourceLifecycle() ?? null,
        miniatureChildren: failureMiniature?.group.children.length ?? null,
        laterGeometryDisposals,
        movementPressed: ${phase === 'ready' ? "controls.isPressed('w')" : 'null'},
        joystickMovement: ${phase === 'ready' ? 'joystick.getMovement()' : 'null'},
        cleanupErrors: crashBreadcrumbs.read().entries
          .filter((entry) => entry.type === 'cleanup-error')
          .map((entry) => entry.message),
        fatalErrors: crashBreadcrumbs.read().entries
          .filter((entry) => entry.type === 'fatal-error')
          .map((entry) => entry.message),
        lifecycle: ${lifecycleRead},
        expected: Object.fromEntries(
          Object.entries(failureResources).map(([kind, values]) => [kind, values.size])
        ),
        disposed: failureCounts,
        groupAttached: ${builder}.group.parent !== null,
        listeners: window.exteriorListenerCounts,
        controlsAllocated,
        controlsRemaining: document.querySelectorAll(
          '[data-exterior-door-control], .exterior-bus-stop-control'
        ).length,
        worldAvailable: Boolean(window.portfolio?.world),
        rendererDisposals,
        cleanupFailures: window.exteriorCleanupFailures
      });
      ${directHandlerFailure}
      ${
        phase === 'ready'
          ? ''
          : mode === 'async-cleanup'
            ? `window.setTimeout(() => {
        try { handleFatalError(failure); }
        catch (error) { window.exteriorCleanupError = String(error); }
      }, 0); return;`
            : 'throw failure;'
      }
    `
    );
    await route.fulfill({ response, body });
  });
}

export async function readExteriorFailureSnapshot(page: Page) {
  return page.evaluate(() =>
    (
      window as unknown as {
        readExteriorFailure(): {
          immersiveLifecycle: string;
          museum: {
            created: Record<string, number>;
            disposed: Record<string, number>;
            isDisposed: boolean;
          } | null;
          miniatureChildren: number | null;
          laterGeometryDisposals: { miniature: number; reaper: number };
          movementPressed: boolean | null;
          joystickMovement: { x: number; y: number } | null;
          cleanupErrors: string[];
          fatalErrors: string[];
          lifecycle: { isDisposed: boolean };
          expected: Record<string, number>;
          disposed: Record<string, number>;
          groupAttached: boolean;
          controlsAllocated: number;
          controlsRemaining: number;
          worldAvailable: boolean;
          rendererDisposals: number;
          cleanupFailures: number;
          listeners: {
            keyAdded: number;
            keyRemoved: number;
            blurAdded: number;
            blurRemoved: number;
            resizeAdded: number;
            resizeRemoved: number;
          };
        };
      }
    ).readExteriorFailure()
  );
}
