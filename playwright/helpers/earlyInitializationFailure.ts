import { expect, type Page } from '@playwright/test';

export type EarlyFailurePoint = 'locale' | 'debug-storage' | 'debug-overlay';

export async function injectEarlyInitializationFailure(
  page: Page,
  point: EarlyFailurePoint
) {
  await page.addInitScript(
    ({ point }) => {
      const state = {
        tracking: false,
        added: 0,
        removed: 0,
        rendererDisposals: 0,
        failureReached: false,
        overlayAttachedBeforeFailure: false,
      };
      (window as unknown as { earlyFailure: typeof state }).earlyFailure =
        state;
      const tracked = new Set<EventListenerOrEventListenerObject>();
      for (const target of [window, document] as EventTarget[]) {
        const add = target.addEventListener.bind(target);
        const remove = target.removeEventListener.bind(target);
        target.addEventListener = ((type, listener, options) => {
          const name = typeof listener === 'function' ? listener.name : '';
          if (
            state.tracking &&
            listener &&
            (name === 'handlePageHide' || name === 'handleVisibilityChange')
          ) {
            tracked.add(listener);
            state.added++;
          }
          add(type, listener, options);
        }) as typeof target.addEventListener;
        target.removeEventListener = ((type, listener, options) => {
          if (listener && tracked.delete(listener)) state.removed++;
          remove(type, listener, options);
        }) as typeof target.removeEventListener;
      }
      const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        const target =
          point === 'locale'
            ? 'danielsmith.io:locale'
            : 'danielsmith.io::debugCoordinates::v1';
        if (point !== 'debug-overlay' && state.tracking && key === target) {
          state.tracking = false;
          state.failureReached = true;
          throw new DOMException(
            'Injected denied storage read',
            'SecurityError'
          );
        }
        return getItem.call(this, key);
      };
    },
    { point }
  );
  await page.route('**/src/immersiveScene.ts*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    const rendererAnchor =
      /const renderer = new WebGLRenderer\(\{ antialias: true \}\);/;
    const telemetryAnchor =
      /inputLatencyTelemetry = createInputLatencyTelemetry\(\{/;
    expect(body.match(rendererAnchor)).not.toBeNull();
    expect(body.match(telemetryAnchor)).not.toBeNull();
    body = body.replace(
      rendererAnchor,
      (line) => `${line}
      const originalEarlyRendererDispose = renderer.dispose;
      renderer.dispose = () => {
        window.earlyFailure.rendererDisposals++;
        originalEarlyRendererDispose.call(renderer);
      };
    `
    );
    body = body.replace(
      telemetryAnchor,
      (line) => `window.earlyFailure.tracking = true; ${line}`
    );
    if (point === 'debug-overlay') {
      const anchor =
        /debugPerformanceOverlay\.setFpsEnabled\(debugFpsEnabled\);/;
      expect(body.match(anchor)).not.toBeNull();
      body = body.replace(
        anchor,
        (line) => `${line}
        debugPerformanceOverlay.setFpsEnabled(true);
        window.earlyFailure.overlayAttachedBeforeFailure =
          debugPerformanceOverlay.getState().panelVisible;
        window.earlyFailure.failureReached = true;
        throw new Error('Injected failure after debug overlay allocation');
      `
      );
    }
    await route.fulfill({ response, body });
  });
}
