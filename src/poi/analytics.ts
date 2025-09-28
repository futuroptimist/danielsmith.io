import type { PoiAnalytics, PoiDefinition } from './types';

function dispatchAnalyticsEvent(eventName: string, poi?: PoiDefinition): void {
  const target = typeof window === 'undefined' ? null : window;
  target?.dispatchEvent(
    new CustomEvent(eventName, poi ? { detail: { poi } } : undefined)
  );
}

export function createWindowPoiAnalytics(): PoiAnalytics {
  return {
    hoverStarted(poi) {
      dispatchAnalyticsEvent('poi:hover-started', poi);
    },
    hoverEnded(poi) {
      dispatchAnalyticsEvent('poi:hover-ended', poi);
    },
    selected(poi) {
      dispatchAnalyticsEvent('poi:selected:analytics', poi);
    },
    selectionCleared(poi) {
      dispatchAnalyticsEvent('poi:selection-cleared', poi);
    },
  } satisfies PoiAnalytics;
}
