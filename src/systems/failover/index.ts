import { getLocaleDirection } from '../../assets/i18n';
import { initializeModeAnnouncementObserver } from '../../ui/accessibility/modeAnnouncer';

if (
  typeof document !== 'undefined' &&
  typeof MutationObserver !== 'undefined'
) {
  initializeModeAnnouncementObserver();
}

const WEBGL_CONTEXT_NAMES = ['webgl2', 'webgl', 'experimental-webgl'] as const;

type WebglContextName = (typeof WEBGL_CONTEXT_NAMES)[number];

type DeviceMemoryReader = () => number | undefined;
type UserAgentReader = () => string | undefined;
type WebDriverReader = () => boolean | undefined;
type NetworkInformationReader = () =>
  | NetworkInformationSnapshot
  | null
  | undefined;

interface NetworkInformationSnapshot {
  saveData?: boolean;
  effectiveType?: string | null;
}

export type FallbackReason =
  | 'webgl-unsupported'
  | 'manual'
  | 'low-memory'
  | 'low-performance'
  | 'immersive-init-error'
  | 'automated-client'
  | 'console-error'
  | 'data-saver';

export interface WebglSupportOptions {
  createCanvas?: () => HTMLCanvasElement;
}

function safeGetContext(
  canvas: HTMLCanvasElement,
  name: WebglContextName
): RenderingContext | null {
  try {
    return canvas.getContext(name);
  } catch (error) {
    console.warn(`WebGL context check failed for ${name}:`, error);
    return null;
  }
}

export function isWebglSupported(options: WebglSupportOptions = {}): boolean {
  const createCanvas =
    options.createCanvas ?? (() => document.createElement('canvas'));

  let canvas: HTMLCanvasElement;
  try {
    canvas = createCanvas();
  } catch (error) {
    console.warn('Failed to create canvas for WebGL check:', error);
    return false;
  }

  for (const name of WEBGL_CONTEXT_NAMES) {
    const context = safeGetContext(canvas, name);
    if (context) {
      return true;
    }
  }
  return false;
}

export interface FailoverDecisionOptions extends WebglSupportOptions {
  search?: string;
  getDeviceMemory?: DeviceMemoryReader;
  minimumDeviceMemory?: number;
  getUserAgent?: UserAgentReader;
  getIsWebDriver?: WebDriverReader;
  getNetworkInformation?: NetworkInformationReader;
}

export interface FailoverDecision {
  shouldUseFallback: boolean;
  reason?: FallbackReason;
}

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

type NavigatorWithUserAgent = Navigator & { userAgent?: string };
type NavigatorWithWebDriver = Navigator & { webdriver?: boolean };
type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string | null;
} | null;

function getNavigatorDeviceMemory(): number | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const reported = (navigator as NavigatorWithDeviceMemory).deviceMemory;
  return typeof reported === 'number' && Number.isFinite(reported)
    ? reported
    : undefined;
}

function getNavigatorUserAgent(): string | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const reported = (navigator as NavigatorWithUserAgent).userAgent;
  return typeof reported === 'string' && reported.length > 0
    ? reported
    : undefined;
}

function getNavigatorWebDriver(): boolean | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const reported = (navigator as NavigatorWithWebDriver).webdriver;
  return typeof reported === 'boolean' ? reported : undefined;
}

function normalizeNetworkInformation(
  info: NetworkInformationLike
): NetworkInformationSnapshot | undefined {
  if (!info || typeof info !== 'object') {
    return undefined;
  }
  const saveData = info.saveData === true;
  const effectiveType =
    typeof info.effectiveType === 'string' && info.effectiveType.length > 0
      ? info.effectiveType
      : undefined;
  if (!saveData && !effectiveType) {
    return undefined;
  }
  return {
    saveData,
    effectiveType,
  } satisfies NetworkInformationSnapshot;
}

function getNavigatorNetworkInformation():
  | NetworkInformationSnapshot
  | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const candidate =
    (navigator as NavigatorWithConnection).connection ??
    (navigator as NavigatorWithConnection).mozConnection ??
    (navigator as NavigatorWithConnection).webkitConnection ??
    null;
  return normalizeNetworkInformation(candidate);
}

const AUTOMATED_CLIENT_PATTERNS: ReadonlyArray<RegExp> = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /slurp/i,
  /headless/i,
  /lighthouse/i,
  /rendertron/i,
  /playwright/i,
  /puppeteer/i,
  /phantomjs/i,
  /curl\//i,
  /wget/i,
  /httpclient/i,
  /postmanruntime/i,
  /insomnia/i,
  /python-requests/i,
  /httpx/i,
];

