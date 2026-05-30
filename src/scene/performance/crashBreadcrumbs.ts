import type { PerformanceDiagnosticsSnapshot } from './performanceDiagnostics';
import type { SoftwareRendererPolicyState } from './qualityPolicy';
import type { RendererInfoSnapshot } from './rendererCapabilities';

export type CrashBreadcrumbEventType =
  | 'snapshot'
  | 'renderer-warning'
  | 'mode-change'
  | 'webgl-context-lost'
  | 'fatal-error';

export interface CrashBreadcrumbEntry {
  type: CrashBreadcrumbEventType;
  timestamp: string;
  pageUrl: string;
  message?: string;
  snapshot?: PerformanceDiagnosticsSnapshot;
  renderer?: RendererInfoSnapshot;
  softwareRendererPolicy?: SoftwareRendererPolicyState;
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null;
}

export interface CrashBreadcrumbLog {
  version: 1;
  updatedAt: string;
  entries: CrashBreadcrumbEntry[];
}

export interface CrashBreadcrumbStore {
  record(
    entry: Omit<CrashBreadcrumbEntry, 'timestamp' | 'pageUrl' | 'memory'>
  ): void;
  recordSnapshot(snapshot: PerformanceDiagnosticsSnapshot): void;
  exportCrashLog(): string;
  copyCrashLog(): Promise<boolean>;
  read(): CrashBreadcrumbLog;
  clear(): void;
}

const CRASH_LOG_KEY = 'danielsmith.io:immersive-crash-breadcrumbs';
const DEFAULT_MAX_ENTRIES = 40;
const DEFAULT_MAX_SERIALIZED_BYTES = 96_000;

type StorageProvider = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type MemoryLike = {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
};

const emptyLog = (): CrashBreadcrumbLog => ({
  version: 1,
  updatedAt: new Date(0).toISOString(),
  entries: [],
});

const getPageUrl = () =>
  typeof window === 'undefined' ? 'about:blank' : window.location.href;

const getMemorySnapshot = () => {
  const performanceWithMemory = (
    typeof performance === 'undefined' ? undefined : performance
  ) as (Performance & { memory?: MemoryLike }) | undefined;
  const memory = performanceWithMemory?.memory;
  if (!memory || typeof memory.usedJSHeapSize !== 'number') {
    return null;
  }
  return {
    usedJSHeapSize: memory.usedJSHeapSize ?? 0,
    totalJSHeapSize: memory.totalJSHeapSize ?? 0,
    jsHeapSizeLimit: memory.jsHeapSizeLimit ?? 0,
  };
};

const getDefaultBrowserStorage = (): StorageProvider | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch {
    try {
      return window.sessionStorage;
    } catch {
      return undefined;
    }
  }
};

const safeParse = (value: string | null): CrashBreadcrumbLog => {
  if (!value) {
    return emptyLog();
  }
  try {
    const parsed = JSON.parse(value) as Partial<CrashBreadcrumbLog>;
    if (parsed.version === 1 && Array.isArray(parsed.entries)) {
      return {
        version: 1,
        updatedAt:
          typeof parsed.updatedAt === 'string'
            ? parsed.updatedAt
            : new Date(0).toISOString(),
        entries: parsed.entries.filter(
          (entry): entry is CrashBreadcrumbEntry =>
            typeof entry === 'object' &&
            entry !== null &&
            typeof entry.type === 'string'
        ),
      };
    }
  } catch {
    // Corrupt breadcrumbs should not block the page.
  }
  return emptyLog();
};

const serializeBounded = (
  log: CrashBreadcrumbLog,
  maxEntries: number,
  maxSerializedBytes: number
): string => {
  let bounded: CrashBreadcrumbLog = {
    ...log,
    entries: log.entries.slice(-maxEntries),
  };
  let serialized = JSON.stringify(bounded);
  while (serialized.length > maxSerializedBytes && bounded.entries.length > 1) {
    bounded = { ...bounded, entries: bounded.entries.slice(1) };
    serialized = JSON.stringify(bounded);
  }
  return serialized;
};

export function createCrashBreadcrumbStore({
  storage,
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxSerializedBytes = DEFAULT_MAX_SERIALIZED_BYTES,
}: {
  storage?: StorageProvider;
  maxEntries?: number;
  maxSerializedBytes?: number;
} = {}): CrashBreadcrumbStore {
  const fallbackStorage = new Map<string, string>();
  const memoryStorage: StorageProvider = {
    getItem: (key) => fallbackStorage.get(key) ?? null,
    setItem: (key, value) => {
      fallbackStorage.set(key, value);
    },
    removeItem: (key) => {
      fallbackStorage.delete(key);
    },
  };
  const safeStorage: StorageProvider =
    storage ?? getDefaultBrowserStorage() ?? memoryStorage;

  const read = () => {
    try {
      return safeParse(safeStorage.getItem(CRASH_LOG_KEY));
    } catch {
      return emptyLog();
    }
  };
  const write = (log: CrashBreadcrumbLog) => {
    try {
      safeStorage.setItem(
        CRASH_LOG_KEY,
        serializeBounded(log, maxEntries, maxSerializedBytes)
      );
    } catch {
      // Breadcrumbs are best-effort diagnostics and must never break rendering.
    }
  };
  const record: CrashBreadcrumbStore['record'] = (entry) => {
    const timestamp = new Date().toISOString();
    const log = read();
    write({
      version: 1,
      updatedAt: timestamp,
      entries: [
        ...log.entries,
        {
          ...entry,
          timestamp,
          pageUrl: getPageUrl(),
          memory: getMemorySnapshot(),
        },
      ],
    });
  };
  const recordSnapshot: CrashBreadcrumbStore['recordSnapshot'] = (snapshot) => {
    record({
      type: 'snapshot',
      snapshot,
      renderer: snapshot.renderer,
      softwareRendererPolicy: snapshot.softwareRendererPolicy,
    });
  };
  const exportCrashLog = () => JSON.stringify(read(), null, 2);

  return {
    record,
    recordSnapshot,
    exportCrashLog,
    async copyCrashLog() {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        return false;
      }
      try {
        await navigator.clipboard.writeText(exportCrashLog());
        return true;
      } catch {
        return false;
      }
    },
    read,
    clear() {
      try {
        safeStorage.removeItem(CRASH_LOG_KEY);
      } catch {
        // Ignore storage failures when clearing best-effort breadcrumbs.
      }
    },
  };
}

export { CRASH_LOG_KEY };
