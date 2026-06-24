import type { Object3D } from 'three';

import {
  formatMessage,
  getPoiOverlayChromeStrings,
  type PoiOverlayChromeStrings,
} from '../../assets/i18n';
import {
  GuidedTourPreference,
  defaultGuidedTourPreference,
} from '../../systems/guidedTour/preference';
import type { InteractionTimeline } from '../../ui/accessibility/interactionTimeline';

import type { PoiSelectionContext } from './interactionManager';
import { countPoiModelTriangles } from './modelTriangles';
import type { PoiDefinition } from './types';

type DiscoveryFormatter = (
  poi: PoiDefinition,
  strings: PoiOverlayChromeStrings
) => string;

export interface PoiTooltipOverlayOptions {
  container: HTMLElement;
  onDismiss?: () => void;
  discoveryAnnouncer?: {
    format?: DiscoveryFormatter;
    politeness?: 'polite' | 'assertive';
  };
  interactionTimeline?: InteractionTimeline;
  guidedTourPreference?: GuidedTourPreference;
  getModelRoots?: (poi: PoiDefinition) => readonly Object3D[];
  locale?: string;
}

interface RenderState {
  poiId: string | null;
  poiRef: PoiDefinition | null;
  contentKey: string | null;
}

const getPoiRenderContentKey = (poi: PoiDefinition): string =>
  JSON.stringify({
    title: poi.title,
    summary: poi.summary,
    status: poi.status ?? null,
    outcome: poi.outcome ?? null,
    metrics: poi.metrics ?? [],
    links: poi.links ?? [],
  });

export class PoiTooltipOverlay {
  private readonly root: HTMLElement;
  private readonly title: HTMLHeadingElement;
  private readonly summary: HTMLParagraphElement;
  private readonly outcome: HTMLParagraphElement;
  private readonly outcomeLabel: HTMLSpanElement;
  private readonly outcomeSeparator: HTMLSpanElement;
  private readonly outcomeValue: HTMLSpanElement;
  private readonly metricsList: HTMLUListElement;
  private readonly linksList: HTMLUListElement;
  private readonly debugDetails: HTMLDListElement;
  private readonly debugAnchorValue: HTMLElement;
  private readonly debugTrianglesValue: HTMLElement;
  private readonly statusBadge: HTMLSpanElement;
  private readonly visitedBadge: HTMLSpanElement;
  private readonly recommendationBadge: HTMLSpanElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly liveRegion: HTMLElement;
  private readonly interactionTimeline: InteractionTimeline | null;
  private readonly guidedTourPreference: GuidedTourPreference;
  private readonly instanceId: string;
  private discoveryFormatter: DiscoveryFormatter;
  private discoveryPoliteness: 'polite' | 'assertive';
  private readonly discoveredPoiIds = new Set<string>();
  private hovered: PoiDefinition | null = null;
  private selected: PoiDefinition | null = null;
  private recommendation: PoiDefinition | null = null;
  private renderState: RenderState = {
    poiId: null,
    poiRef: null,
    contentKey: null,
  };
  private visitedPoiIds: ReadonlySet<string> = new Set();
  private guidedTourEnabled = true;
  private passiveRecommendationsEnabled = true;
  private isIdle = false;
  private unsubscribeGuidedTour: (() => void) | null = null;
  private focusOnNextUpdate = false;
  private readonly onDismiss: (() => void) | null;
  private strings: PoiOverlayChromeStrings;
  private debugDetailsEnabled = false;
  private locale = 'en';
  private readonly getModelRoots: (poi: PoiDefinition) => readonly Object3D[];

