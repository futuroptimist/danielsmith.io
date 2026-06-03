import {
  formatMessage,
  getSoftwareRendererWarningStrings,
  type SoftwareRendererWarningStrings,
} from '../assets/i18n';
import type { RendererInfoSnapshot } from '../scene/performance/rendererCapabilities';

export interface SoftwareRendererWarningOptions {
  rendererInfo: RendererInfoSnapshot;
  safeUrl: string;
  continuousUrl: string;
  textUrl: string;
  strings?: SoftwareRendererWarningStrings;
  onContinueSafe?: () => void;
  onVisible?: (message: string) => void;
}

export interface SoftwareRendererWarningHandle {
  element: HTMLElement;
  setStrings(strings: SoftwareRendererWarningStrings): void;
  dispose(): void;
}

const rendererLabel = (
  rendererInfo: RendererInfoSnapshot,
  fallbackLabel: string
) => rendererInfo.unmaskedRenderer ?? rendererInfo.renderer ?? fallbackLabel;

export function createSoftwareRendererWarning({
  rendererInfo,
  safeUrl,
  continuousUrl,
  textUrl,
  strings: providedStrings,
  onContinueSafe,
  onVisible,
}: SoftwareRendererWarningOptions): SoftwareRendererWarningHandle {
  let strings = {
    ...getSoftwareRendererWarningStrings(),
    ...providedStrings,
  };
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
  const applyStrings = () => {
    title.textContent = strings.title;
    description.textContent = formatMessage(strings.descriptionTemplate, {
      renderer: rendererLabel(rendererInfo, strings.fallbackRendererLabel),
    });
    recommendation.textContent = strings.recommendation;
    safeButton.textContent = strings.continueSafeLabel;
    continuousLink.textContent = strings.continuousLabel;
    textLink.textContent = strings.textModeLabel;
    safeLink.textContent = strings.reloadSafeLabel;
  };

  title.textContent = strings.title;
  element.appendChild(title);

  const description = documentTarget.createElement('p');
  description.className = 'software-renderer-warning__description';
  description.textContent = formatMessage(strings.descriptionTemplate, {
    renderer: rendererLabel(rendererInfo, strings.fallbackRendererLabel),
  });
  element.appendChild(description);

  const recommendation = documentTarget.createElement('p');
  recommendation.className = 'software-renderer-warning__recommendation';
  recommendation.textContent = strings.recommendation;
  element.appendChild(recommendation);

  const actions = documentTarget.createElement('div');
  actions.className = 'software-renderer-warning__actions';

  const safeButton = documentTarget.createElement('button');
  safeButton.type = 'button';
  safeButton.className = 'software-renderer-warning__button';
  safeButton.dataset.action = 'continue-safe-immersive';
  safeButton.textContent = strings.continueSafeLabel;
  safeButton.addEventListener('click', () => {
    dispose();
    onContinueSafe?.();
  });
  actions.appendChild(safeButton);

  const continuousLink = documentTarget.createElement('a');
  continuousLink.className = 'software-renderer-warning__link';
  continuousLink.dataset.action = 'continuous-immersive';
  continuousLink.href = continuousUrl;
  continuousLink.textContent = strings.continuousLabel;
  actions.appendChild(continuousLink);

  const textLink = documentTarget.createElement('a');
  textLink.className =
    'software-renderer-warning__link software-renderer-warning__link--muted';
  textLink.dataset.action = 'text-mode';
  textLink.href = textUrl;
  textLink.textContent = strings.textModeLabel;
  actions.appendChild(textLink);

  const safeLink = documentTarget.createElement('a');
  safeLink.className = 'software-renderer-warning__safe-link';
  safeLink.href = safeUrl;
  safeLink.textContent = strings.reloadSafeLabel;
  element.appendChild(actions);
  element.appendChild(safeLink);

  applyStrings();
  documentTarget.body.appendChild(element);
  onVisible?.(description.textContent ?? strings.title);

  return {
    element,
    setStrings(nextStrings) {
      strings = { ...getSoftwareRendererWarningStrings(), ...nextStrings };
      applyStrings();
    },
    dispose,
  };
}
