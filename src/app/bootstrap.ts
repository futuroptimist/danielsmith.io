import {
  evaluateFailoverDecision,
  renderTextFallback,
} from '../systems/failover';
import type { FallbackReason } from '../types/failover';
import { createImmersiveModeUrl } from '../ui/immersiveUrl';

export type AppMode = 'immersive' | 'fallback';

export type AppReadyMarker = (
  mode: AppMode,
  fallbackReason?: FallbackReason
) => void;

export interface ImmersiveRendererCleanup {
  setAnimationLoop?: (callback: null) => void;
  dispose?: () => void;
  domElement?: { remove?: () => void };
}

export interface ImmersiveFatalErrorOptions {
  renderer?: ImmersiveRendererCleanup;
}

export type ImmersiveFatalErrorHandler = (
  error: unknown,
  options?: ImmersiveFatalErrorOptions
) => void;

export type ImmersiveInitializer = (
  container: HTMLElement,
  onFatalError: ImmersiveFatalErrorHandler,
  markAppReady: AppReadyMarker
) => void;

export interface BootstrapAppOptions {
  documentTarget?: Document;
  initializeImmersiveScene: ImmersiveInitializer;
}

export function findAppContainer(
  documentTarget: Document = document
): HTMLElement {
  const container = documentTarget.getElementById('app');
  if (!container) {
    throw new Error('Missing #app container element.');
  }
  return container;
}

export function markDocumentReady(
  mode: AppMode,
  fallbackReason?: FallbackReason,
  documentTarget: Document = document
): void {
  const root = documentTarget.documentElement;
  root.dataset.appMode = mode;
  if (mode === 'fallback') {
    root.dataset.fallbackReason = fallbackReason ?? 'manual';
  } else {
    delete root.dataset.fallbackReason;
  }
  root.removeAttribute('data-app-loading');
}

function cleanupRenderer(renderer: ImmersiveRendererCleanup): void {
  try {
    renderer.setAnimationLoop?.(null);
  } catch (loopError) {
    console.error('Failed to stop immersive renderer loop:', loopError);
  }

  try {
    renderer.dispose?.();
  } catch (disposeError) {
    console.error('Failed to dispose immersive renderer:', disposeError);
  }

  try {
    renderer.domElement?.remove?.();
  } catch (removeError) {
    console.error('Failed to remove renderer canvas:', removeError);
  }
}

export function createImmersiveFailureHandler(
  container: HTMLElement,
  markReady: AppReadyMarker = (mode, fallbackReason) =>
    markDocumentReady(mode, fallbackReason, container.ownerDocument)
): ImmersiveFatalErrorHandler {
  let immersiveFailureHandled = false;

  return (error, options = {}) => {
    if (immersiveFailureHandled) {
      return;
    }
    immersiveFailureHandled = true;
    console.error('Failed to initialize immersive scene:', error);

    if (options.renderer) {
      cleanupRenderer(options.renderer);
    }

    try {
      renderTextFallback(container, {
        reason: 'immersive-init-error',
        immersiveUrl: createImmersiveModeUrl(),
      });
    } catch (fallbackError) {
      console.error('Failed to render fallback experience:', fallbackError);
    }

    markReady('fallback', 'immersive-init-error');
  };
}

export function bootstrapApp({
  documentTarget = document,
  initializeImmersiveScene,
}: BootstrapAppOptions): void {
  const container = findAppContainer(documentTarget);
  const failoverDecision = evaluateFailoverDecision();
  const markReady: AppReadyMarker = (mode, fallbackReason) =>
    markDocumentReady(mode, fallbackReason, documentTarget);

  if (failoverDecision.shouldUseFallback) {
    renderTextFallback(container, {
      reason: failoverDecision.reason ?? 'manual',
      immersiveUrl: createImmersiveModeUrl(),
    });
    markReady('fallback', failoverDecision.reason ?? 'manual');
    return;
  }

  const failImmersive = createImmersiveFailureHandler(container, markReady);

  try {
    initializeImmersiveScene(container, failImmersive, markReady);
  } catch (error) {
    failImmersive(error);
  }
}