function shouldForceTextModeForUserAgent(userAgent: string): boolean {
  return AUTOMATED_CLIENT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function evaluateFailoverDecision(
  options: FailoverDecisionOptions = {}
): FailoverDecision {
  const search =
    options.search ??
    (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(search);
  const mode = params.get('mode');

  const minimumDeviceMemory = options.minimumDeviceMemory ?? 1;
  const readDeviceMemory = options.getDeviceMemory ?? getNavigatorDeviceMemory;
  const reportedDeviceMemory = readDeviceMemory();
  const hasLowMemory =
    reportedDeviceMemory !== undefined &&
    reportedDeviceMemory >= 0 &&
    reportedDeviceMemory < minimumDeviceMemory;

  const readUserAgent = options.getUserAgent ?? getNavigatorUserAgent;
  const userAgent = readUserAgent();
  const readIsWebDriver = options.getIsWebDriver ?? getNavigatorWebDriver;
  const isWebDriver = readIsWebDriver() ?? false;
  const automatedByUserAgent =
    !!userAgent && shouldForceTextModeForUserAgent(userAgent);

  const readNetworkInformation =
    options.getNetworkInformation ?? getNavigatorNetworkInformation;
  const networkInformation = readNetworkInformation() ?? undefined;
  const prefersReducedData = networkInformation?.saveData === true;
  const effectiveType = networkInformation?.effectiveType;
  const normalizedEffectiveType =
    typeof effectiveType === 'string' ? effectiveType.toLowerCase() : undefined;
  const hasSlowConnection =
    normalizedEffectiveType === 'slow-2g' || normalizedEffectiveType === '2g';

  if (mode === 'text') {
    return { shouldUseFallback: true, reason: 'manual' };
  }

  if (mode === 'immersive') {
    return { shouldUseFallback: false };
  }

  const webglSupported = isWebglSupported(options);

  if ((!mode || mode.length === 0) && (automatedByUserAgent || isWebDriver)) {
    return { shouldUseFallback: true, reason: 'automated-client' };
  }

  if (!webglSupported) {
    return { shouldUseFallback: true, reason: 'webgl-unsupported' };
  }

  if (hasLowMemory) {
    return { shouldUseFallback: true, reason: 'low-memory' };
  }

  if (
    (!mode || mode.length === 0) &&
    (prefersReducedData || hasSlowConnection)
  ) {
    return { shouldUseFallback: true, reason: 'data-saver' };
  }

  return { shouldUseFallback: false };
}

export interface RenderTextFallbackOptions {
  reason: FallbackReason;
  immersiveUrl?: string;
  resumeUrl?: string;
  githubUrl?: string;
}

export function renderTextFallback(
  container: HTMLElement,
  {
    reason,
    immersiveUrl = window.location.pathname,
    resumeUrl = 'docs/resume/2025-09/resume.pdf',
    githubUrl = 'https://github.com/futuroptimist',
  }: RenderTextFallbackOptions
): void {
  const documentTarget = container.ownerDocument ?? document;
  const localeHint =
    documentTarget.documentElement.lang ||
    (typeof navigator !== 'undefined' ? navigator.language : undefined);
  const direction = getLocaleDirection(localeHint);
  documentTarget.documentElement.dir = direction;
  documentTarget.documentElement.dataset.localeDirection = direction;

  container.innerHTML = '';
  container.setAttribute('data-mode', 'text');
  container.dataset.localeDirection = direction;

  const section = documentTarget.createElement('section');
  section.className = 'text-fallback';
  section.setAttribute('data-reason', reason);
  section.dir = direction;
  section.dataset.localeDirection = direction;
  section.style.textAlign = direction === 'rtl' ? 'right' : 'left';

  const heading = documentTarget.createElement('h1');
  heading.className = 'text-fallback__title';
  heading.textContent =
    reason === 'manual'
      ? 'Text-only mode enabled'
      : 'Immersive mode unavailable';
  section.appendChild(heading);

  const description = documentTarget.createElement('p');
  description.className = 'text-fallback__description';
  description.textContent = (() => {
    switch (reason) {
      case 'webgl-unsupported':
        return "Your browser or device couldn't start the WebGL renderer. Enjoy the quick text overview while we keep the immersive scene light.";
      case 'low-memory':
        return 'Your device reported limited memory, so we launched the lightweight text tour to keep things smooth.';
      case 'low-performance':
        return 'We detected sustained low frame rates, so we switched to the responsive text tour to keep the experience snappy.';
      case 'immersive-init-error':
        return 'Something went wrong starting the immersive scene, so we brought you the text overview instead.';
      case 'automated-client':
        return 'We detected an automated client, so we surfaced the fast-loading text portfolio for reliable previews and crawlers.';
      case 'console-error':
        return 'We detected a runtime error and switched to the resilient text tour while the immersive scene recovers.';
      case 'data-saver':
        return 'Your browser requested a data-saver experience, so we launched the lightweight text tour to minimize bandwidth while keeping the highlights accessible.';
      default:
        return 'You requested the lightweight portfolio view. The immersive scene stays just a click away.';
    }
  })();
  section.appendChild(description);

  const list = documentTarget.createElement('ul');
  list.className = 'text-fallback__actions';

  const immersiveItem = documentTarget.createElement('li');
  immersiveItem.className = 'text-fallback__action';
  const immersiveLink = documentTarget.createElement('a');
  immersiveLink.href = immersiveUrl;
  immersiveLink.className = 'text-fallback__link';
  immersiveLink.textContent = 'Launch immersive mode';
  immersiveLink.rel = 'noopener';
  immersiveLink.dataset.action = 'immersive';
  immersiveItem.appendChild(immersiveLink);
  list.appendChild(immersiveItem);

  const resumeItem = documentTarget.createElement('li');
  resumeItem.className = 'text-fallback__action';
  const resumeLink = documentTarget.createElement('a');
  resumeLink.href = resumeUrl;
  resumeLink.className = 'text-fallback__link';
  resumeLink.textContent = 'Download the latest résumé';
  resumeLink.rel = 'noopener';
  resumeLink.dataset.action = 'resume';
  resumeItem.appendChild(resumeLink);
  list.appendChild(resumeItem);

  const githubItem = documentTarget.createElement('li');
  githubItem.className = 'text-fallback__action';
  const githubLink = documentTarget.createElement('a');
  githubLink.href = githubUrl;
  githubLink.className = 'text-fallback__link';
  githubLink.textContent = 'Explore projects on GitHub';
  githubLink.rel = 'noopener';
  githubLink.dataset.action = 'github';
  githubItem.appendChild(githubLink);
  list.appendChild(githubItem);

  section.appendChild(list);
  container.appendChild(section);
}
