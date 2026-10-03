import { expect, type Page } from '@playwright/test';

export type ExteriorFailurePhase = 'build' | 'controls';

/** Inject faults into the served module, preserving its real builders and fatal handler. */
export async function injectExteriorInitializationFailure(
  page: Page,
  phase: ExteriorFailurePhase,
  mode: 'handler' | 'throw'
) {
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
    const anchor =
      phase === 'build'
        ? /groundEnvironmentGroup\.add\(residentialExterior\.group\);/
        : /let helpKeyWasPressed = false;/;
    expect(body.match(anchor)).not.toBeNull();
    // Keep real resources and disposal events. A direct throw separately checks
    // initializer exception routing rather than only invoking the error handler.
    body = body.replace(
      anchor,
      (line) => `${line}
      const failureResources = { geometries: new Set(), materials: new Set(), instances: new Set() };
      const failureCounts = { geometries: 0, materials: 0, instances: 0 };
      residentialExterior.group.traverse((object) => {
        if (object.geometry) failureResources.geometries.add(object.geometry);
        if (object.material) {
          for (const material of [object.material].flat()) failureResources.materials.add(material);
        }
        if (object.isInstancedMesh) failureResources.instances.add(object);
      });
      for (const [kind, resources] of Object.entries(failureResources)) {
        for (const resource of resources) resource.addEventListener('dispose', () => failureCounts[kind]++);
      }
      let rendererDisposals = 0;
      const originalRendererDispose = renderer.dispose;
      renderer.dispose = () => { rendererDisposals++; originalRendererDispose.call(renderer); };
      const failure = new Error('Injected exterior initialization failure: ${phase}');
      window.repeatExteriorFailure = () => handleFatalError(failure);
      window.readExteriorFailure = () => ({
        lifecycle: residentialExterior.getLifecycle(),
        expected: Object.fromEntries(Object.entries(failureResources).map(([kind, values]) => [kind, values.size])),
        disposed: failureCounts,
        groupAttached: residentialExterior.group.parent !== null,
        listeners: window.exteriorListenerCounts,
        controlsRemaining: document.querySelectorAll('[data-exterior-door-control]').length,
        worldAvailable: Boolean(window.portfolio?.world),
        rendererDisposals
      });
      ${mode === 'handler' ? 'handleFatalError(failure); handleFatalError(failure);' : ''}
      throw failure;
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
          lifecycle: { isDisposed: boolean };
          expected: Record<string, number>;
          disposed: Record<string, number>;
          groupAttached: boolean;
          controlsRemaining: number;
          worldAvailable: boolean;
          rendererDisposals: number;
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
