import type { PerformanceDiagnosticsSnapshot } from './performanceDiagnostics';
import type { RendererInfoSnapshot } from './rendererCapabilities';
import type { SoftwareRendererModeState } from './softwareRendererMode';

export const CRASH_BREADCRUMB_STORAGE_KEY =
  'danielsmith.io:immersive-crash-breadcrumbs';
export const CRASH_BREADCRUMB_SESSION_KEY =
  'danielsmith.io:immersive-crash-breadcrumbs:session';

const DEFAULT_MAX_EVENTS = 24;
const DEFAULT_MAX_SERIALIZED_BYTES = 64_000;

type BreadcrumbType =
  | 'snapshot'
  | 'renderer-warning'
  | 'webgl-context-lost'
  | 'mode'
  | 'fatal-error'
  | 'beforeunload';

export interface CrashBreadcrumbEvent {
  type: BreadcrumbType;
  timestamp: string;
  pageUrl: string;
  renderer?: RendererInfoSnapshot;
  softwareRenderer?: SoftwareRendererModeState;
  snapshot?: PerformanceDiagnosticsSnapshot;
  message?: string;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

export interface CrashBreadcrumbLog {
  version: 1;
  updatedAt: string;
  events: CrashBreadcrumbEvent[];
}

interface CrashBreadcrumbStoreOptions {
  maxEvents?: number;
  maxSerializedBytes?: number;
  localStorage?: Storage;
  sessionStorage?: Storage;
  now?: () => Date;
  getPageUrl?: () => string;
}

const getStorage = (
  kind: 'localStorage' | 'sessionStorage'
): Storage | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  try {
    return window[kind];
  } catch {
    return undefined;
  }
};

const getMemorySnapshot = (): CrashBreadcrumbEvent['memory'] => {
  if (typeof performance === 'undefined') {
    return undefined;
  }
  const memory = (
    performance as Performance & {
      memory?: CrashBreadcrumbEvent['memory'];
    }
  ).memory;
  if (!memory) {
    return undefined;
  }
  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
  };
};

export class CrashBreadcrumbStore {
  private readonly maxEvents: number;

  private readonly maxSerializedBytes: number;

  private readonly localStorage?: Storage;

  private readonly sessionStorage?: Storage;

  private readonly now: () => Date;

  private readonly getPageUrl: () => string;

  private events: CrashBreadcrumbEvent[] = [];

  constructor(options: CrashBreadcrumbStoreOptions = {}) {
    this.maxEvents = Math.max(1, options.maxEvents ?? DEFAULT_MAX_EVENTS);
    this.maxSerializedBytes = Math.max(
      1_024,
      options.maxSerializedBytes ?? DEFAULT_MAX_SERIALIZED_BYTES
    );
    this.localStorage = options.localStorage ?? getStorage('localStorage');
    this.sessionStorage =
      options.sessionStorage ?? getStorage('sessionStorage');
    this.now = options.now ?? (() => new Date());
    this.getPageUrl =
      options.getPageUrl ??
      (() => (typeof window === 'undefined' ? '' : window.location.href));
    this.events = this.readStoredEvents();
  }

  record(
    event: Omit<CrashBreadcrumbEvent, 'timestamp' | 'pageUrl' | 'memory'>
  ) {
    this.events.push({
      ...event,
      timestamp: this.now().toISOString(),
      pageUrl: this.getPageUrl(),
      memory: getMemorySnapshot(),
    });
    this.trimToBounds();
    this.persist();
  }

  exportLog(): CrashBreadcrumbLog {
    return {
      version: 1,
      updatedAt: this.now().toISOString(),
      events: [...this.events],
    };
  }

  exportJson(): string {
    this.trimToBounds();
    return JSON.stringify(this.exportLog(), null, 2);
  }

  async copyLog(): Promise<boolean> {
    const json = this.exportJson();
    const clipboard =
      typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    if (!clipboard?.writeText) {
      return false;
    }
    await clipboard.writeText(json);
    return true;
  }

  private readStoredEvents(): CrashBreadcrumbEvent[] {
    const stored =
      this.sessionStorage?.getItem(CRASH_BREADCRUMB_SESSION_KEY) ??
      this.localStorage?.getItem(CRASH_BREADCRUMB_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    try {
      const parsed = JSON.parse(stored) as Partial<CrashBreadcrumbLog>;
      return Array.isArray(parsed.events)
        ? parsed.events.slice(-this.maxEvents)
        : [];
    } catch {
      return [];
    }
  }

  private trimToBounds() {
    while (this.events.length > this.maxEvents) {
      this.events.shift();
    }
    while (JSON.stringify(this.exportLog()).length > this.maxSerializedBytes) {
      if (this.events.length <= 1) {
        break;
      }
      this.events.shift();
    }
  }

  private persist() {
    const serialized = JSON.stringify(this.exportLog());
    try {
      this.sessionStorage?.setItem(CRASH_BREADCRUMB_SESSION_KEY, serialized);
    } catch {
      // Storage can be unavailable in private or hardened browser contexts.
    }
    try {
      this.localStorage?.setItem(CRASH_BREADCRUMB_STORAGE_KEY, serialized);
    } catch {
      // Best effort only; sessionStorage usually keeps the latest breadcrumb.
    }
  }
}

export const createCrashBreadcrumbStore = (
  options?: CrashBreadcrumbStoreOptions
) => new CrashBreadcrumbStore(options);
