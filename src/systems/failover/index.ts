import { FLOOR_PLAN } from '../../assets/floorPlan';
import {
  formatMessage,
  getLocaleDirection,
  getLocaleScript,
  getPoiCopy,
  getPoiNarrativeLogStrings,
  getSiteStrings,
} from '../../assets/i18n';
import { getPoiDefinitions } from '../../scene/poi/registry';
import type { PoiLink } from '../../scene/poi/types';
import { initializeModeAnnouncementObserver } from '../../ui/accessibility/modeAnnouncer';
import { createImmersiveModeUrl } from '../../ui/immersiveUrl';

import {
  readModePreference as readStoredModePreference,
  type ModePreference,
} from './modePreference';

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

type TextPortfolioMetric = {
  label: string;
  value: string;
};

interface TextPortfolioPoi {
  id: string;
  title: string;
  summary: string;
  outcomeLabel?: string;
  outcomeValue?: string;
  metrics: TextPortfolioMetric[];
  links: PoiLink[];
}

interface TextPortfolioRoomGroup {
  roomId: string;
  roomLabel: string;
  pois: TextPortfolioPoi[];
}

export type FallbackReason =
  | 'webgl-unsupported'
  | 'manual'
  | 'low-memory'
  | 'low-performance'
  | 'immersive-init-error'
  | 'automated-client'
  | 'low-end-device'
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
  getHardwareConcurrency?: () => number | undefined;
  minimumHardwareConcurrency?: number;
  getNetworkInformation?: NetworkInformationReader;
  getModePreference?: () => ModePreference | null;
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
type NavigatorWithHardwareConcurrency = Navigator & {
  hardwareConcurrency?: number;
};
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

