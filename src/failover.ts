const WEBGL_CONTEXT_NAMES = ['webgl2', 'webgl', 'experimental-webgl'] as const;

type WebglContextName = (typeof WEBGL_CONTEXT_NAMES)[number];

type DeviceMemoryReader = () => number | undefined;
type UserAgentReader = () => string | undefined;

export type FallbackReason =
  | 'webgl-unsupported'
  | 'manual'
  | 'low-memory'
  | 'low-performance'
  | 'immersive-init-error'
  | 'automated-client';

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
}

export interface FailoverDecision {
  shouldUseFallback: boolean;
  reason?: FallbackReason;
}

interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

interface NavigatorWithUserAgent extends Navigator {
  userAgent?: string;
}

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
  return typeof reported === 'string' && reported.length > 0 ? reported : undefined;
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

  const webglSupported = isWebglSupported(options);

  if (mode === 'text') {
    return { shouldUseFallback: true, reason: 'manual' };
  }

  if (mode === 'immersive') {
    if (!webglSupported) {
      return { shouldUseFallback: true, reason: 'webgl-unsupported' };
    }
    return { shouldUseFallback: false };
  }

  if ((!mode || mode.length === 0) && userAgent && shouldForceTextModeForUserAgent(userAgent)) {
    return { shouldUseFallback: true, reason: 'automated-client' };
  }

  if (!webglSupported) {
    return { shouldUseFallback: true, reason: 'webgl-unsupported' };
  }

  if (hasLowMemory) {
    return { shouldUseFallback: true, reason: 'low-memory' };
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
  container.innerHTML = '';
  container.setAttribute('data-mode', 'text');

  const section = document.createElement('section');
  section.className = 'text-fallback';
  section.setAttribute('data-reason', reason);

  const heading = document.createElement('h1');
  heading.className = 'text-fallback__title';
  heading.textContent =
    reason === 'manual'
      ? 'Text-only mode enabled'
      : 'Immersive mode unavailable';
  section.appendChild(heading);

  const description = document.createElement('p');
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
      default:
        return 'You requested the lightweight portfolio view. The immersive scene stays just a click away.';
    }
  })();
  section.appendChild(description);

  const list = document.createElement('ul');
  list.className = 'text-fallback__actions';

  const immersiveItem = document.createElement('li');
  const immersiveLink = document.createElement('a');
  immersiveLink.href = immersiveUrl;
  immersiveLink.className = 'text-fallback__link';
  immersiveLink.textContent = 'Launch immersive mode';
  immersiveItem.appendChild(immersiveLink);
  list.appendChild(immersiveItem);

  const resumeItem = document.createElement('li');
  const resumeLink = document.createElement('a');
  resumeLink.href = resumeUrl;
  resumeLink.className = 'text-fallback__link';
  resumeLink.textContent = 'Download the latest résumé';
  resumeItem.appendChild(resumeLink);
  list.appendChild(resumeItem);

  const githubItem = document.createElement('li');
  const githubLink = document.createElement('a');
  githubLink.href = githubUrl;
  githubLink.className = 'text-fallback__link';
  githubLink.textContent = 'Explore projects on GitHub';
  githubItem.appendChild(githubLink);
  list.appendChild(githubItem);

  section.appendChild(list);
  container.appendChild(section);
}