  constructor(options: PoiTooltipOverlayOptions) {
    const {
      container,
      onDismiss,
      discoveryAnnouncer,
      interactionTimeline,
      guidedTourPreference = defaultGuidedTourPreference,
      getModelRoots,
      locale = 'en',
    } = options;
    const documentTarget = container.ownerDocument ?? document;

    this.strings = getPoiOverlayChromeStrings();
    this.discoveryPoliteness = discoveryAnnouncer?.politeness ?? 'polite';
    this.discoveryFormatter =
      discoveryAnnouncer?.format ?? defaultDiscoveryFormatter;
    this.interactionTimeline = interactionTimeline ?? null;
    this.guidedTourPreference = guidedTourPreference;
    this.onDismiss = onDismiss ?? null;
    this.getModelRoots = getModelRoots ?? (() => []);
    this.locale = locale;
    this.instanceId = generateTooltipInstanceId();

    this.root = documentTarget.createElement('section');
    this.root.className = 'poi-tooltip-overlay';
    this.root.id = `${this.instanceId}-region`;
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-labelledby', `${this.instanceId}-title`);
    this.root.setAttribute('aria-hidden', 'true');
    this.root.tabIndex = -1;

    const headingRow = documentTarget.createElement('div');
    headingRow.className = 'poi-tooltip-overlay__heading-row';

    this.title = documentTarget.createElement('h2');
    this.title.className = 'poi-tooltip-overlay__title';
    this.title.id = `${this.instanceId}-title`;
    this.root.appendChild(headingRow);
    headingRow.appendChild(this.title);

    this.statusBadge = documentTarget.createElement('span');
    this.statusBadge.className = 'poi-tooltip-overlay__status';
    this.statusBadge.hidden = true;
    headingRow.appendChild(this.statusBadge);

    this.visitedBadge = documentTarget.createElement('span');
    this.visitedBadge.className = 'poi-tooltip-overlay__visited';
    this.visitedBadge.textContent = this.strings.visited;
    this.visitedBadge.hidden = true;
    headingRow.appendChild(this.visitedBadge);

    this.recommendationBadge = documentTarget.createElement('span');
    this.recommendationBadge.className = 'poi-tooltip-overlay__recommendation';
    this.recommendationBadge.textContent = this.strings.nextHighlight;
    this.recommendationBadge.hidden = true;
    headingRow.appendChild(this.recommendationBadge);

    this.closeButton = documentTarget.createElement('button');
    this.closeButton.className = 'poi-tooltip-overlay__close';
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', this.strings.closeDetails);
    this.closeButton.textContent = '×';
    this.closeButton.hidden = true;
    this.closeButton.disabled = true;
    this.closeButton.tabIndex = -1;
    this.closeButton.addEventListener('click', () => {
      this.onDismiss?.();
    });
    headingRow.appendChild(this.closeButton);

    this.summary = documentTarget.createElement('p');
    this.summary.className = 'poi-tooltip-overlay__summary';
    this.summary.id = `${this.instanceId}-summary`;
    this.root.appendChild(this.summary);

    this.outcome = documentTarget.createElement('p');
    this.outcome.className = 'poi-tooltip-overlay__outcome';
    this.outcome.id = `${this.instanceId}-outcome`;
    this.outcome.hidden = true;
    this.outcomeLabel = documentTarget.createElement('span');
    this.outcomeLabel.className = 'poi-tooltip-overlay__outcome-label';
    this.outcome.appendChild(this.outcomeLabel);
    this.outcomeSeparator = documentTarget.createElement('span');
    this.outcomeSeparator.className = 'poi-tooltip-overlay__outcome-separator';
    this.outcomeSeparator.textContent = '·';
    this.outcomeSeparator.setAttribute('aria-hidden', 'true');
    this.outcome.appendChild(this.outcomeSeparator);
    this.outcomeValue = documentTarget.createElement('span');
    this.outcomeValue.className = 'poi-tooltip-overlay__outcome-value';
    this.outcome.appendChild(this.outcomeValue);
    this.root.appendChild(this.outcome);

    this.metricsList = documentTarget.createElement('ul');
    this.metricsList.className = 'poi-tooltip-overlay__metrics';
    this.metricsList.id = `${this.instanceId}-metrics`;
    this.root.appendChild(this.metricsList);

    this.linksList = documentTarget.createElement('ul');
    this.linksList.className = 'poi-tooltip-overlay__links';
    this.linksList.id = `${this.instanceId}-links`;
    this.linksList.setAttribute('aria-label', this.strings.relatedCaseStudies);
    this.root.appendChild(this.linksList);

    this.debugDetails = documentTarget.createElement('dl');
    this.debugDetails.className = 'poi-tooltip-overlay__debug';
    this.debugDetails.id = `${this.instanceId}-debug`;
    this.debugDetails.dataset.poiDebug = 'true';
    this.debugDetails.hidden = true;
    this.debugDetails.setAttribute(
      'aria-label',
      this.strings.debugDetailsLabel
    );

    const anchorTerm = documentTarget.createElement('dt');
    anchorTerm.textContent = this.strings.debugPoiAnchor;
    this.debugDetails.appendChild(anchorTerm);
    this.debugAnchorValue = documentTarget.createElement('dd');
    this.debugAnchorValue.dataset.poiDebugAnchor = 'true';
    this.debugDetails.appendChild(this.debugAnchorValue);

    const trianglesTerm = documentTarget.createElement('dt');
    trianglesTerm.textContent = this.strings.debugModelTriangles;
    this.debugDetails.appendChild(trianglesTerm);
    this.debugTrianglesValue = documentTarget.createElement('dd');
    this.debugTrianglesValue.dataset.poiDebugTriangles = 'true';
    this.debugDetails.appendChild(this.debugTrianglesValue);

    this.root.appendChild(this.debugDetails);

    container.appendChild(this.root);

    this.liveRegion = documentTarget.createElement('div');
    this.liveRegion.className = 'poi-tooltip-overlay__live-region';
    this.liveRegion.setAttribute('role', 'status');
    this.liveRegion.setAttribute('aria-live', this.discoveryPoliteness);
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.dataset.poiAnnouncement = 'discovery';
    applyVisuallyHiddenStyles(this.liveRegion);
    container.appendChild(this.liveRegion);
    this.setFocusContainment(false);

    this.unsubscribeGuidedTour = this.guidedTourPreference.subscribe(
      (enabled) => {
        this.guidedTourEnabled = enabled;
        this.root.dataset.guidedTour = enabled ? 'on' : 'off';
        this.update();
      }
    );
  }

