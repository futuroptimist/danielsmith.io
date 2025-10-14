import type { InteractionTimeline } from '../../ui/accessibility/interactionTimeline';

import type { PoiDefinition } from './types';

type DiscoveryFormatter = (poi: PoiDefinition) => string;

export interface PoiTooltipOverlayOptions {
  container: HTMLElement;
  discoveryAnnouncer?: {
    format?: DiscoveryFormatter;
    politeness?: 'polite' | 'assertive';
  };
  interactionTimeline?: InteractionTimeline;
}

interface RenderState {
  poiId: string | null;
}

export class PoiTooltipOverlay {
  private readonly root: HTMLElement;
  private readonly title: HTMLHeadingElement;
  private readonly summary: HTMLParagraphElement;
  private readonly metricsList: HTMLUListElement;
  private readonly linksList: HTMLUListElement;
  private readonly statusBadge: HTMLSpanElement;
  private readonly visitedBadge: HTMLSpanElement;
  private readonly recommendationBadge: HTMLSpanElement;
  private readonly liveRegion: HTMLElement;
  private readonly interactionTimeline: InteractionTimeline | null;
  private discoveryFormatter: DiscoveryFormatter;
  private discoveryPoliteness: 'polite' | 'assertive';
  private readonly discoveredPoiIds = new Set<string>();
  private hovered: PoiDefinition | null = null;
  private selected: PoiDefinition | null = null;
  private recommendation: PoiDefinition | null = null;
  private renderState: RenderState = { poiId: null };
  private visitedPoiIds: ReadonlySet<string> = new Set();

  constructor(options: PoiTooltipOverlayOptions) {
    const { container, discoveryAnnouncer, interactionTimeline } = options;
    const documentTarget = container.ownerDocument ?? document;

    this.discoveryPoliteness = discoveryAnnouncer?.politeness ?? 'polite';
    this.discoveryFormatter =
      discoveryAnnouncer?.format ?? defaultDiscoveryFormatter;
    this.interactionTimeline = interactionTimeline ?? null;

    this.root = documentTarget.createElement('section');
    this.root.className = 'poi-tooltip-overlay';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-label', 'Point of interest details');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.tabIndex = -1;

    const headingRow = documentTarget.createElement('div');
    headingRow.className = 'poi-tooltip-overlay__heading-row';

    this.title = documentTarget.createElement('h2');
    this.title.className = 'poi-tooltip-overlay__title';
    this.title.id = 'poi-tooltip-title';
    this.root.appendChild(headingRow);
    headingRow.appendChild(this.title);

    this.statusBadge = documentTarget.createElement('span');
    this.statusBadge.className = 'poi-tooltip-overlay__status';
    this.statusBadge.hidden = true;
    headingRow.appendChild(this.statusBadge);

    this.visitedBadge = documentTarget.createElement('span');
    this.visitedBadge.className = 'poi-tooltip-overlay__visited';
    this.visitedBadge.textContent = 'Visited';
    this.visitedBadge.hidden = true;
    headingRow.appendChild(this.visitedBadge);

    this.recommendationBadge = documentTarget.createElement('span');
    this.recommendationBadge.className = 'poi-tooltip-overlay__recommendation';
    this.recommendationBadge.textContent = 'Next highlight';
    this.recommendationBadge.hidden = true;
    headingRow.appendChild(this.recommendationBadge);

    this.summary = documentTarget.createElement('p');
    this.summary.className = 'poi-tooltip-overlay__summary';
    this.root.appendChild(this.summary);

    this.metricsList = documentTarget.createElement('ul');
    this.metricsList.className = 'poi-tooltip-overlay__metrics';
    this.root.appendChild(this.metricsList);

    this.linksList = documentTarget.createElement('ul');
    this.linksList.className = 'poi-tooltip-overlay__links';
    this.linksList.id = 'poi-tooltip-links';
    this.root.appendChild(this.linksList);

    container.appendChild(this.root);

    this.liveRegion = documentTarget.createElement('div');
    this.liveRegion.className = 'poi-tooltip-overlay__live-region';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', this.discoveryPoliteness);
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.dataset.poiAnnouncement = 'discovery';
    applyVisuallyHiddenStyles(this.liveRegion);
    container.appendChild(this.liveRegion);
  }

  setHovered(poi: PoiDefinition | null) {
    this.hovered = poi;
    this.update();
  }

  setSelected(poi: PoiDefinition | null) {
    this.selected = poi;
    if (poi && !this.discoveredPoiIds.has(poi.id)) {
      this.announceDiscovery(poi);
    }
    this.update();
  }

  setRecommendation(poi: PoiDefinition | null) {
    this.recommendation = poi;
    this.update();
  }

