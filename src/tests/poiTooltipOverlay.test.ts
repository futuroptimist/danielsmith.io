import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getPoiOverlayChromeStrings } from '../assets/i18n';
import { getPoiDefinitions } from '../scene/poi/registry';
import { PoiTooltipOverlay } from '../scene/poi/tooltipOverlay';
import type { PoiDefinition } from '../scene/poi/types';
import { GuidedTourPreference } from '../systems/guidedTour/preference';
import { InteractionTimeline } from '../ui/accessibility/interactionTimeline';

class TimelineHarness {
  private currentTime = 0;

  private nextHandle = 1;

  private readonly events = new Map<
    number,
    { time: number; callback: () => void }
  >();

  readonly timeline: InteractionTimeline;

  constructor({
    minIntervalMs = 250,
    maxQueueLength = 2,
  }: { minIntervalMs?: number; maxQueueLength?: number } = {}) {
    this.timeline = new InteractionTimeline({
      minIntervalMs,
      maxQueueLength,
      now: () => this.currentTime,
      schedule: (callback, delay) => {
        const handle = this.nextHandle++;
        this.events.set(handle, {
          time: this.currentTime + Math.max(0, delay),
          callback,
        });
        return handle as unknown as ReturnType<typeof setTimeout>;
      },
      cancel: (handle) => {
        this.events.delete(handle as unknown as number);
      },
    });
  }

  advance(ms: number): void {
    if (ms < 0) {
      throw new Error('TimelineHarness cannot advance backwards.');
    }
    this.currentTime += ms;
    this.flush();
  }

  flush(): void {
    let ran = false;
    do {
      ran = false;
      for (const [handle, event] of Array.from(this.events.entries())) {
        if (event.time <= this.currentTime) {
          this.events.delete(handle);
          event.callback();
          ran = true;
        }
      }
    } while (ran);
  }

  dispose(): void {
    this.timeline.dispose();
    this.events.clear();
  }
}

