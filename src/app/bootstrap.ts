import {
  evaluateFailoverDecision,
  renderTextFallback,
  type FallbackReason,
} from '../systems/failover';
import { createImmersiveModeUrl } from '../ui/immersiveUrl';

export type AppMode = 'immersive' | 'fallback';

export interface ImmersiveRendererCleanup {
  setAnimationLoop: (callback: null) => void;
  dispose: () => void;
  domElement: { remove: () => void };
}

export interface ImmersiveFatalErrorOptions {
  renderer?: ImmersiveRendererCleanup;
}

export type ImmersiveFatalErrorHandler = (
  error: unknown,
  options?: ImmersiveFatalErrorOptions
) => void;

export type ImmersiveSceneInitializer = (
  container: HTMLElement,
  onFatalError: ImmersiveFatalErrorHandler
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

export function createImmersiveFailureHandler(
  container: HTMLElement
): ImmersiveFatalErrorHandler {
  let immersiveFailureHandled = false;

  return (error, { renderer } = {}) => {
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

    markDocumentReady('fallback', 'immersive-init-error');
  };
}

export function bootstrapApp(
  initializeImmersiveScene: ImmersiveSceneInitializer
) {
  const container = getAppContainer();
  const failoverDecision = evaluateFailoverDecision();

  if (failoverDecision.shouldUseFallback) {
    renderTextFallback(container, {
      reason: failoverDecision.reason ?? 'manual',
      immersiveUrl: createImmersiveModeUrl(),
    });
    markDocumentReady('fallback', failoverDecision.reason ?? 'manual');
    return;
  }

  const failImmersive = createImmersiveFailureHandler(container);

  try {
    initializeImmersiveScene(container, failImmersive);
  } catch (error) {
    failImmersive(error);
  }
}
