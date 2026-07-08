import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrapApp,
  createImmersiveFailureHandler,
  getAppContainer,
  markDocumentReady,
  type ImmersiveRendererCleanup,
} from '../app/bootstrap';

const writeAppShell = () => {
  document.documentElement.removeAttribute('data-app-mode');
  document.documentElement.removeAttribute('data-fallback-reason');
  document.documentElement.setAttribute('data-app-loading', 'true');
  document.body.innerHTML = '<main id="app"></main>';
};

const stubWebglSupport = () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    (contextId: string) =>
      contextId === 'webgl' || contextId === 'experimental-webgl'
        ? ({} as RenderingContext)
        : null
  );
};

describe('app bootstrap', () => {
  beforeEach(() => {
    writeAppShell();
    history.replaceState(null, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('data-app-mode');
    document.documentElement.removeAttribute('data-fallback-reason');
    document.documentElement.removeAttribute('data-app-loading');
  });

  it('throws a clear error when the app container is missing', () => {
    document.body.innerHTML = '';

    expect(() => getAppContainer()).toThrow('Missing #app container element.');
  });

  it('renders text mode and marks fallback readiness when failover chooses fallback', () => {
    history.replaceState(null, '', '/?mode=text');
    const initializer = vi.fn();

    bootstrapApp(initializer);

    expect(initializer).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe('manual');
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
    expect(document.querySelector('.text-fallback')).not.toBeNull();
  });

  it('calls the immersive initializer and preserves immersive readiness behavior', () => {
    stubWebglSupport();
    history.replaceState(
      null,
      '',
      '/?mode=immersive&disablePerformanceFailover=1'
    );
    const initializer = vi.fn(() => markDocumentReady('immersive'));

    bootstrapApp(initializer);

    expect(initializer).toHaveBeenCalledWith(
      document.getElementById('app'),
      expect.any(Function)
    );
    expect(document.documentElement.dataset.appMode).toBe('immersive');
    expect(document.documentElement.dataset.fallbackReason).toBeUndefined();
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('renders immersive-init-error fallback when the initializer throws', () => {
    stubWebglSupport();
    history.replaceState(
      null,
      '',
      '/?mode=immersive&disablePerformanceFailover=1'
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    bootstrapApp(() => {
      throw new Error('boom');
    });

    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
    expect(document.querySelector('.text-fallback')).not.toBeNull();
  });

  it('invokes renderer cleanup hooks when provided on fatal init failure', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = getAppContainer();
    const renderer: ImmersiveRendererCleanup = {
      setAnimationLoop: vi.fn(),
      dispose: vi.fn(),
      domElement: { remove: vi.fn() },
    };
    const failImmersive = createImmersiveFailureHandler(container);

    failImmersive(new Error('fatal'), { renderer });

    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.domElement.remove).toHaveBeenCalled();
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
  });
});