function getNavigatorHardwareConcurrency(): number | undefined {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const reported = (navigator as NavigatorWithHardwareConcurrency)
    .hardwareConcurrency;
  return typeof reported === 'number' && Number.isFinite(reported)
    ? reported
    : undefined;
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
  /axios\//i,
  /playwright/i,
  /puppeteer/i,
  /phantomjs/i,
  /go-http-client/i,
  /curl\//i,
  /node-fetch/i,
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

const LOW_END_DEVICE_PATTERNS: ReadonlyArray<RegExp> = [
  /android\s?(6|7|8)\b/i,
  /iphone\s?os\s?(1[0-2]|9|10|11)_/i,
  /windows\sphone/i,
  /nexus\s5/i,
];

function shouldTreatUserAgentAsLowEnd(userAgent: string): boolean {
  return LOW_END_DEVICE_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function evaluateFailoverDecision(
  options: FailoverDecisionOptions = {}
): FailoverDecision {
  const search =
    options.search ??
    (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(search);
  const mode = params.get('mode');

  let storedPreference: ModePreference | null = null;
  const readPreference = options.getModePreference ?? readStoredModePreference;
  try {
    storedPreference = readPreference();
  } catch {
    storedPreference = null;
  }

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
  const readHardwareConcurrency =
    options.getHardwareConcurrency ?? getNavigatorHardwareConcurrency;
  const reportedHardwareConcurrency = readHardwareConcurrency();
  const minimumHardwareConcurrency = options.minimumHardwareConcurrency ?? 2;
  const hasLowHardwareConcurrency =
    reportedHardwareConcurrency !== undefined &&
    reportedHardwareConcurrency > 0 &&
    reportedHardwareConcurrency <= minimumHardwareConcurrency;
  const lowEndByUserAgent =
    !!userAgent && shouldTreatUserAgentAsLowEnd(userAgent);

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

  if ((!mode || mode.length === 0) && storedPreference === 'text') {
    return { shouldUseFallback: true, reason: 'manual' };
  }

  const webglSupported = isWebglSupported(options);

  if (
    (!mode || mode.length === 0) &&
    (hasLowHardwareConcurrency || lowEndByUserAgent)
  ) {
    return { shouldUseFallback: true, reason: 'low-end-device' };
  }

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

function buildTextPortfolioGroups(
  localeHint?: string
): TextPortfolioRoomGroup[] {
  const poiDefinitions = getPoiDefinitions();
  const poiCopy = getPoiCopy(localeHint);
  const narrativeRooms = getPoiNarrativeLogStrings(localeHint).rooms;
  const roomLookup = new Map(
    FLOOR_PLAN.rooms.map((room) => [room.id, room.name])
  );
  const groups = new Map<string, TextPortfolioRoomGroup>();

  FLOOR_PLAN.rooms.forEach((room) => {
    const label = narrativeRooms?.[room.id]?.label ?? room.name;
    groups.set(room.id, { roomId: room.id, roomLabel: label, pois: [] });
  });

  poiDefinitions.forEach((definition) => {
    let group = groups.get(definition.roomId);
    if (!group) {
      const fallbackLabel =
        narrativeRooms?.[definition.roomId]?.label ??
        roomLookup.get(definition.roomId) ??
        definition.roomId;
      group = { roomId: definition.roomId, roomLabel: fallbackLabel, pois: [] };
      groups.set(definition.roomId, group);
    }

    const copy = poiCopy[definition.id];
    const metricsSource = copy?.metrics ?? definition.metrics ?? [];
    const linksSource = copy?.links ?? definition.links ?? [];

    group.pois.push({
      id: definition.id,
      title: copy?.title ?? definition.title,
      summary: copy?.summary ?? definition.summary,
      outcomeLabel: copy?.outcome?.label ?? definition.outcome?.label,
      outcomeValue: copy?.outcome?.value ?? definition.outcome?.value,
      metrics: metricsSource.map((metric) => ({
        label: metric.label,
        value: metric.value,
      })),
      links: linksSource.map((link) => ({
        label: link.label,
        href: link.href,
      })),
    });
  });

  return Array.from(groups.values())
    .filter((group) => group.pois.length > 0)
    .map((group) => ({
      ...group,
      pois: group.pois.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      ),
    }));
}

function createTextPortfolioSection(
  documentTarget: Document,
  localeHint?: string
): HTMLElement | null {
  const groups = buildTextPortfolioGroups(localeHint);
  if (groups.length === 0) {
    return null;
  }

  const siteStrings = getSiteStrings(localeHint).textFallback;
  const section = documentTarget.createElement('section');
  section.className = 'text-fallback__exhibits';
  section.dataset.section = 'portfolio';

  const heading = documentTarget.createElement('h2');
  heading.className = 'text-fallback__exhibits-heading';
  heading.textContent = siteStrings.heading;
  section.appendChild(heading);

  const intro = documentTarget.createElement('p');
  intro.className = 'text-fallback__exhibits-intro';
  intro.textContent = siteStrings.intro;
  section.appendChild(intro);

  groups.forEach((group) => {
    const roomSection = documentTarget.createElement('section');
    roomSection.className = 'text-fallback__room';
    roomSection.dataset.roomId = group.roomId;

    const roomHeading = documentTarget.createElement('h3');
    roomHeading.className = 'text-fallback__room-heading';
    roomHeading.textContent = formatMessage(siteStrings.roomHeadingTemplate, {
      roomName: group.roomLabel,
    });
    roomSection.appendChild(roomHeading);

    const list = documentTarget.createElement('div');
    list.className = 'text-fallback__poi-list';

    group.pois.forEach((poi) => {
      const article = documentTarget.createElement('article');
      article.className = 'text-fallback__poi';
      article.dataset.poiId = poi.id;

      const title = documentTarget.createElement('h4');
      title.className = 'text-fallback__poi-title';
      title.textContent = poi.title;
      article.appendChild(title);

      const summary = documentTarget.createElement('p');
      summary.className = 'text-fallback__poi-summary';
      summary.textContent = poi.summary;
      article.appendChild(summary);

      if (poi.outcomeLabel && poi.outcomeValue) {
        const outcome = documentTarget.createElement('p');
        outcome.className = 'text-fallback__poi-outcome';
        outcome.textContent = `${poi.outcomeLabel}: ${poi.outcomeValue}`;
        article.appendChild(outcome);
      }

      if (poi.metrics.length > 0) {
        const metricsHeading = documentTarget.createElement('h5');
        metricsHeading.className = 'text-fallback__poi-metrics-heading';
        metricsHeading.textContent = siteStrings.metricsHeading;
        article.appendChild(metricsHeading);

        const metrics = documentTarget.createElement('dl');
        metrics.className = 'text-fallback__poi-metrics';
        poi.metrics.forEach((metric) => {
          const term = documentTarget.createElement('dt');
          term.className = 'text-fallback__poi-metric-label';
          term.textContent = metric.label;
          metrics.appendChild(term);

          const value = documentTarget.createElement('dd');
          value.className = 'text-fallback__poi-metric-value';
          value.textContent = metric.value;
          metrics.appendChild(value);
        });
        article.appendChild(metrics);
      }

      if (poi.links.length > 0) {
        const linksHeading = documentTarget.createElement('h5');
        linksHeading.className = 'text-fallback__poi-links-heading';
        linksHeading.textContent = siteStrings.linksHeading;
        article.appendChild(linksHeading);

        const links = documentTarget.createElement('ul');
        links.className = 'text-fallback__poi-links';
        poi.links.forEach((link) => {
          const item = documentTarget.createElement('li');
          item.className = 'text-fallback__poi-link';
          const anchor = documentTarget.createElement('a');
          anchor.className = 'text-fallback__link';
          anchor.href = link.href;
          anchor.rel = 'noopener';
          anchor.textContent = link.label;
          item.appendChild(anchor);
          links.appendChild(item);
        });
        article.appendChild(links);
      }

      list.appendChild(article);
    });

    roomSection.appendChild(list);
    section.appendChild(roomSection);
  });

  return section;
}

export function renderTextFallback(
  container: HTMLElement,
  options: RenderTextFallbackOptions
): void {
  const {
    reason,
    resumeUrl = 'docs/resume/2025-09/resume.pdf',
    githubUrl = 'https://github.com/futuroptimist',
    immersiveUrl: providedImmersiveUrl,
  } = options;
  const documentTarget = container.ownerDocument ?? document;
  const immersiveUrl =
    providedImmersiveUrl ??
    createImmersiveModeUrl(documentTarget.defaultView?.location ?? undefined);
  const localeHint =
    documentTarget.documentElement.lang ||
    (typeof navigator !== 'undefined' ? navigator.language : undefined);
  const direction = getLocaleDirection(localeHint);
  const script = getLocaleScript(localeHint);
  documentTarget.documentElement.dir = direction;
  documentTarget.documentElement.dataset.localeDirection = direction;
  documentTarget.documentElement.dataset.localeScript = script;

  container.innerHTML = '';
  container.setAttribute('data-mode', 'text');
  container.dataset.localeDirection = direction;
  container.dataset.localeScript = script;

  const section = documentTarget.createElement('section');
  section.className = 'text-fallback';
  section.setAttribute('data-reason', reason);
  section.dir = direction;
  section.dataset.localeDirection = direction;
  section.dataset.localeScript = script;
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
      case 'low-end-device':
        return 'We detected a lightweight device profile, so we loaded the fast text tour to keep navigation responsive.';
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
  const portfolioSection = createTextPortfolioSection(
    documentTarget,
    localeHint
  );
  if (portfolioSection) {
    section.appendChild(portfolioSection);
  }
  container.appendChild(section);
}