  setStrings(strings: PoiOverlayChromeStrings, locale = this.locale): void {
    this.strings = strings;
    this.locale = locale;
    this.visitedBadge.textContent = strings.visited;
    this.recommendationBadge.textContent = strings.nextHighlight;
    this.closeButton.setAttribute('aria-label', strings.closeDetails);
    this.linksList.setAttribute('aria-label', strings.relatedCaseStudies);
    this.debugDetails.setAttribute('aria-label', strings.debugDetailsLabel);
    this.renderState = { poiId: null, poiRef: null, contentKey: null };
    this.update();
  }

  setDebugDetailsEnabled(enabled: boolean): void {
    if (this.debugDetailsEnabled === enabled) {
      return;
    }
    this.debugDetailsEnabled = enabled;
    this.renderState = { poiId: null, poiRef: null, contentKey: null };
    this.update();
  }

  setIdleState(idle: boolean) {
    if (this.isIdle === idle) {
      return;
    }
    this.isIdle = idle;
    this.update();
  }

  setHovered(poi: PoiDefinition | null) {
    this.hovered = poi;
    this.update();
  }

  setSelected(poi: PoiDefinition | null, context?: PoiSelectionContext) {
    this.selected = poi;
    if (context?.inputMethod === 'keyboard' && poi) {
      this.focusOnNextUpdate = true;
    } else if (context?.inputMethod) {
      this.focusOnNextUpdate = false;
    }
    if (!poi) {
      this.focusOnNextUpdate = false;
    }
    if (poi && !this.discoveredPoiIds.has(poi.id)) {
      this.announceDiscovery(poi);
    }
    this.update();
  }

