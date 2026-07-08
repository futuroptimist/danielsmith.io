import {
  evaluateFailoverDecision,
  renderTextFallback,
  type FallbackReason,
} from '../systems/failover';
import { createImmersiveModeUrl } from '../ui/immersiveUrl';

type AppMode = 'immersive' | 'fallback';

export interface ImmersiveRendererCleanup {
  setAnimationLoop(callback: null): void;
  dispose(): void;
  domElement: { remove(): void };
}

export interface ImmersiveFatalErrorOptions {
  renderer?: ImmersiveRendererCleanup;
}

export type MarkAppReady = (
  mode: AppMode,
  fallbackReason?: FallbackReason
) => void;

export type ImmersiveInitializer = (
  container: HTMLElement,
  onFatalError: (error: unknown, options?: ImmersiveFatalErrorOptions) => void,
  markAppReady: MarkAppReady
) => void;

export function getAppContainer(
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
) {
  const root = documentTarget.documentElement;
  root.dataset.appMode = mode;
  if (mode === 'fallback') {
    root.dataset.fallbackReason = fallbackReason ?? 'manual';
  } else {
    delete root.dataset.fallbackReason;
  }
  root.removeAttribute('data-app-loading');
}

export function handleImmersiveFailure(
  container: HTMLElement,
  error: unknown,
  {
    renderer,
    markAppReady = markDocumentReady,
  }: ImmersiveFatalErrorOptions & { markAppReady?: MarkAppReady } = {}
) {
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

  markAppReady('fallback', 'immersive-init-error');
}

export function bootstrapApp(
  initializeImmersiveScene: ImmersiveInitializer,
  { documentTarget = document }: { documentTarget?: Document } = {}
) {
  const container = getAppContainer(documentTarget);
  const failoverDecision = evaluateFailoverDecision();
  const markAppReady: MarkAppReady = (mode, fallbackReason) =>
    markDocumentReady(mode, fallbackReason, documentTarget);

  if (failoverDecision.shouldUseFallback) {
    renderTextFallback(container, {
      reason: failoverDecision.reason ?? 'manual',
      immersiveUrl: createImmersiveModeUrl(),
    });
    markAppReady('fallback', failoverDecision.reason ?? 'manual');
    return;
  }

  let immersiveFailureHandled = false;
  const failImmersive = (
    error: unknown,
    options: ImmersiveFatalErrorOptions = {}
  ) => {
    if (immersiveFailureHandled) {
      return;
    }
    immersiveFailureHandled = true;
    handleImmersiveFailure(container, error, { ...options, markAppReady });
  };

  try {
    initializeImmersiveScene(container, failImmersive, markAppReady);
  } catch (error) {
    failImmersive(error);
  }
}
