import type { PerformanceDiagnosticsSnapshot } from './performanceDiagnostics';
import type { RendererInfoSnapshot } from './rendererCapabilities';

export type CrashBreadcrumbEventType =
  | 'snapshot'
  | 'renderer-warning'
  | 'context-lost'
  | 'mode-change'
  | 'fatal-error';

export interface CrashBreadcrumbEvent {
  type: CrashBreadcrumbEventType;
  timestamp: string;
  url: string;
  renderer?: RendererInfoSnapshot;
  snapshot?: PerformanceDiagnosticsSnapshot;
  message?: string;
  detail?: Record<string, unknown>;
}

export interface CrashLogExport {
  version: 1;
  exportedAt: string;
  pageUrl: string;
  renderer: RendererInfoSnapshot | null;
  latestSnapshot: PerformanceDiagnosticsSnapshot | null;
  events: CrashBreadcrumbEvent[];
}

export interface CrashBreadcrumbStoreOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  sessionStorage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  maxEvents?: number;
  maxSerializedBytes?: number;
  now?: () => Date;
  getUrl?: () => string;
}

export interface CrashBreadcrumbStore {
  record(event: Omit<CrashBreadcrumbEvent, 'timestamp' | 'url'>): void;
  exportCrashLog(): CrashLogExport;
  serialize(): string;
}

export const CRASH_BREADCRUMB_STORAGE_KEY =
  'danielsmith.io:immersive-crash-breadcrumbs';

const DEFAULT_MAX_EVENTS = 24;
const DEFAULT_MAX_SERIALIZED_BYTES = 80_000;

const safeParseEvents = (serialized: string | null): CrashBreadcrumbEvent[] => {
  if (!serialized) {
    return [];
  }
  try {
    const parsed = JSON.parse(serialized) as Partial<CrashLogExport>;
    if (!Array.isArray(parsed.events)) {
      return [];
    }
    return parsed.events.filter(
      (event): event is CrashBreadcrumbEvent =>
        !!event &&
        typeof event.type === 'string' &&
        typeof event.timestamp === 'string'
    );
  } catch {
    return [];
  }
};

const writeBounded = (
  storage: Pick<Storage, 'setItem'> | null | undefined,
  storageKey: string,
  serialized: string
) => {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(storageKey, serialized);
  } catch {
    // Storage may be disabled or full; breadcrumbs are best-effort only.
  }
};

export function createCrashBreadcrumbStore({
  storage,
  sessionStorage,
  storageKey = CRASH_BREADCRUMB_STORAGE_KEY,
  maxEvents = DEFAULT_MAX_EVENTS,
  maxSerializedBytes = DEFAULT_MAX_SERIALIZED_BYTES,
  now = () => new Date(),
  getUrl = () => (typeof window !== 'undefined' ? window.location.href : ''),
}: CrashBreadcrumbStoreOptions = {}): CrashBreadcrumbStore {
  const boundedMaxEvents = Math.max(1, Math.floor(maxEvents));
  const boundedMaxBytes = Math.max(2048, Math.floor(maxSerializedBytes));
  const events = safeParseEvents(storage?.getItem(storageKey) ?? null).slice(
    -boundedMaxEvents
  );

  const buildExport = (): CrashLogExport => {
    const latestSnapshot = [...events]
      .reverse()
      .find((event) => event.snapshot)?.snapshot;
    const latestRenderer = [...events]
      .reverse()
      .find((event) => event.renderer)?.renderer;
    return {
      version: 1,
      exportedAt: now().toISOString(),
      pageUrl: getUrl(),
      renderer: latestRenderer ?? latestSnapshot?.renderer ?? null,
      latestSnapshot: latestSnapshot ?? null,
      events: [...events],
    };
  };

  const persist = () => {
    while (events.length > boundedMaxEvents) {
      events.shift();
    }
    let serialized = JSON.stringify(buildExport());
    while (serialized.length > boundedMaxBytes && events.length > 1) {
      events.shift();
      serialized = JSON.stringify(buildExport());
    }
    writeBounded(storage, storageKey, serialized);
    writeBounded(sessionStorage, storageKey, serialized);
  };

  return {
    record(event) {
      events.push({ ...event, timestamp: now().toISOString(), url: getUrl() });
      persist();
    },
    exportCrashLog() {
      return buildExport();
    },
    serialize() {
      return JSON.stringify(buildExport(), null, 2);
    },
  };
}