  setRecommendation(poi: PoiDefinition | null) {
    this.recommendation = poi;
    this.update();
  }

  setPassiveRecommendationsEnabled(enabled: boolean): void {
    if (this.passiveRecommendationsEnabled === enabled) {
      return;
    }
    this.passiveRecommendationsEnabled = enabled;
    this.update();
  }

  setVisitedPoiIds(ids: ReadonlySet<string>) {
    this.visitedPoiIds = ids;
    ids.forEach((id) => this.discoveredPoiIds.add(id));
    this.update();
  }

  notifyPoiUpdated(poiId: string) {
    if (
      (this.hovered && this.hovered.id === poiId) ||
      (this.selected && this.selected.id === poiId) ||
      (this.recommendation && this.recommendation.id === poiId)
    ) {
      this.update();
    }
  }

  getState(): { poiId: string | null; state: string; visible: boolean } {
    return {
      poiId: this.renderState.poiId,
      state: this.root.dataset.state ?? 'hidden',
      visible: this.root.classList.contains('poi-tooltip-overlay--visible'),
    };
  }

  dispose() {
    this.root.remove();
    this.liveRegion.remove();
    if (this.unsubscribeGuidedTour) {
      this.unsubscribeGuidedTour();
      this.unsubscribeGuidedTour = null;
    }
  }

  private update() {
    if (!this.root.isConnected) {
      return;
    }

    const recommendation = this.recommendation;
    const idleRecommendation =
      this.guidedTourEnabled &&
      this.passiveRecommendationsEnabled &&
      this.isIdle
        ? recommendation
        : null;
    const poi = this.hovered ?? this.selected ?? idleRecommendation;
    if (!poi) {
      this.root.classList.remove('poi-tooltip-overlay--visible');
      this.root.dataset.state = 'hidden';
      this.setFocusContainment(false);
      this.root.removeAttribute('aria-describedby');
      this.renderState = { poiId: null, poiRef: null, contentKey: null };
      this.visitedBadge.hidden = true;
      this.recommendationBadge.hidden = true;
      this.liveRegion.textContent = '';
      this.focusOnNextUpdate = false;
      return;
    }

    const state: 'hovered' | 'selected' | 'recommended' = this.hovered
      ? 'hovered'
      : this.selected
        ? 'selected'
        : 'recommended';
    this.root.dataset.state = state;
    this.root.classList.add('poi-tooltip-overlay--visible');
    this.setFocusContainment(true);
    this.syncCloseButtonState(state);

    const visited = this.visitedPoiIds.has(poi.id);
    this.visitedBadge.hidden = !visited;
    const showRecommendationBadge =
      (state === 'recommended' && Boolean(idleRecommendation)) ||
      (state === 'selected' &&
        this.guidedTourEnabled &&
        recommendation?.id === poi.id);
    this.recommendationBadge.hidden = !showRecommendationBadge;

    const nextContentKey = getPoiRenderContentKey(poi);
    const shouldRenderPoi =
      this.renderState.poiId !== poi.id ||
      this.renderState.poiRef !== poi ||
      this.renderState.contentKey !== nextContentKey;

    if (shouldRenderPoi) {
      this.renderState = {
        poiId: poi.id,
        poiRef: poi,
        contentKey: nextContentKey,
      };
      this.renderPoi(poi);
    }

    const describedByIds = [this.summary.id];
    if (!this.outcome.hidden) {
      describedByIds.push(this.outcome.id);
    }
    if (!this.metricsList.hidden) {
      describedByIds.push(this.metricsList.id);
    }
    if (!this.linksList.hidden) {
      describedByIds.push(this.linksList.id);
    }
    if (!this.debugDetails.hidden) {
      describedByIds.push(this.debugDetails.id);
    }
    if (describedByIds.length > 0) {
      this.root.setAttribute('aria-describedby', describedByIds.join(' '));
    } else {
      this.root.removeAttribute('aria-describedby');
    }

    if (state === 'selected' && this.focusOnNextUpdate) {
      this.focusOnNextUpdate = false;
      this.focusRoot();
    } else if (state !== 'selected') {
      this.focusOnNextUpdate = false;
    }
  }

