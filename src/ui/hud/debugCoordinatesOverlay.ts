import type { DebugCoordinatesOverlayStrings } from '../../assets/i18n';
import { getDebugCoordinatesOverlayStrings } from '../../assets/i18n';
import type {
  FloorId,
  StairTransitionZone,
} from '../../systems/movement/stairs';

export interface DebugCoordinatesSnapshot {
  x: number;
  y: number;
  z: number;
  activeFloorId: FloorId;
  predictedFloorId: FloorId;
  cameraZoom: number;
  insideStairWidth: boolean;
  insideLanding: boolean;
  insideStairNavArea: boolean;
  stairZone: StairTransitionZone;
  roomId?: string | null;
}

export interface DebugCoordinatesOverlayOptions {
  container: HTMLElement;
  strings?: DebugCoordinatesOverlayStrings;
  enabled?: boolean;
  updateIntervalMs?: number;
}

export interface DebugCoordinatesOverlayHandle {
  readonly element: HTMLElement;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  setStrings(strings: DebugCoordinatesOverlayStrings): void;
  update(snapshot: DebugCoordinatesSnapshot, nowMs?: number): void;
  dispose(): void;
}

const DEFAULT_UPDATE_INTERVAL_MS = 200;

const formatNumber = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(2) : 'n/a';

const formatBoolean = (
  value: boolean,
  strings: DebugCoordinatesOverlayStrings
): string => (value ? strings.boolean.yes : strings.boolean.no);

export function createDebugCoordinatesOverlay({
  container,
  strings: providedStrings,
  enabled = false,
  updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS,
}: DebugCoordinatesOverlayOptions): DebugCoordinatesOverlayHandle {
  const defaultStrings = getDebugCoordinatesOverlayStrings();
  let strings: DebugCoordinatesOverlayStrings = {
    ...defaultStrings,
    ...providedStrings,
    labels: {
      ...defaultStrings.labels,
      ...providedStrings?.labels,
    },
    boolean: {
      ...defaultStrings.boolean,
      ...providedStrings?.boolean,
    },
  };
  let lastSnapshot: DebugCoordinatesSnapshot | null = null;
  let lastRenderedAt = Number.NEGATIVE_INFINITY;

  const element = document.createElement('aside');
  element.className = 'debug-coordinates-overlay';
  element.setAttribute('aria-label', strings.title);
  element.dataset.enabled = enabled ? 'true' : 'false';
  element.hidden = !enabled;

  const title = document.createElement('div');
  title.className = 'debug-coordinates-overlay__title';

  const list = document.createElement('dl');
  list.className = 'debug-coordinates-overlay__list';

  const fields = new Map<string, HTMLElement>();
  const addField = (key: keyof DebugCoordinatesOverlayStrings['labels']) => {
    const row = document.createElement('div');
    row.className = 'debug-coordinates-overlay__row';
    const term = document.createElement('dt');
    term.className = 'debug-coordinates-overlay__label';
    term.textContent = strings.labels[key];
    term.dataset.debugCoordinatesLabel = key;
    const value = document.createElement('dd');
    value.className = 'debug-coordinates-overlay__value';
    value.dataset.debugCoordinatesValue = key;
    row.append(term, value);
    list.appendChild(row);
    fields.set(key, value);
  };

  addField('position');
  addField('activeFloor');
  addField('predictedFloor');
  addField('cameraZoom');
  addField('stairWidth');
  addField('landing');
  addField('stairNavArea');
  addField('stairZone');
  addField('room');

  element.append(title, list);
  container.appendChild(element);

  const render = (snapshot: DebugCoordinatesSnapshot) => {
    title.textContent = strings.title;
    element.setAttribute('aria-label', strings.title);
    element
      .querySelectorAll<HTMLElement>('[data-debug-coordinates-label]')
      .forEach((label) => {
        const key = label.dataset
          .debugCoordinatesLabel as keyof DebugCoordinatesOverlayStrings['labels'];
        label.textContent = strings.labels[key];
      });
    fields.get('position')!.textContent =
      `x ${formatNumber(snapshot.x)} · y ${formatNumber(
        snapshot.y
      )} · z ${formatNumber(snapshot.z)}`;
    fields.get('activeFloor')!.textContent = snapshot.activeFloorId;
    fields.get('predictedFloor')!.textContent = snapshot.predictedFloorId;
    fields.get('cameraZoom')!.textContent = formatNumber(snapshot.cameraZoom);
    fields.get('stairWidth')!.textContent = formatBoolean(
      snapshot.insideStairWidth,
      strings
    );
    fields.get('landing')!.textContent = formatBoolean(
      snapshot.insideLanding,
      strings
    );
    fields.get('stairNavArea')!.textContent = formatBoolean(
      snapshot.insideStairNavArea,
      strings
    );
    fields.get('stairZone')!.textContent = snapshot.stairZone;
    fields.get('room')!.textContent = snapshot.roomId ?? strings.roomFallback;
  };

  if (enabled && lastSnapshot) {
    render(lastSnapshot);
  }

  return {
    element,
    isEnabled() {
      return !element.hidden;
    },
    setEnabled(next) {
      element.hidden = !next;
      element.dataset.enabled = next ? 'true' : 'false';
      if (next && lastSnapshot) {
        render(lastSnapshot);
      }
    },
    setStrings(nextStrings) {
      strings = {
        ...defaultStrings,
        ...nextStrings,
        labels: {
          ...defaultStrings.labels,
          ...nextStrings.labels,
        },
        boolean: {
          ...defaultStrings.boolean,
          ...nextStrings.boolean,
        },
      };
      if (lastSnapshot) {
        render(lastSnapshot);
      } else {
        title.textContent = strings.title;
        element.setAttribute('aria-label', strings.title);
      }
    },
    update(snapshot, nowMs = performance.now()) {
      lastSnapshot = snapshot;
      if (element.hidden || nowMs - lastRenderedAt < updateIntervalMs) {
        return;
      }
      lastRenderedAt = nowMs;
      render(snapshot);
    },
    dispose() {
      element.remove();
    },
  };
}
