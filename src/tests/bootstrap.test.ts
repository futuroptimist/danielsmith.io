import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../systems/failover', () => ({
  evaluateFailoverDecision: vi.fn(),
  renderTextFallback: vi.fn(
    (container: HTMLElement, options: { reason: string }) => {
      const fallback = document.createElement('section');
      fallback.className = 'text-fallback';
      fallback.dataset.reason = options.reason;
      container.replaceChildren(fallback);
    }
  ),
}));

vi.mock('../ui/immersiveUrl', () => ({
  createImmersiveModeUrl: vi.fn(() => 'https://example.com/?mode=immersive'),
}));

const importBootstrap = async () => {
  const failover = await import('../systems/failover');
  const bootstrap = await import('../app/bootstrap');
  return { ...bootstrap, failover };
};

const setAppDocument = () => {
  document.documentElement.dataset.appLoading = 'true';
  document.body.innerHTML = '<main id="app"></main>';
  return document.getElementById('app') as HTMLElement;
};

describe('bootstrapApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-app-mode');
    document.documentElement.removeAttribute('data-fallback-reason');
    document.documentElement.removeAttribute('data-app-loading');
    document.body.innerHTML = '';
  });

  it('throws a clear error when the app container is missing', async () => {
    const { bootstrapApp, failover } = await importBootstrap();
    vi.mocked(failover.evaluateFailoverDecision).mockReturnValue({
      shouldUseFallback: false,
    });

    expect(() => bootstrapApp(vi.fn())).toThrow(
      'Missing #app container element.'
    );
  });

  it('renders text mode and marks the document as fallback when failover is selected', async () => {
    const container = setAppDocument();
    const { bootstrapApp, failover } = await importBootstrap();
    vi.mocked(failover.evaluateFailoverDecision).mockReturnValue({
      shouldUseFallback: true,
      reason: 'manual',
    });

    const initializer = vi.fn();
    bootstrapApp(initializer);

    expect(initializer).not.toHaveBeenCalled();
    expect(failover.renderTextFallback).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ reason: 'manual' })
    );
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe('manual');
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('calls the immersive initializer and lets it mark immersive readiness', async () => {
    const container = setAppDocument();
    const { bootstrapApp, failover } = await importBootstrap();
    vi.mocked(failover.evaluateFailoverDecision).mockReturnValue({
      shouldUseFallback: false,
    });

    const initializer = vi.fn((_container, _onFatalError, markAppReady) => {
      markAppReady('immersive');
    });

    bootstrapApp(initializer);

    expect(initializer).toHaveBeenCalledWith(
      container,
      expect.any(Function),
      expect.any(Function)
    );
    expect(document.documentElement.dataset.appMode).toBe('immersive');
    expect(document.documentElement.dataset.fallbackReason).toBeUndefined();
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('renders fallback with immersive-init-error when the initializer throws', async () => {
    setAppDocument();
    const { bootstrapApp, failover } = await importBootstrap();
    vi.mocked(failover.evaluateFailoverDecision).mockReturnValue({
      shouldUseFallback: false,
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    bootstrapApp(() => {
      throw new Error('webgl failed');
    });

    expect(failover.renderTextFallback).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ reason: 'immersive-init-error' })
    );
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
    consoleError.mockRestore();
  });

  it('invokes renderer cleanup hooks on fatal initialization failure', async () => {
    setAppDocument();
    const { bootstrapApp, failover } = await importBootstrap();
    vi.mocked(failover.evaluateFailoverDecision).mockReturnValue({
      shouldUseFallback: false,
    });
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const renderer = {
      setAnimationLoop: vi.fn(),
      dispose: vi.fn(),
      domElement: { remove: vi.fn() },
    };

    bootstrapApp((_container, onFatalError) => {
      onFatalError(new Error('fatal'), { renderer });
    });

    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.domElement.remove).toHaveBeenCalled();
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
    consoleError.mockRestore();
  });
});