  setVisitedPoiIds(ids: ReadonlySet<string>) {
    this.visitedPoiIds = ids;
    ids.forEach((id) => this.discoveredPoiIds.add(id));
    this.update();
  }

  dispose() {
    this.root.remove();
    this.liveRegion.remove();
  }

  private update() {
    const poi = this.hovered ?? this.selected;
    if (!poi) {
      this.root.classList.remove('poi-tooltip-overlay--visible');
      this.root.dataset.state = 'hidden';
      this.root.setAttribute('aria-hidden', 'true');
      this.renderState.poiId = null;
      this.visitedBadge.hidden = true;
      this.recommendationBadge.hidden = true;
      this.liveRegion.textContent = '';
      return;
    }

    const state = this.hovered ? 'hovered' : 'selected';
    this.root.dataset.state = state;
    this.root.classList.add('poi-tooltip-overlay--visible');
    this.root.setAttribute('aria-hidden', 'false');

    const visited = this.visitedPoiIds.has(poi.id);
    this.visitedBadge.hidden = !visited;
    const isRecommendedSelection =
      state === 'selected' && this.recommendation?.id === poi.id;
    this.recommendationBadge.hidden = !isRecommendedSelection;

    const previousPoiId = this.renderState.poiId;

    if (previousPoiId !== poi.id) {
      this.renderPoi(poi);
      this.renderState.poiId = poi.id;
    } else {
      this.updateStatus(poi);
    }

    if (state === 'selected' && !this.linksList.hidden) {
      this.root.setAttribute('aria-describedby', this.linksList.id);
    } else {
      this.root.removeAttribute('aria-describedby');
    }
  }

  private renderPoi(poi: PoiDefinition) {
    this.title.textContent = poi.title;
    this.summary.textContent = poi.summary;
    this.updateStatus(poi);
    this.renderMetrics(poi);
    this.renderLinks(poi);
  }

  private updateStatus(poi: PoiDefinition) {
    if (poi.status) {
      const statusLabel = poi.status === 'prototype' ? 'Prototype' : 'Live';
      this.statusBadge.textContent = statusLabel;
      this.statusBadge.hidden = false;
    } else {
      this.statusBadge.hidden = true;
      this.statusBadge.textContent = '';
    }
  }

  private renderMetrics(poi: PoiDefinition) {
    this.metricsList.innerHTML = '';
    if (!poi.metrics || poi.metrics.length === 0) {
      this.metricsList.hidden = true;
      return;
    }

    this.metricsList.hidden = false;
    for (const metric of poi.metrics) {
      const item = document.createElement('li');
      item.className = 'poi-tooltip-overlay__metric';

      const label = document.createElement('span');
      label.className = 'poi-tooltip-overlay__metric-label';
      label.textContent = metric.label;

      const value = document.createElement('span');
      value.className = 'poi-tooltip-overlay__metric-value';
      value.textContent = metric.value;

      item.appendChild(label);
      item.appendChild(value);
      this.metricsList.appendChild(item);
    }
  }

  private renderLinks(poi: PoiDefinition) {
    this.linksList.innerHTML = '';
    if (!poi.links || poi.links.length === 0) {
      this.linksList.hidden = true;
      return;
    }

    this.linksList.hidden = false;

    for (const link of poi.links) {
      const item = document.createElement('li');
      item.className = 'poi-tooltip-overlay__link-item';

      const anchor = document.createElement('a');
      anchor.className = 'poi-tooltip-overlay__link';
      anchor.href = link.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = link.label;

      item.appendChild(anchor);
      this.linksList.appendChild(item);
    }
  }

  private announceDiscovery(poi: PoiDefinition) {
    const message = this.discoveryFormatter(poi).trim();
    if (!message) {
      return;
    }
    const announce = () => {
      this.liveRegion.setAttribute('aria-live', this.discoveryPoliteness);
      this.liveRegion.textContent = '';
      this.liveRegion.textContent = message;
      this.discoveredPoiIds.add(poi.id);
    };

    if (this.interactionTimeline) {
      this.interactionTimeline.enqueue({
        id: poi.id,
        run: announce,
      });
    } else {
      announce();
    }
  }
}

function applyVisuallyHiddenStyles(element: HTMLElement): void {
  element.style.position = 'absolute';
  element.style.width = '1px';
  element.style.height = '1px';
  element.style.margin = '-1px';
  element.style.border = '0';
  element.style.padding = '0';
  element.style.overflow = 'hidden';
  element.style.clip = 'rect(0 0 0 0)';
  element.style.clipPath = 'inset(50%)';
  element.style.whiteSpace = 'nowrap';
  element.style.pointerEvents = 'none';
}

function defaultDiscoveryFormatter(poi: PoiDefinition): string {
  const summary = poi.summary ? ` ${poi.summary}` : '';
  return `${poi.title} discovered.${summary}`;
}
