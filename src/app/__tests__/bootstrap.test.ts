import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FailoverDecision } from '../../systems/failover';
import type { ImmersiveInitializer } from '../bootstrap';

const failoverState: { decision: FailoverDecision } = {
  decision: { shouldUseFallback: false },
};
const renderTextFallback = vi.fn();

vi.mock('../../systems/failover', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../systems/failover')>();
  return {
    ...actual,
    evaluateFailoverDecision: () => failoverState.decision,
    renderTextFallback: (...args: unknown[]) => renderTextFallback(...args),
  };
});

const createImmersiveModeUrl = vi.fn(
  () => 'https://example.test/?mode=immersive'
);

vi.mock('../../ui/immersiveUrl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ui/immersiveUrl')>();
  return {
    ...actual,
    createImmersiveModeUrl: () => createImmersiveModeUrl(),
  };
});

async function loadBootstrap() {
  return import('../bootstrap');
}

function renderAppShell() {
  document.documentElement.dataset.appLoading = 'true';
  document.body.innerHTML = '<main id="app"></main>';
  return document.getElementById('app') as HTMLElement;
}

describe('bootstrapApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    failoverState.decision = { shouldUseFallback: false };
    document.documentElement.removeAttribute('data-app-mode');
    document.documentElement.removeAttribute('data-fallback-reason');
    document.documentElement.removeAttribute('data-app-loading');
    document.body.innerHTML = '';
  });

  it('throws a clear error when the app container is missing', async () => {
    const { bootstrapApp } = await loadBootstrap();
    const initializeImmersiveScene = vi.fn<ImmersiveInitializer>();

    expect(() => bootstrapApp({ initializeImmersiveScene })).toThrow(
      'Missing #app container element.'
    );
    expect(initializeImmersiveScene).not.toHaveBeenCalled();
  });

  it('renders text mode and marks the document when failover is selected', async () => {
    const container = renderAppShell();
    failoverState.decision = { shouldUseFallback: true, reason: 'manual' };
    const { bootstrapApp } = await loadBootstrap();

    bootstrapApp({ initializeImmersiveScene: vi.fn<ImmersiveInitializer>() });

    expect(renderTextFallback).toHaveBeenCalledWith(container, {
      reason: 'manual',
      immersiveUrl: 'https://example.test/?mode=immersive',
    });
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe('manual');
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('calls the immersive initializer and lets it mark immersive readiness', async () => {
    const container = renderAppShell();
    const { bootstrapApp } = await loadBootstrap();
    const initializeImmersiveScene = vi.fn<ImmersiveInitializer>(
      (_container, _onFatalError, markAppReady) => {
        markAppReady('immersive');
      }
    );

    bootstrapApp({ initializeImmersiveScene });

    expect(initializeImmersiveScene).toHaveBeenCalledWith(
      container,
      expect.any(Function),
      expect.any(Function)
    );
    expect(renderTextFallback).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.appMode).toBe('immersive');
    expect(document.documentElement.dataset.fallbackReason).toBeUndefined();
    expect(document.documentElement.hasAttribute('data-app-loading')).toBe(
      false
    );
  });

  it('renders the immersive init error fallback when the initializer throws', async () => {
    const container = renderAppShell();
    const { bootstrapApp } = await loadBootstrap();
    const error = new Error('webgl unavailable');

    bootstrapApp({
      initializeImmersiveScene: vi.fn<ImmersiveInitializer>(() => {
        throw error;
      }),
    });

    expect(renderTextFallback).toHaveBeenCalledWith(container, {
      reason: 'immersive-init-error',
      immersiveUrl: 'https://example.test/?mode=immersive',
    });
    expect(document.documentElement.dataset.appMode).toBe('fallback');
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
  });

  it('runs renderer cleanup hooks when fatal initialization provides a renderer', async () => {
    renderAppShell();
    const { bootstrapApp } = await loadBootstrap();
    const renderer = {
      setAnimationLoop: vi.fn(),
      dispose: vi.fn(),
      domElement: { remove: vi.fn() },
    };

    bootstrapApp({
      initializeImmersiveScene: vi.fn<ImmersiveInitializer>(
        (_container, onFatalError) => {
          onFatalError(new Error('fatal setup failed'), { renderer });
        }
      ),
    });

    expect(renderer.setAnimationLoop).toHaveBeenCalledWith(null);
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.domElement.remove).toHaveBeenCalled();
    expect(document.documentElement.dataset.fallbackReason).toBe(
      'immersive-init-error'
    );
  });
});
