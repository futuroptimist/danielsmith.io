import type { DebugCoordinatesStrings } from '../../assets/i18n';
import { getDebugCoordinatesStrings } from '../../assets/i18n';

export interface DebugCoordinatesState {
  enabled: boolean;
  x: number;
  y: number;
  z: number;
  activeFloorId: string;
  predictedFloorId: string;
  cameraZoom: number;
  insideStairWidth: boolean;
  insideLanding: boolean;
  insideStairNavArea: boolean;
  stairZone: string;
  roomId: string | null;
}

export interface DebugCoordinatesOverlayOptions {
  container: HTMLElement;
  getState: () => DebugCoordinatesState;
  strings?: DebugCoordinatesStrings;
  updateIntervalMs?: number;
  timer?: Pick<Window, 'setInterval' | 'clearInterval'>;
}

export interface DebugCoordinatesOverlayHandle {
  readonly element: HTMLElement;
  refresh(): void;
  setEnabled(enabled: boolean): void;
  setStrings(strings: DebugCoordinatesStrings): void;
  dispose(): void;
}

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(2);
};

const formatBoolean = (
  value: boolean,
  strings: DebugCoordinatesStrings
): string => (value ? strings.overlay.yes : strings.overlay.no);

export function createDebugCoordinatesOverlay({
  container,
  getState,
  strings: providedStrings,
  updateIntervalMs = 200,
  timer = window,
}: DebugCoordinatesOverlayOptions): DebugCoordinatesOverlayHandle {
  const defaultStrings = getDebugCoordinatesStrings();
  let strings: DebugCoordinatesStrings = {
    ...defaultStrings,
    ...providedStrings,
    overlay: {
      ...defaultStrings.overlay,
      ...providedStrings?.overlay,
    },
  };

  const element = document.createElement('aside');
  element.className = 'debug-coordinates-overlay';
  element.dataset.enabled = 'false';
  element.setAttribute('aria-label', strings.overlay.title);
  element.setAttribute('aria-live', 'off');
  element.hidden = true;

  const title = document.createElement('div');
  title.className = 'debug-coordinates-overlay__title';
  element.appendChild(title);

  const list = document.createElement('dl');
  list.className = 'debug-coordinates-overlay__list';
  element.appendChild(list);

  const rows = Object.fromEntries(
    [
      'x',
      'y',
      'z',
      'activeFloor',
      'predictedFloor',
      'cameraZoom',
      'stairWidth',
      'landing',
      'stairNavArea',
      'stairZone',
      'room',
    ].map((key) => {
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.dataset.debugCoordinatesLabel = key;
      value.dataset.debugCoordinatesValue = key;
      list.append(term, value);
      return [key, { term, value }];
    })
  ) as Record<string, { term: HTMLElement; value: HTMLElement }>;

  container.appendChild(element);

  let disposed = false;

  const syncStrings = () => {
    title.textContent = strings.overlay.title;
    element.setAttribute('aria-label', strings.overlay.title);
    rows.x.term.textContent = strings.overlay.x;
    rows.y.term.textContent = strings.overlay.y;
    rows.z.term.textContent = strings.overlay.z;
    rows.activeFloor.term.textContent = strings.overlay.activeFloor;
    rows.predictedFloor.term.textContent = strings.overlay.predictedFloor;
    rows.cameraZoom.term.textContent = strings.overlay.cameraZoom;
    rows.stairWidth.term.textContent = strings.overlay.stairWidth;
    rows.landing.term.textContent = strings.overlay.landing;
    rows.stairNavArea.term.textContent = strings.overlay.stairNavArea;
    rows.stairZone.term.textContent = strings.overlay.stairZone;
    rows.room.term.textContent = strings.overlay.room;
  };

  const refresh = () => {
    if (disposed) {
      return;
    }
    const state = getState();
    element.hidden = !state.enabled;
    element.dataset.enabled = state.enabled ? 'true' : 'false';
    if (!state.enabled) {
      return;
    }

    rows.x.value.textContent = formatNumber(state.x);
    rows.y.value.textContent = formatNumber(state.y);
    rows.z.value.textContent = formatNumber(state.z);
    rows.activeFloor.value.textContent = state.activeFloorId;
    rows.predictedFloor.value.textContent = state.predictedFloorId;
    rows.cameraZoom.value.textContent = formatNumber(state.cameraZoom);
    rows.stairWidth.value.textContent = formatBoolean(
      state.insideStairWidth,
      strings
    );
    rows.landing.value.textContent = formatBoolean(
      state.insideLanding,
      strings
    );
    rows.stairNavArea.value.textContent = formatBoolean(
      state.insideStairNavArea,
      strings
    );
    rows.stairZone.value.textContent = state.stairZone;
    rows.room.value.textContent = state.roomId ?? strings.overlay.unknown;
  };

  syncStrings();
  refresh();
  const intervalId = timer.setInterval(refresh, updateIntervalMs);

  return {
    element,
    refresh,
    setEnabled(enabled) {
      element.hidden = !enabled;
      element.dataset.enabled = enabled ? 'true' : 'false';
      refresh();
    },
    setStrings(nextStrings) {
      strings = {
        ...defaultStrings,
        ...nextStrings,
        overlay: {
          ...defaultStrings.overlay,
          ...nextStrings.overlay,
        },
      };
      syncStrings();
      refresh();
    },
    dispose() {
      disposed = true;
      timer.clearInterval(intervalId);
      element.remove();
    },
  };
}
