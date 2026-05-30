import type { RendererInfoSnapshot } from '../scene/performance/rendererCapabilities';

export interface SoftwareRendererWarningOptions {
  rendererInfo: RendererInfoSnapshot;
  safeUrl: string;
  continuousUrl: string;
  textUrl: string;
  onContinueSafe?: () => void;
  onVisible?: (message: string) => void;
}

export interface SoftwareRendererWarningHandle {
  element: HTMLElement;
  dispose(): void;
}

const rendererLabel = (rendererInfo: RendererInfoSnapshot) =>
  rendererInfo.unmaskedRenderer ??
  rendererInfo.renderer ??
  'software WebGL renderer';

export function createSoftwareRendererWarning({
  rendererInfo,
  safeUrl,
  continuousUrl,
  textUrl,
  onContinueSafe,
  onVisible,
}: SoftwareRendererWarningOptions): SoftwareRendererWarningHandle {
  const documentTarget = document;
  const element = documentTarget.createElement('aside');
  element.className = 'software-renderer-warning';
  element.setAttribute('role', 'alert');
  element.setAttribute('aria-atomic', 'true');
  element.dataset.softwareRendererWarning = 'true';

  const dispose = () => {
    element.remove();
  };

  const title = documentTarget.createElement('h2');
  title.className = 'software-renderer-warning__title';
  title.textContent = 'Software rendering detected';
  element.appendChild(title);

  const description = documentTarget.createElement('p');
  description.className = 'software-renderer-warning__description';
  description.textContent =
    `Chrome is using ${rendererLabel(rendererInfo)} instead of hardware acceleration. ` +
    'Basic Render Driver, SwiftShader, WARP, and llvmpipe can crash under continuous WebGL animation.';
  element.appendChild(description);

  const recommendation = documentTarget.createElement('p');
  recommendation.className = 'software-renderer-warning__recommendation';
  recommendation.textContent =
    'Enable browser hardware acceleration for the smooth immersive portfolio. ' +
    'Safe immersive mode keeps screenshots and debugging available at a capped frame rate.';
  element.appendChild(recommendation);

  const actions = documentTarget.createElement('div');
  actions.className = 'software-renderer-warning__actions';

  const safeButton = documentTarget.createElement('button');
  safeButton.type = 'button';
  safeButton.className = 'software-renderer-warning__button';
  safeButton.dataset.action = 'continue-safe-immersive';
  safeButton.textContent = 'Continue in safe immersive';
  safeButton.addEventListener('click', () => {
    dispose();
    onContinueSafe?.();
  });
  actions.appendChild(safeButton);

  const continuousLink = documentTarget.createElement('a');
  continuousLink.className = 'software-renderer-warning__link';
  continuousLink.dataset.action = 'continuous-immersive';
  continuousLink.href = continuousUrl;
  continuousLink.textContent = 'Enable continuous immersive anyway';
  actions.appendChild(continuousLink);

  const textLink = documentTarget.createElement('a');
  textLink.className =
    'software-renderer-warning__link software-renderer-warning__link--muted';
  textLink.dataset.action = 'text-mode';
  textLink.href = textUrl;
  textLink.textContent = 'Use text mode';
  actions.appendChild(textLink);

  const safeLink = documentTarget.createElement('a');
  safeLink.className = 'software-renderer-warning__safe-link';
  safeLink.href = safeUrl;
  safeLink.textContent = 'Reload this safe immersive URL';
  element.appendChild(actions);
  element.appendChild(safeLink);

  documentTarget.body.appendChild(element);
  onVisible?.(description.textContent ?? 'Software rendering detected');

  return {
    element,
    dispose,
  };
}
