import type { PoiDefinition } from './types';

export interface PoiTooltipOverlayOptions {
  container: HTMLElement;
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
  private hovered: PoiDefinition | null = null;
  private selected: PoiDefinition | null = null;
  private renderState: RenderState = { poiId: null };
  private visitedPoiIds: ReadonlySet<string> = new Set();

  constructor(options: PoiTooltipOverlayOptions) {
    const { container } = options;
    this.root = document.createElement('section');
    this.root.className = 'poi-tooltip-overlay';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-label', 'Point of interest details');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.tabIndex = -1;

    const headingRow = document.createElement('div');
    headingRow.className = 'poi-tooltip-overlay__heading-row';

    this.title = document.createElement('h2');
    this.title.className = 'poi-tooltip-overlay__title';
    this.title.id = 'poi-tooltip-title';
    this.root.appendChild(headingRow);
    headingRow.appendChild(this.title);

    this.statusBadge = document.createElement('span');
    this.statusBadge.className = 'poi-tooltip-overlay__status';
    this.statusBadge.hidden = true;
    headingRow.appendChild(this.statusBadge);

    this.visitedBadge = document.createElement('span');
    this.visitedBadge.className = 'poi-tooltip-overlay__visited';
    this.visitedBadge.textContent = 'Visited';
    this.visitedBadge.hidden = true;
    headingRow.appendChild(this.visitedBadge);

    this.summary = document.createElement('p');
    this.summary.className = 'poi-tooltip-overlay__summary';
    this.root.appendChild(this.summary);

    this.metricsList = document.createElement('ul');
    this.metricsList.className = 'poi-tooltip-overlay__metrics';
    this.root.appendChild(this.metricsList);

    this.linksList = document.createElement('ul');
    this.linksList.className = 'poi-tooltip-overlay__links';
    this.linksList.id = 'poi-tooltip-links';
    this.root.appendChild(this.linksList);

    container.appendChild(this.root);
  }

  setHovered(poi: PoiDefinition | null) {
    this.hovered = poi;
    this.update();
  }

  setSelected(poi: PoiDefinition | null) {
    this.selected = poi;
    this.update();
  }

  setVisitedPoiIds(ids: ReadonlySet<string>) {
    this.visitedPoiIds = ids;
    this.update();
  }

  dispose() {
    this.root.remove();
  }

  private update() {
    const poi = this.hovered ?? this.selected;
    if (!poi) {
      this.root.classList.remove('poi-tooltip-overlay--visible');
      this.root.dataset.state = 'hidden';
      this.root.setAttribute('aria-hidden', 'true');
      this.renderState.poiId = null;
      this.visitedBadge.hidden = true;
      return;
    }

    const state = this.hovered ? 'hovered' : 'selected';
    this.root.dataset.state = state;
    this.root.classList.add('poi-tooltip-overlay--visible');
    this.root.setAttribute('aria-hidden', 'false');

    const visited = this.visitedPoiIds.has(poi.id);
    this.visitedBadge.hidden = !visited;

    if (this.renderState.poiId !== poi.id) {
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
}
