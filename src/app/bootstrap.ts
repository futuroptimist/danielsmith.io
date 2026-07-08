import {
  evaluateFailoverDecision,
  renderTextFallback,
  type FallbackReason,
} from '../systems/failover';
import { createImmersiveModeUrl } from '../ui/immersiveUrl';

export type AppMode = 'immersive' | 'fallback';

export interface ImmersiveFatalOptions {
  renderer?: {
    setAnimationLoop(callback: null): void;
    dispose(): void;
    domElement: { remove(): void };
  };
}

export type ImmersiveFatalHandler = (
  error: unknown,
  options?: ImmersiveFatalOptions
) => void;

export type ImmersiveInitializer = (
  container: HTMLElement,
  onFatalError: ImmersiveFatalHandler
) => void;

export function getAppContainer(documentRef: Document = document): HTMLElement {
  const container = documentRef.getElementById('app');
  if (!container) {
    throw new Error('Missing #app container element.');
  }
  return container;
}

export function markDocumentReady(
  mode: AppMode,
  fallbackReason?: FallbackReason,
  documentRef: Document = document
) {
  const root = documentRef.documentElement;
  root.dataset.appMode = mode;
  if (mode === 'fallback') {
    root.dataset.fallbackReason = fallbackReason ?? 'manual';
  } else {
    delete root.dataset.fallbackReason;
  }
  root.removeAttribute('data-app-loading');
}

export function renderFallbackRoute(
  container: HTMLElement,
  reason: FallbackReason,
  documentRef: Document = document
) {
  renderTextFallback(container, {
    reason,
    immersiveUrl: createImmersiveModeUrl(),
  });
  markDocumentReady('fallback', reason, documentRef);
}

export function createImmersiveFailureHandler(
  container: HTMLElement,
  documentRef: Document = document
): ImmersiveFatalHandler {
  let immersiveFailureHandled = false;

  return (error: unknown, { renderer }: ImmersiveFatalOptions = {}) => {
    if (immersiveFailureHandled) {
      return;
    }
    immersiveFailureHandled = true;
    console.error('Failed to initialize immersive scene:', error);

    if (renderer) {
      try {
        renderer.setAnimationLoop(null);
      } catch (loopError) {
        console.error('Failed to stop immersive renderer loop:', loopError);
      }

      try {
        renderer.dispose();
      } catch (disposeError) {
        console.error('Failed to dispose immersive renderer:', disposeError);
      }

      try {
        renderer.domElement.remove();
      } catch (removeError) {
        console.error('Failed to remove renderer canvas:', removeError);
      }
    }

    try {
      renderTextFallback(container, {
        reason: 'immersive-init-error',
        immersiveUrl: createImmersiveModeUrl(),
      });
    } catch (fallbackError) {
      console.error('Failed to render fallback experience:', fallbackError);
    }

    markDocumentReady('fallback', 'immersive-init-error', documentRef);
  };
}

export function bootstrapApp(
  initializeImmersiveScene: ImmersiveInitializer,
  documentRef: Document = document
) {
  const container = getAppContainer(documentRef);
  const failoverDecision = evaluateFailoverDecision();

  if (failoverDecision.shouldUseFallback) {
    renderFallbackRoute(
      container,
      failoverDecision.reason ?? 'manual',
      documentRef
    );
    return;
  }

  const failImmersive = createImmersiveFailureHandler(container, documentRef);

  try {
    initializeImmersiveScene(container, failImmersive);
  } catch (error) {
    failImmersive(error);
  }
}