describe('PoiTooltipOverlay', () => {
  let container: HTMLElement;
  let overlay: PoiTooltipOverlay;
  let timelineHarness: TimelineHarness;
  let preference: GuidedTourPreference;

  const basePoi: PoiDefinition = {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist',
    summary:
      'Triple-monitor editing bay capturing Futuroptimist releases with live timeline overlays.',
    interactionPrompt: 'Inspect Futuroptimist',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2.6,
    footprint: { width: 3.2, depth: 3 },
    outcome: { label: 'Outcome', value: 'Reduced edit prep 35%' },
    metrics: [
      { label: 'Workflow', value: 'Resolve-style suite · triple display' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist' },
      { label: 'Docs', href: 'https://futuroptimist.dev' },
    ],
    status: 'prototype',
  };

  const createPreference = () =>
    new GuidedTourPreference({
      storage: {
        getItem: () => null,
        setItem: () => {
          /* noop */
        },
      },
      windowTarget: window,
      defaultEnabled: true,
    });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    timelineHarness = new TimelineHarness();
    preference = createPreference();
    overlay = new PoiTooltipOverlay({
      container,
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });
  });

  afterEach(() => {
    overlay.dispose();
    timelineHarness.dispose();
    preference.dispose();
    container.remove();
  });

  it('renders hovered POI metadata and exposes links', () => {
    overlay.setHovered(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(root.dataset.state).toBe('hovered');

    const title = root.querySelector(
      '.poi-tooltip-overlay__title'
    ) as HTMLHeadingElement;
    expect(title.textContent).toBe(basePoi.title);
    expect(root.getAttribute('aria-labelledby')).toBe(title.id);

    const summary = root.querySelector(
      '.poi-tooltip-overlay__summary'
    ) as HTMLParagraphElement;
    expect(summary.textContent).toContain('editing');

    const outcomeLabel = root.querySelector(
      '.poi-tooltip-overlay__outcome-label'
    );
    expect(outcomeLabel?.textContent).toBe('Outcome');
    const outcomeValue = root.querySelector(
      '.poi-tooltip-overlay__outcome-value'
    );
    expect(outcomeValue?.textContent).toBe('Reduced edit prep 35%');

    const metrics = Array.from(
      root.querySelectorAll('.poi-tooltip-overlay__metric')
    );
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.textContent).toContain('Workflow');

    const links = Array.from(
      root.querySelectorAll<HTMLAnchorElement>('.poi-tooltip-overlay__link')
    );
    expect(links).toHaveLength(2);
    expect(links[0]?.href).toBe(basePoi.links?.[0]?.href ?? '');

    const describedBy = root.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const describedIds = describedBy?.split(' ') ?? [];
    expect(describedIds).toContain(summary.id);
    const outcomeElement = root.querySelector(
      '.poi-tooltip-overlay__outcome'
    ) as HTMLElement;
    expect(describedIds).toContain(outcomeElement.id);
    const metricsList = root.querySelector(
      '.poi-tooltip-overlay__metrics'
    ) as HTMLElement;
    expect(describedIds).toContain(metricsList.id);
    const linksList = root.querySelector(
      '.poi-tooltip-overlay__links'
    ) as HTMLElement;
    expect(describedIds).toContain(linksList.id);
  });

  it('renders selected POI metadata without a hover target', () => {
    overlay.setSelected(basePoi, { inputMethod: 'pointer' });

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.dataset.state).toBe('selected');
    expect(root.querySelector('.poi-tooltip-overlay__title')?.textContent).toBe(
      basePoi.title
    );
  });

  it('emits a dismiss callback from a keyboard-focusable close button', () => {
    const onDismiss = vi.fn();
    overlay.dispose();
    timelineHarness.dispose();
    preference.dispose();
    timelineHarness = new TimelineHarness();
    preference = createPreference();
    overlay = new PoiTooltipOverlay({
      container,
      onDismiss,
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });
    overlay.setSelected(basePoi, { inputMethod: 'pointer' });

    const closeButton = container.querySelector<HTMLButtonElement>(
      '.poi-tooltip-overlay__close'
    );
    expect(closeButton).toBeTruthy();
    expect(closeButton?.tagName).toBe('BUTTON');
    expect(closeButton?.type).toBe('button');
    expect(closeButton?.getAttribute('aria-label')).toBe('Close POI details');
    expect(closeButton?.hidden).toBe(false);
    expect(closeButton?.disabled).toBe(false);
    expect(closeButton?.tabIndex).toBe(0);

    closeButton?.focus();
    expect(document.activeElement).toBe(closeButton);
    closeButton?.click();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('removes the hidden close button from keyboard navigation', () => {
    const onDismiss = vi.fn();
    overlay.dispose();
    timelineHarness.dispose();
    preference.dispose();
    timelineHarness = new TimelineHarness();
    preference = createPreference();
    overlay = new PoiTooltipOverlay({
      container,
      onDismiss,
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    const closeButton = container.querySelector<HTMLButtonElement>(
      '.poi-tooltip-overlay__close'
    );
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    expect(closeButton?.hidden).toBe(true);
    expect(closeButton?.disabled).toBe(true);
    expect(closeButton?.tabIndex).toBe(-1);

    overlay.setSelected(basePoi, { inputMethod: 'pointer' });

    expect(root.dataset.state).toBe('selected');
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(root.hasAttribute('inert')).toBe(false);
    expect(closeButton?.hidden).toBe(false);
    expect(closeButton?.disabled).toBe(false);
    expect(closeButton?.tabIndex).toBe(0);

    closeButton?.focus();
    expect(document.activeElement).toBe(closeButton);

    overlay.setSelected(null, { inputMethod: 'pointer' });

    expect(root.dataset.state).toBe('hidden');
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    expect(closeButton?.hidden).toBe(true);
    expect(closeButton?.disabled).toBe(true);
    expect(closeButton?.tabIndex).toBe(-1);
  });

  it('keeps the close button inert when no dismiss handler is available', () => {
    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    const closeButton = container.querySelector<HTMLButtonElement>(
      '.poi-tooltip-overlay__close'
    );

    overlay.setSelected(basePoi, { inputMethod: 'pointer' });

    expect(root.dataset.state).toBe('selected');
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(root.hasAttribute('inert')).toBe(false);
    expect(closeButton?.hidden).toBe(true);
    expect(closeButton?.disabled).toBe(true);
    expect(closeButton?.tabIndex).toBe(-1);
  });

  it('enables the close button for hovered and passive recommendations', () => {
    const onDismiss = vi.fn();
    overlay.dispose();
    timelineHarness.dispose();
    preference.dispose();
    timelineHarness = new TimelineHarness();
    preference = createPreference();
    overlay = new PoiTooltipOverlay({
      container,
      onDismiss,
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    const closeButton = container.querySelector<HTMLButtonElement>(
      '.poi-tooltip-overlay__close'
    );

    overlay.setHovered(basePoi);

    expect(root.dataset.state).toBe('hovered');
    expect(closeButton?.hidden).toBe(false);
    expect(closeButton?.disabled).toBe(false);
    expect(closeButton?.tabIndex).toBe(0);

    closeButton?.click();

    expect(onDismiss).toHaveBeenCalledTimes(1);

    overlay.setHovered(null);
    overlay.setIdleState(true);
    overlay.setRecommendation(basePoi);

    expect(root.dataset.state).toBe('recommended');
    expect(closeButton?.hidden).toBe(false);
    expect(closeButton?.disabled).toBe(false);
    expect(closeButton?.tabIndex).toBe(0);

    closeButton?.click();

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('can hide after dismiss clears selected state through the public API', () => {
    overlay.setSelected(basePoi, { inputMethod: 'pointer' });
    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);

    overlay.setSelected(null, { inputMethod: 'pointer' });

    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
    expect(root.dataset.state).toBe('hidden');
  });

  it('prefers hovered metadata over selected and hides when cleared', () => {
    const selectedPoi: PoiDefinition = {
      ...basePoi,
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel',
      position: { x: 2, y: 0, z: 4 },
      metrics: [{ label: 'Automation', value: 'CI-ready prompts' }],
      links: [
        {
          label: 'Flywheel',
          href: 'https://github.com/futuroptimist/flywheel',
        },
      ],
      status: undefined,
      interactionPrompt: 'Engage Flywheel systems',
    };

    overlay.setSelected(selectedPoi);
    overlay.setHovered({
      ...basePoi,
      title: 'Temporary Hover',
      interactionPrompt: 'Inspect Temporary Hover',
    });

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('hovered');
    expect(root.querySelector('.poi-tooltip-overlay__title')?.textContent).toBe(
      'Temporary Hover'
    );

    overlay.setHovered(null);
    expect(root.dataset.state).toBe('selected');
    expect(root.querySelector('.poi-tooltip-overlay__title')?.textContent).toBe(
      selectedPoi.title
    );

    overlay.setSelected(null);
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('aria-describedby')).toBeNull();
  });

  it('renders Mandarin POI detail chrome without English fallback copy', () => {
    const tokenplace = getPoiDefinitions('zh-Hans').find(
      (poi) => poi.id === 'tokenplace-studio-cluster'
    );

    expect(tokenplace).toBeTruthy();

    overlay.setStrings(getPoiOverlayChromeStrings('zh-Hans'));
    overlay.setVisitedPoiIds(new Set([tokenplace?.id ?? '']));
    overlay.setSelected(tokenplace as PoiDefinition);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('selected');
    expect(
      root.querySelector('.poi-tooltip-overlay__summary')?.textContent
    ).toContain('端到端加密');
    expect(
      root.querySelector('.poi-tooltip-overlay__outcome-label')?.textContent
    ).toBe('成果');
    expect(
      root.querySelector('.poi-tooltip-overlay__outcome-value')?.textContent
    ).toContain('密文和安全路由元数据');
    expect(
      root.querySelector('.poi-tooltip-overlay__metric-label')?.textContent
    ).toBe('星标');
    expect(
      root.querySelector('.poi-tooltip-overlay__metric-value')?.textContent
    ).toBe('正在从 GitHub 同步…');
    expect(
      root.querySelector('.poi-tooltip-overlay__visited')?.textContent
    ).toBe('已访问');
    expect(
      root
        .querySelector('.poi-tooltip-overlay__links')
        ?.getAttribute('aria-label')
    ).toBe('相关案例研究');
    expect(
      root
        .querySelector<HTMLButtonElement>('.poi-tooltip-overlay__close')
        ?.getAttribute('aria-label')
    ).toBe('关闭兴趣点详情');
  });

  it('refreshes active selected POI copy and chrome when locale strings change', () => {
    overlay.setSelected(basePoi);

    const localizedPoi: PoiDefinition = {
      ...basePoi,
      title: '⟦Futuroptimist⟧',
      summary: '⟦Localized summary for the active exhibit.⟧',
      outcome: { label: '', value: '⟦Localized outcome.⟧' },
      metrics: [{ label: '⟦Workflow⟧', value: '⟦Localized metric.⟧' }],
      links: [{ label: '⟦Docs⟧', href: 'https://futuroptimist.dev' }],
    };

    overlay.setStrings({
      visited: '⟦Visited⟧',
      nextHighlight: '⟦Next highlight⟧',
      prototype: '⟦Prototype⟧',
      live: '⟦Live⟧',
      closeDetails: '⟦Close POI details⟧',
      relatedCaseStudies: '⟦Related case studies⟧',
      outcomeFallbackLabel: '⟦Outcome⟧',
      discoveryAnnouncementTemplate: '⟦{title} discovered. {summary}⟧',
      debugAnchorLabel: '⟦POI anchor⟧',
      debugTrianglesLabel: '⟦Model triangles⟧',
    });
    overlay.setSelected(localizedPoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('selected');
    expect(root.querySelector('.poi-tooltip-overlay__title')?.textContent).toBe(
      localizedPoi.title
    );
    expect(
      root.querySelector('.poi-tooltip-overlay__summary')?.textContent
    ).toBe(localizedPoi.summary);
    expect(
      root.querySelector('.poi-tooltip-overlay__outcome-label')?.textContent
    ).toBe('⟦Outcome⟧');
    expect(
      root.querySelector('.poi-tooltip-overlay__metric-label')?.textContent
    ).toBe('⟦Workflow⟧');
    expect(
      root.querySelector('.poi-tooltip-overlay__metric-value')?.textContent
    ).toBe('⟦Localized metric.⟧');
    expect(
      root.querySelector('.poi-tooltip-overlay__status')?.textContent
    ).toBe('⟦Prototype⟧');
    expect(
      root
        .querySelector('.poi-tooltip-overlay__links')
        ?.getAttribute('aria-label')
    ).toBe('⟦Related case studies⟧');
  });

  it.each([
    [
      'es',
      'Plataforma segura de IA generativa',
      'Resultado',
      'Prototipo',
      'Visitado',
      'Casos relacionados',
      'Cerrar detalles del POI',
    ],
    [
      'pt',
      'Plataforma segura de IA generativa',
      'Resultado',
      'Protótipo',
      'Visitado',
      'Estudos de caso relacionados',
      'Fechar detalhes do POI',
    ],
    [
      'de',
      'Sichere Peer-to-Peer-Plattform',
      'Ergebnis',
      'Prototyp',
      'Besucht',
      'Verwandte Fallstudien',
      'POI-Details schließen',
    ],
    [
      'hu',
      'Biztonságos peer-to-peer',
      'Eredmény',
      'Prototípus',
      'Megnézve',
      'Kapcsolódó esettanulmányok',
      'POI részletek bezárása',
    ],
  ] as const)(
    'renders %s POI detail copy and overlay chrome without locale fallthrough',
    (
      locale,
      summaryFragment,
      outcomeLabel,
      prototypeLabel,
      visitedLabel,
      relatedLabel,
      closeLabel
    ) => {
      const poi = getPoiDefinitions(locale).find(
        (definition) => definition.id === 'tokenplace-studio-cluster'
      );
      expect(poi).toBeDefined();

      const localizedPoi = poi!;
      overlay.setStrings(getPoiOverlayChromeStrings(locale));
      overlay.setVisitedPoiIds(new Set([localizedPoi.id]));
      overlay.setRecommendation(localizedPoi);
      overlay.setSelected(localizedPoi);

      const root = container.querySelector(
        '.poi-tooltip-overlay'
      ) as HTMLElement;
      expect(root.dataset.state).toBe('selected');
      expect(
        root.querySelector('.poi-tooltip-overlay__summary')?.textContent
      ).toContain(summaryFragment);
      expect(
        root.querySelector('.poi-tooltip-overlay__outcome-label')?.textContent
      ).toBe(outcomeLabel);
      expect(
        root.querySelector('.poi-tooltip-overlay__status')?.textContent
      ).toBe(prototypeLabel);
      expect(
        root.querySelector('.poi-tooltip-overlay__visited')?.textContent
      ).toBe(visitedLabel);
      expect(
        root
          .querySelector('.poi-tooltip-overlay__links')
          ?.getAttribute('aria-label')
      ).toBe(relatedLabel);
      expect(
        root
          .querySelector<HTMLButtonElement>('.poi-tooltip-overlay__close')
          ?.getAttribute('aria-label')
      ).toBe(closeLabel);
    }
  );

  it('renders zh-Hans POI detail copy and overlay chrome without English fallback', () => {
    const poi = getPoiDefinitions('zh-Hans').find(
      (definition) => definition.id === 'tokenplace-studio-cluster'
    );
    expect(poi).toBeDefined();

    const zhPoi = poi!;
    overlay.setStrings(getPoiOverlayChromeStrings('zh-Hans'));
    overlay.setVisitedPoiIds(new Set([zhPoi.id]));
    overlay.setRecommendation(zhPoi);
    overlay.setSelected(zhPoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('selected');
    expect(
      root.querySelector('.poi-tooltip-overlay__summary')?.textContent
    ).toBe('中继盲的端到端加密令牌中转站，用于安全共享敏感短文本。');
    expect(
      root.querySelector('.poi-tooltip-overlay__outcome-label')?.textContent
    ).toBe('成果');
    expect(
      root.querySelector('.poi-tooltip-overlay__outcome-value')?.textContent
    ).toBe('保持中继只看到密文和安全路由元数据。');
    expect(
      root.querySelector('.poi-tooltip-overlay__status')?.textContent
    ).toBe('原型');
    expect(
      root.querySelector('.poi-tooltip-overlay__visited')?.textContent
    ).toBe('已访问');
    expect(
      root.querySelector('.poi-tooltip-overlay__recommendation')?.textContent
    ).toBe('下一个亮点');
    expect(
      root.querySelector('.poi-tooltip-overlay__metric-label')?.textContent
    ).toBe('星标');
    expect(
      root.querySelector('.poi-tooltip-overlay__metric-value')?.textContent
    ).toBe('正在从 GitHub 同步…');
    expect(
      root
        .querySelector('.poi-tooltip-overlay__links')
        ?.getAttribute('aria-label')
    ).toBe('相关案例研究');
  });

  it('renders zero-star metrics as visible values', () => {
    overlay.setHovered({
      ...basePoi,
      id: 'sugarkube-backyard-greenhouse',
      title: 'Sugarkube',
      metrics: [{ label: 'Stars', value: '0 stars' }],
    });

    const metric = container.querySelector('.poi-tooltip-overlay__metric');
    expect(metric).toBeTruthy();
    expect(
      metric?.querySelector('.poi-tooltip-overlay__metric-label')?.textContent
    ).toBe('Stars');
    expect(
      metric?.querySelector('.poi-tooltip-overlay__metric-value')?.textContent
    ).toBe('0 stars');
  });

  it('skips rebuilding active POI content when updates do not change copy', () => {
    overlay.setHovered(basePoi);
    const metricSelector = '.poi-tooltip-overlay__metric';
    const initialMetric = container.querySelector(metricSelector);

    overlay.notifyPoiUpdated(basePoi.id);

    expect(container.querySelector(metricSelector)).toBe(initialMetric);
  });

  it('refreshes metric values when notified about updates', () => {
    overlay.setHovered(basePoi);
    const metricSelector = '.poi-tooltip-overlay__metric-value';
    const initialValues = Array.from(
      container.querySelectorAll<HTMLSpanElement>(metricSelector)
    ).map((node) => node.textContent);
    expect(initialValues).toContain('Resolve-style suite · triple display');

    if (basePoi.metrics?.[0]) {
      basePoi.metrics[0].value = 'Updated workflow';
    }

    overlay.notifyPoiUpdated(basePoi.id);

    const updatedValues = Array.from(
      container.querySelectorAll<HTMLSpanElement>(metricSelector)
    ).map((node) => node.textContent);
    expect(updatedValues).toContain('Updated workflow');
  });

  it('hides the outcome row when a POI omits the outcome field', () => {
    const poiWithoutOutcome: PoiDefinition = {
      ...basePoi,
      id: 'tokenplace-studio-cluster',
      title: 'token.place',
      outcome: undefined,
      interactionPrompt: 'Inspect token.place',
    };

    overlay.setSelected(poiWithoutOutcome);

    const outcome = container.querySelector(
      '.poi-tooltip-overlay__outcome'
    ) as HTMLElement;
    expect(outcome.hidden).toBe(true);
    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    const describedIds =
      root.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(describedIds).not.toContain(outcome.id);
  });

  it('surfaces visited badge when POI is marked as visited', () => {
    overlay.setVisitedPoiIds(new Set([basePoi.id]));
    overlay.setSelected(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    const visitedBadge = root.querySelector(
      '.poi-tooltip-overlay__visited'
    ) as HTMLSpanElement;
    expect(visitedBadge.hidden).toBe(false);
    expect(visitedBadge.textContent).toBe('Visited');

    overlay.setVisitedPoiIds(new Set());
    overlay.setSelected(basePoi);
    expect(visitedBadge.hidden).toBe(true);
  });

  it('announces discovery in a live region when selecting a new POI', () => {
    overlay.setSelected(basePoi);

    const liveRegion = container.querySelector(
      '.poi-tooltip-overlay__live-region'
    ) as HTMLElement;
    expect(liveRegion).toBeTruthy();
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');

    const initialMessage = liveRegion.textContent ?? '';
    expect(initialMessage).toContain(`${basePoi.title} discovered.`);
    expect(initialMessage).toContain(basePoi.summary);

    const nextPoi: PoiDefinition = {
      ...basePoi,
      id: 'jobbot-studio-terminal',
      title: 'Futuroptimist Alt',
      interactionPrompt: 'Inspect Futuroptimist Alt',
    };

    overlay.setSelected(nextPoi);
    expect(liveRegion.textContent).toBe(initialMessage);

    timelineHarness.advance(249);
    expect(liveRegion.textContent).not.toContain(
      `${nextPoi.title} discovered.`
    );

    timelineHarness.advance(1);
    expect(liveRegion.textContent).toContain(`${nextPoi.title} discovered.`);
  });

  it('moves keyboard focus to the overlay when selection is keyboard-driven', () => {
    document.body.focus();
    overlay.setSelected(basePoi, { inputMethod: 'keyboard' });

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(document.activeElement).toBe(root);
  });

  it('preserves existing focus when selection comes from pointer input', () => {
    const sentinel = document.createElement('button');
    sentinel.type = 'button';
    container.appendChild(sentinel);
    sentinel.focus();

    overlay.setSelected(basePoi, { inputMethod: 'pointer' });

    expect(document.activeElement).toBe(sentinel);
  });

  it('supports custom discovery formatter and politeness levels', () => {
    overlay.dispose();
    timelineHarness.dispose();
    preference.dispose();
    timelineHarness = new TimelineHarness();
    preference = createPreference();
    overlay = new PoiTooltipOverlay({
      container,
      discoveryAnnouncer: {
        politeness: 'assertive',
        format: (poi) => `${poi.title} ready for inspection`,
      },
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });

    overlay.setSelected(basePoi);

    const liveRegion = container.querySelector(
      '.poi-tooltip-overlay__live-region'
    ) as HTMLElement;
    expect(liveRegion.getAttribute('aria-live')).toBe('assertive');
    expect(liveRegion.textContent).toBe(
      `${basePoi.title} ready for inspection`
    );
  });

  it('surfaces the recommendation overlay when idle', () => {
    overlay.setIdleState(true);
    overlay.setRecommendation(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('recommended');
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('false');

    const title = root.querySelector('.poi-tooltip-overlay__title');
    expect(title?.textContent).toBe(basePoi.title);

    const badge = root.querySelector(
      '.poi-tooltip-overlay__recommendation'
    ) as HTMLSpanElement;
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe('Next highlight');
  });

  it('keeps fresh idle sessions hidden until guided tour is enabled', () => {
    overlay.dispose();
    preference.dispose();
    preference = new GuidedTourPreference({
      storage: {
        getItem: () => null,
        setItem: () => {
          /* noop */
        },
      },
      windowTarget: window,
    });
    overlay = new PoiTooltipOverlay({
      container,
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });

    overlay.setIdleState(true);
    overlay.setRecommendation(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(preference.isEnabled()).toBe(false);
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
    expect(root.dataset.state).toBe('hidden');

    preference.setEnabled(true, 'api');
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.dataset.state).toBe('recommended');
  });

  it('does not surface passive recommendations when disabled', () => {
    overlay.setPassiveRecommendationsEnabled(false);
    overlay.setIdleState(true);
    overlay.setRecommendation(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
    expect(root.dataset.state).toBe('hidden');
    expect(root.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps explicit selection visible when passive recommendations are disabled', () => {
    overlay.setPassiveRecommendationsEnabled(false);
    overlay.setIdleState(true);
    overlay.setRecommendation(basePoi);
    overlay.setSelected(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('selected');
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('false');

    const title = root.querySelector('.poi-tooltip-overlay__title');
    expect(title?.textContent).toBe(basePoi.title);
  });

  it('shows a badge when the recommended POI is selected', () => {
    overlay.setIdleState(true);
    overlay.setRecommendation(basePoi);
    overlay.setSelected(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('selected');
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);

    const recommendationBadge = root.querySelector(
      '.poi-tooltip-overlay__recommendation'
    ) as HTMLSpanElement;
    expect(recommendationBadge.hidden).toBe(false);
    expect(recommendationBadge.textContent).toBe('Next highlight');

    overlay.setSelected(null);
    expect(root.dataset.state).toBe('recommended');
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
  });

  it('hides recommendation badges when guided tour mode is disabled', () => {
    overlay.setIdleState(true);
    preference.setEnabled(false, 'api');
    overlay.setRecommendation(basePoi);
    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);

    overlay.setSelected(basePoi);

    expect(root.dataset.guidedTour).toBe('off');
    const badge = root.querySelector(
      '.poi-tooltip-overlay__recommendation'
    ) as HTMLSpanElement;
    expect(badge.hidden).toBe(true);

    preference.setEnabled(true, 'api');
    expect(root.dataset.guidedTour).toBe('on');
    expect(badge.hidden).toBe(false);
  });

  it('suppresses recommendation overlays until the player becomes idle', () => {
    overlay.setRecommendation(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
    expect(root.dataset.state).toBe('hidden');

    overlay.setIdleState(true);

    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.dataset.state).toBe('recommended');
  });

  it('ignores updates after disposal', () => {
    overlay.dispose();
    overlay.setSelected(basePoi);
    const root = container.querySelector('.poi-tooltip-overlay');
    expect(root).toBeNull();
  });

  it('avoids repeating announcements for previously visited POIs', () => {
    overlay.setSelected(basePoi);

    const liveRegion = container.querySelector(
      '.poi-tooltip-overlay__live-region'
    ) as HTMLElement;
    expect(liveRegion.textContent).toContain(`${basePoi.title} discovered.`);

    overlay.setVisitedPoiIds(new Set([basePoi.id]));
    timelineHarness.advance(1000);
    overlay.setSelected(basePoi);
    timelineHarness.advance(250);
    expect(liveRegion.textContent).toContain(`${basePoi.title} discovered.`);
  });

  it('ignores discovery announcements when the formatter returns an empty string', () => {
    overlay.dispose();
    timelineHarness.dispose();
    preference.dispose();
    timelineHarness = new TimelineHarness();
    preference = createPreference();
    overlay = new PoiTooltipOverlay({
      container,
      discoveryAnnouncer: {
        format: () => '   ',
      },
      interactionTimeline: timelineHarness.timeline,
      guidedTourPreference: preference,
    });

    overlay.setSelected({ ...basePoi, summary: '' });

    const liveRegion = container.querySelector(
      '.poi-tooltip-overlay__live-region'
    ) as HTMLElement;
    expect(liveRegion.textContent).toBe('');
  });
});

describe('PoiTooltipOverlay debug details', () => {
  let container: HTMLElement;
  let overlay: PoiTooltipOverlay;
  const poi: PoiDefinition = {
    id: 'sugarkube-backyard-greenhouse',
    title: 'Sugarkube',
    summary: 'Relocated deployment marker.',
    interactionPrompt: 'Inspect Sugarkube',
    category: 'project',
    interaction: 'inspect',
    roomId: 'backyard',
    position: { x: -8.74, y: 0, z: -22.92 },
    interactionRadius: 2,
    footprint: { width: 1, depth: 1 },
    metrics: [{ label: 'Status', value: 'Relocated' }],
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    overlay = new PoiTooltipOverlay({
      container,
      getModelTriangleCount: () => 1234,
    });
    overlay.setStrings(getPoiOverlayChromeStrings('en'));
  });

  afterEach(() => {
    overlay.dispose();
    container.remove();
    document.documentElement.lang = '';
  });

  it('hides debug content by default while preserving normal metrics', () => {
    overlay.setSelected(poi);
    expect(
      container.querySelector<HTMLElement>('[data-poi-debug]')?.hidden
    ).toBe(true);
    expect(
      container.querySelector('.poi-tooltip-overlay__metrics')?.textContent
    ).toContain('Relocated');
  });

  it('shows bottom-center anchor and active model triangle count when enabled', () => {
    document.documentElement.lang = 'en';
    overlay.setSelected(poi);
    overlay.setDebugDetailsEnabled(true);

    expect(
      container.querySelector('[data-poi-debug-anchor]')?.textContent
    ).toBe('X -8.74 · Y 0.00 · Z -22.92');
    expect(
      container.querySelector('[data-poi-debug-triangles]')?.textContent
    ).toBe('1,234');
  });

  it('removes debug details from accessibility relationships immediately when disabled', () => {
    overlay.setSelected(poi);
    overlay.setDebugDetailsEnabled(true);
    const region = container.querySelector<HTMLElement>('.poi-tooltip-overlay');
    const debug = container.querySelector<HTMLElement>('[data-poi-debug]');
    expect(region?.getAttribute('aria-describedby')).toContain(debug?.id);

    overlay.setDebugDetailsEnabled(false);
    expect(
      container.querySelector<HTMLElement>('[data-poi-debug]')?.hidden
    ).toBe(true);
    expect(region?.getAttribute('aria-describedby')).not.toContain(debug?.id);
  });

  it('appears for hovered and recommended card states', () => {
    overlay.setDebugDetailsEnabled(true);
    overlay.setHovered(poi);
    expect(
      container.querySelector('[data-poi-debug-triangles]')?.textContent
    ).toBe('1,234');
    overlay.setHovered(null);
    overlay.setRecommendation(poi);
    overlay.setIdleState(true);
    expect(
      container.querySelector('[data-poi-debug-triangles]')?.textContent
    ).toBe('1,234');
  });
});
