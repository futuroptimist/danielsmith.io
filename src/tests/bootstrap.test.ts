import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bootstrapApp,
  createImmersiveFailureHandler,
  getAppContainer,
} from '../app/bootstrap';

const setUrl = (url: string) => {
  window.history.replaceState({}, '', url);
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
    document.documentElement.removeAttribute('data-app-mode');
    delete document.documentElement.dataset.fallbackReason;
    document.documentElement.setAttribute('data-app-loading', 'true');
    window.localStorage.clear();
    window.sessionStorage.clear();
    document.body.innerHTML = '<main id="app"></main>';
    setUrl('/?mode=immersive&disablePerformanceFailover=1');
    vi.restoreAllMocks();
  });

  it('throws a clear error when #app is missing', () => {
    document.body.innerHTML = '';

    expect(() => getAppContainer()).toThrow('Missing #app container element.');
  });

  it('renders text mode and marks fallback when failover chooses the text route', () => {
    setUrl('/?mode=text');

    bootstrapApp(vi.fn());

    const container = document.getElementById('app');
    expect(container?.dataset.mode).toBe('text');
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe('manual');
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('calls the immersive initializer without marking fallback when immersive is available', () => {
    stubWebglSupport();
    const initializeImmersiveScene = vi.fn();

    bootstrapApp(initializeImmersiveScene);

    expect(initializeImmersiveScene).toHaveBeenCalledWith(
      document.getElementById('app'),
      expect.any(Function)
    );
    expect(document.documentElement.dataset.appMode).toBeUndefined();
    expect(document.documentElement.getAttribute('data-app-loading')).toBe(
      'true'
    );
  });

  it('renders fallback with immersive-init-error when the initializer throws', () => {
    stubWebglSupport();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    bootstrapApp(() => {
      throw new Error('boom');
    });

    const container = document.getElementById('app');
    expect(container?.dataset.mode).toBe('text');
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
  });

  it('invokes renderer cleanup hooks when fatal initialization failure provides them', () => {
    const handler = createImmersiveFailureHandler(
      document.getElementById('app') as HTMLElement
    );
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const renderer = {
      setAnimationLoop: vi.fn(),
      dispose: vi.fn(),
      domElement: { remove: vi.fn() },
    };

    handler(new Error('fatal'), { renderer });

    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.domElement.remove).toHaveBeenCalled();
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
  });
});