  private setFocusContainment(visible: boolean) {
    this.root.setAttribute('aria-hidden', visible ? 'false' : 'true');
    this.root.toggleAttribute('inert', !visible);
    if (!visible) {
      this.syncCloseButtonState('hidden');
    }
  }

  private syncCloseButtonState(
    state: 'hovered' | 'selected' | 'recommended' | 'hidden'
  ) {
    const canDismiss = state !== 'hidden' && this.onDismiss !== null;
    this.closeButton.hidden = !canDismiss;
    this.closeButton.disabled = !canDismiss;
    this.closeButton.tabIndex = canDismiss ? 0 : -1;
  }

  private focusRoot() {
    if (!this.root.isConnected) {
      return;
    }
    const ownerDocument = this.root.ownerDocument ?? document;
    if (ownerDocument.activeElement === this.root) {
      return;
    }
    if (typeof this.root.focus !== 'function') {
      return;
    }
    try {
      this.root.focus({ preventScroll: true });
    } catch {
      this.root.focus();
    }
  }

  private renderPoi(poi: PoiDefinition) {
    this.title.textContent = poi.title;
    this.summary.textContent = poi.summary;
    this.updateStatus(poi);
    this.renderOutcome(poi);
    this.renderMetrics(poi);
    this.renderLinks(poi);
    this.renderDebugDetails(poi);
  }

  private renderOutcome(poi: PoiDefinition) {
    const outcome = poi.outcome;
    if (!outcome || !outcome.value.trim()) {
      this.outcome.hidden = true;
      this.outcomeLabel.textContent = '';
      this.outcomeLabel.hidden = true;
      this.outcomeValue.textContent = '';
      this.outcomeSeparator.hidden = true;
      return;
    }

    const label = outcome.label?.trim() || this.strings.outcomeFallbackLabel;
    this.outcomeLabel.textContent = label;
    this.outcomeLabel.hidden = false;
    this.outcomeValue.textContent = outcome.value.trim();
    this.outcome.hidden = false;
    this.outcomeSeparator.hidden = false;
  }

  private updateStatus(poi: PoiDefinition) {
    if (poi.status) {
      const statusLabel =
        poi.status === 'prototype' ? this.strings.prototype : this.strings.live;
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

  private renderDebugDetails(poi: PoiDefinition) {
    if (!this.debugDetailsEnabled) {
      this.debugDetails.hidden = true;
      return;
    }

    const numberFormatter = new Intl.NumberFormat(this.locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const integerFormatter = new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 0,
    });

    const { x, y, z } = poi.position;
    this.debugDetails.children[0].textContent = this.strings.debugPoiAnchor;
    this.debugDetails.children[2].textContent =
      this.strings.debugModelTriangles;
    this.debugAnchorValue.textContent = `X ${numberFormatter.format(x)} · Y ${numberFormatter.format(y)} · Z ${numberFormatter.format(z)}`;
    this.debugTrianglesValue.textContent = integerFormatter.format(
      countPoiModelTriangles(this.getModelRoots(poi))
    );
    this.debugDetails.hidden = false;
  }

  private announceDiscovery(poi: PoiDefinition) {
    const message = this.discoveryFormatter(poi, this.strings).trim();
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

function defaultDiscoveryFormatter(
  poi: PoiDefinition,
  strings: PoiOverlayChromeStrings
): string {
  return formatMessage(strings.discoveryAnnouncementTemplate, {
    title: poi.title,
    summary: poi.summary ?? '',
  }).trim();
}

let tooltipInstanceCounter = 0;

function generateTooltipInstanceId(): string {
  tooltipInstanceCounter += 1;
  return `poi-tooltip-${tooltipInstanceCounter}`;
}
