import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PoiTooltipOverlay } from '../scene/poi/tooltipOverlay';
import type { PoiDefinition } from '../scene/poi/types';
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

  const basePoi: PoiDefinition = {
    id: 'futuroptimist-living-room-tv',
    title: 'Futuroptimist Creator Desk',
    summary:
      'Triple-monitor editing bay capturing Futuroptimist releases with live timeline overlays.',
    interactionPrompt: 'Inspect Futuroptimist Creator Desk',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 2.6,
    footprint: { width: 3.2, depth: 3 },
    metrics: [
      { label: 'Workflow', value: 'Resolve-style suite · triple display' },
    ],
    links: [
      { label: 'GitHub', href: 'https://github.com/futuroptimist' },
      { label: 'Docs', href: 'https://futuroptimist.dev' },
    ],
    status: 'prototype',
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    timelineHarness = new TimelineHarness();
    overlay = new PoiTooltipOverlay({
      container,
      interactionTimeline: timelineHarness.timeline,
    });
  });

  afterEach(() => {
    overlay.dispose();
    timelineHarness.dispose();
    container.remove();
  });

  it('renders hovered POI metadata and exposes links', () => {
    overlay.setHovered(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(true);
    expect(root.getAttribute('aria-hidden')).toBe('false');
    expect(root.dataset.state).toBe('hovered');

    const title = root.querySelector('.poi-tooltip-overlay__title');
    expect(title?.textContent).toBe(basePoi.title);

    const summary = root.querySelector('.poi-tooltip-overlay__summary');
    expect(summary?.textContent).toContain('editing');

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
  });

  it('prefers hovered metadata over selected and hides when cleared', () => {
    const selectedPoi: PoiDefinition = {
      ...basePoi,
      id: 'flywheel-studio-flywheel',
      title: 'Flywheel Kinetic Hub',
      position: { x: 2, y: 0, z: 4 },
      metrics: [{ label: 'Automation', value: 'CI-ready prompts' }],
      links: [
        { label: 'Flywheel', href: 'https://flywheel.futuroptimist.dev' },
      ],
      status: undefined,
      interactionPrompt: 'Engage Flywheel Kinetic Hub systems',
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
      id: 'futuroptimist-living-room-tv-variant',
      title: 'Futuroptimist Creator Desk Alt',
      interactionPrompt: 'Inspect Futuroptimist Creator Desk Alt',
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

  it('supports custom discovery formatter and politeness levels', () => {
    overlay.dispose();
    timelineHarness.dispose();
    timelineHarness = new TimelineHarness();
    overlay = new PoiTooltipOverlay({
      container,
      discoveryAnnouncer: {
        politeness: 'assertive',
        format: (poi) => `${poi.title} ready for inspection`,
      },
      interactionTimeline: timelineHarness.timeline,
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

  it('keeps the overlay hidden when only a recommendation is available', () => {
    overlay.setRecommendation(basePoi);

    const root = container.querySelector('.poi-tooltip-overlay') as HTMLElement;
    expect(root.dataset.state).toBe('hidden');
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
  });

  it('shows a badge when the recommended POI is selected', () => {
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
    expect(root.classList.contains('poi-tooltip-overlay--visible')).toBe(false);
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
    timelineHarness = new TimelineHarness();
    overlay = new PoiTooltipOverlay({
      container,
      discoveryAnnouncer: {
        format: () => '   ',
      },
      interactionTimeline: timelineHarness.timeline,
    });

    overlay.setSelected({ ...basePoi, summary: undefined });

    const liveRegion = container.querySelector(
      '.poi-tooltip-overlay__live-region'
    ) as HTMLElement;
    expect(liveRegion.textContent).toBe('');
  });
});
