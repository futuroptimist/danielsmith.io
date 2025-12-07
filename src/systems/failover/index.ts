import { FLOOR_PLAN } from '../../assets/floorPlan';
import {
  formatMessage,
  getLocaleDirection,
  getLocaleScript,
  resolveLocale,
  getPoiCopy,
  getPoiNarrativeLogStrings,
  getSiteStrings,
} from '../../assets/i18n';
import { getPoiDefinitions } from '../../scene/poi/registry';
import type { PoiLink } from '../../scene/poi/types';
import type { FallbackReason } from '../../types/failover';
import {
  getModeAnnouncer,
  initializeModeAnnouncementObserver,
} from '../../ui/accessibility/modeAnnouncer';
import {
  createImmersiveModeUrl,
  getModeFromSearch,
  IMMERSIVE_MODE_VALUE,
  shouldDisablePerformanceFailover,
  TEXT_MODE_VALUE,
} from '../../ui/immersiveUrl';

import {
  readModePreference as readStoredModePreference,
  type ModePreference,
} from './modePreference';

export type { FallbackReason } from '../../types/failover';

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
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /slackbot/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /linkedinbot/i,
  /skypeuripreview/i,
  /line\//i,
  /linebot/i,
  /instagram/i,
  /snapchat/i,
  /viber\/|viberbot/i,
  /vkshare/i,
  /headless/i,
  /lighthouse/i,
  /rendertron/i,
  /pinterest/i,
  /embedly/i,
  /redditbot/i,
  /quora\slink\spreview/i,
  /bitlybot/i,
  /ia_archiver/i,
  /applebot/i,
  /teamsbot/i,
  /zoominfo\b/i,
  /duckduckbot/i,
  /petalbot/i,
  /google-?inspectiontool/i,
  /googleother/i,
  /bingpreview/i,
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
  /reqwest\//i,
  /okhttp\//i,
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
  const mode = getModeFromSearch(search);
  const disablePerformanceFailover = shouldDisablePerformanceFailover(search);

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
    normalizedEffectiveType === 'slow-2g' ||
    normalizedEffectiveType === '2g' ||
    normalizedEffectiveType === '3g';

  if (mode === TEXT_MODE_VALUE) {
    return { shouldUseFallback: true, reason: 'manual' };
  }

  if (mode === IMMERSIVE_MODE_VALUE) {
    return { shouldUseFallback: false };
  }

  if (!mode && storedPreference === TEXT_MODE_VALUE) {
    return { shouldUseFallback: true, reason: 'manual' };
  }

  const webglSupported = isWebglSupported(options);

  if (
    (!mode || mode.length === 0) &&
    !disablePerformanceFailover &&
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

  if (!disablePerformanceFailover && hasLowMemory) {
    return { shouldUseFallback: true, reason: 'low-memory' };
  }

  if (
    (!mode || mode.length === 0) &&
    !disablePerformanceFailover &&
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

function createAboutSection(
  documentTarget: Document,
  textFallbackStrings: SiteTextFallbackStrings
): HTMLElement {
  const section = documentTarget.createElement('section');
  section.className = 'text-fallback__about';
  section.dataset.section = 'about';

  const heading = documentTarget.createElement('h2');
  heading.className = 'text-fallback__section-heading';
  heading.textContent = textFallbackStrings.about.heading;
  section.appendChild(heading);

  const summary = documentTarget.createElement('p');
  summary.className = 'text-fallback__about-summary';
  summary.textContent = textFallbackStrings.about.summary;
  section.appendChild(summary);

  if (textFallbackStrings.about.highlights.length > 0) {
    const list = documentTarget.createElement('ul');
    list.className = 'text-fallback__highlights';
    textFallbackStrings.about.highlights.forEach((highlight) => {
      const item = documentTarget.createElement('li');
      item.className = 'text-fallback__highlight';
      item.textContent = highlight;
      list.appendChild(item);
    });
    section.appendChild(list);
  }

  return section;
}

function createSkillsSection(
  documentTarget: Document,
  textFallbackStrings: SiteTextFallbackStrings
): HTMLElement {
  const section = documentTarget.createElement('section');
  section.className = 'text-fallback__skills';
  section.dataset.section = 'skills';

  const heading = documentTarget.createElement('h2');
  heading.className = 'text-fallback__section-heading';
  heading.textContent = textFallbackStrings.skills.heading;
  section.appendChild(heading);

  const list = documentTarget.createElement('ul');
  list.className = 'text-fallback__skills-list';
  textFallbackStrings.skills.items.forEach((item) => {
    const entry = documentTarget.createElement('li');
    entry.className = 'text-fallback__skills-item';

    const label = documentTarget.createElement('span');
    label.className = 'text-fallback__skills-label';
    label.textContent = `${item.label}: `;
    entry.appendChild(label);

    const value = documentTarget.createElement('span');
    value.className = 'text-fallback__skills-value';
    value.textContent = item.value;
    entry.appendChild(value);

    list.appendChild(entry);
  });

  section.appendChild(list);
  return section;
}

function createTimelineSection(
  documentTarget: Document,
  textFallbackStrings: SiteTextFallbackStrings
): HTMLElement {
  const section = documentTarget.createElement('section');
  section.className = 'text-fallback__timeline';
  section.dataset.section = 'timeline';

  const heading = documentTarget.createElement('h2');
  heading.className = 'text-fallback__section-heading';
  heading.textContent = textFallbackStrings.timeline.heading;
  section.appendChild(heading);

  const list = documentTarget.createElement('ul');
  list.className = 'text-fallback__timeline-list';
  textFallbackStrings.timeline.entries.forEach((entry) => {
    const item = documentTarget.createElement('li');
    item.className = 'text-fallback__timeline-entry';

    const title = documentTarget.createElement('div');
    title.className = 'text-fallback__timeline-title';
    title.textContent = `${entry.role} · ${entry.org}`;
    item.appendChild(title);

    const meta = documentTarget.createElement('div');
    meta.className = 'text-fallback__timeline-meta';
    meta.textContent = ` ${entry.period} · ${entry.location}`;
    item.appendChild(meta);

    const summary = documentTarget.createElement('p');
    summary.className = 'text-fallback__timeline-summary';
    summary.textContent = ` ${entry.summary}`;
    item.appendChild(summary);

    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function createContactSection(
  documentTarget: Document,
  textFallbackStrings: SiteTextFallbackStrings,
  resumeUrl: string,
  githubUrl: string
): HTMLElement {
  const section = documentTarget.createElement('section');
  section.className = 'text-fallback__contact';
  section.dataset.section = 'contact';

  const heading = documentTarget.createElement('h2');
  heading.className = 'text-fallback__section-heading';
  heading.textContent = textFallbackStrings.contact.heading;
  section.appendChild(heading);

  const list = documentTarget.createElement('ul');
  list.className = 'text-fallback__contact-list';

  const emailItem = documentTarget.createElement('li');
  emailItem.className = 'text-fallback__contact-item';
  const emailLabel = documentTarget.createElement('span');
  emailLabel.className = 'text-fallback__contact-label';
  emailLabel.textContent = `${textFallbackStrings.contact.emailLabel}:`;
  emailItem.appendChild(emailLabel);
  const emailLink = documentTarget.createElement('a');
  emailLink.className = 'text-fallback__link';
  emailLink.href = `mailto:${textFallbackStrings.contact.email}`;
  emailLink.textContent = textFallbackStrings.contact.email;
  emailItem.appendChild(emailLink);
  list.appendChild(emailItem);

  const githubItem = documentTarget.createElement('li');
  githubItem.className = 'text-fallback__contact-item';
  const githubLabel = documentTarget.createElement('span');
  githubLabel.className = 'text-fallback__contact-label';
  githubLabel.textContent = `${textFallbackStrings.contact.githubLabel}:`;
  githubItem.appendChild(githubLabel);
  const githubLink = documentTarget.createElement('a');
  githubLink.className = 'text-fallback__link';
  githubLink.href = githubUrl;
  githubLink.textContent = textFallbackStrings.contact.githubUrl;
  githubLink.rel = 'noopener';
  githubItem.appendChild(githubLink);
  list.appendChild(githubItem);

  const resumeItem = documentTarget.createElement('li');
  resumeItem.className = 'text-fallback__contact-item';
  const resumeLabel = documentTarget.createElement('span');
  resumeLabel.className = 'text-fallback__contact-label';
  resumeLabel.textContent = `${textFallbackStrings.contact.resumeLabel}:`;
  resumeItem.appendChild(resumeLabel);
  const resumeLink = documentTarget.createElement('a');
  resumeLink.className = 'text-fallback__link';
  resumeLink.href = resumeUrl;
  resumeLink.textContent = textFallbackStrings.contact.resumeUrl;
  resumeLink.rel = 'noopener';
  resumeItem.appendChild(resumeLink);
  list.appendChild(resumeItem);

  section.appendChild(list);
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
  const localeHint =
    documentTarget.documentElement.lang ||
    (typeof navigator !== 'undefined' ? navigator.language : undefined);
  const textFallbackStrings = getSiteStrings(localeHint).textFallback;
  const actionStrings = textFallbackStrings.actions;
  const resolvedResumeUrl =
    resumeUrl ??
    textFallbackStrings.contact.resumeUrl ??
    'docs/resume/2025-09/resume.pdf';
  const resolvedGithubUrl = githubUrl ?? textFallbackStrings.contact.githubUrl;
  const immersiveUrl = createImmersiveModeUrl(
    providedImmersiveUrl ?? documentTarget.defaultView?.location ?? undefined
  );
  const resolvedLocale = resolveLocale(localeHint);
  const langValue = resolvedLocale === 'en-x-pseudo' ? 'en' : resolvedLocale;
  const direction = getLocaleDirection(localeHint);
  const script = getLocaleScript(localeHint);
  documentTarget.documentElement.lang = langValue;
  documentTarget.documentElement.dir = direction;
  documentTarget.documentElement.dataset.localeDirection = direction;
  documentTarget.documentElement.dataset.localeScript = script;
  documentTarget.documentElement.dataset.appMode = 'fallback';
  documentTarget.documentElement.dataset.fallbackReason = reason;
  documentTarget.documentElement.removeAttribute('data-app-loading');

  container.innerHTML = '';
  container.setAttribute('data-mode', 'text');
  container.lang = langValue;
  container.dataset.localeDirection = direction;
  container.dataset.localeScript = script;

  const section = documentTarget.createElement('section');
  section.className = 'text-fallback';
  section.setAttribute('data-reason', reason);
  section.lang = langValue;
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
  const descriptionStrings = textFallbackStrings.reasonDescriptions;
  description.textContent =
    descriptionStrings[reason] ?? descriptionStrings.manual;
  section.appendChild(description);

  section.appendChild(createAboutSection(documentTarget, textFallbackStrings));
  section.appendChild(createSkillsSection(documentTarget, textFallbackStrings));
  section.appendChild(
    createTimelineSection(documentTarget, textFallbackStrings)
  );
  section.appendChild(
    createContactSection(
      documentTarget,
      textFallbackStrings,
      resolvedResumeUrl,
      resolvedGithubUrl
    )
  );

  const list = documentTarget.createElement('ul');
  list.className = 'text-fallback__actions';

  const immersiveItem = documentTarget.createElement('li');
  immersiveItem.className = 'text-fallback__action';
  const immersiveLink = documentTarget.createElement('a');
  immersiveLink.href = immersiveUrl;
  immersiveLink.className = 'text-fallback__link';
  immersiveLink.textContent = actionStrings.immersiveLink;
  immersiveLink.rel = 'noopener';
  immersiveLink.dataset.action = 'immersive';
  immersiveItem.appendChild(immersiveLink);
  list.appendChild(immersiveItem);

  const resumeItem = documentTarget.createElement('li');
  resumeItem.className = 'text-fallback__action';
  const resumeLink = documentTarget.createElement('a');
  resumeLink.href = resolvedResumeUrl;
  resumeLink.className = 'text-fallback__link';
  resumeLink.textContent = actionStrings.resumeLink;
  resumeLink.rel = 'noopener';
  resumeLink.dataset.action = 'resume';
  resumeItem.appendChild(resumeLink);
  list.appendChild(resumeItem);

  const githubItem = documentTarget.createElement('li');
  githubItem.className = 'text-fallback__action';
  const githubLink = documentTarget.createElement('a');
  githubLink.href = resolvedGithubUrl;
  githubLink.className = 'text-fallback__link';
  githubLink.textContent = actionStrings.githubLink;
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

  try {
    getModeAnnouncer(documentTarget).announceFallback(reason);
  } catch (error) {
    console.warn('Failed to announce fallback mode.', error);
  }
}
