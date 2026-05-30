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

const getDefaultBrowserStorageCandidates = (): StorageProvider[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const candidates: StorageProvider[] = [];
  try {
    candidates.push(window.localStorage);
  } catch {
    // Fall through to sessionStorage when localStorage access is blocked.
  }

  try {
    const sessionStorage = window.sessionStorage;
    if (!candidates.includes(sessionStorage)) {
      candidates.push(sessionStorage);
    }
  } catch {
    // Storage access can throw in private or locked-down browser contexts.
  }

  return candidates;
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

const removeOldestSnapshotOrEntry = (
  entries: CrashBreadcrumbEntry[]
): CrashBreadcrumbEntry[] => {
  if (entries.length <= 1) {
    return entries;
  }

  const oldestSnapshotIndex = entries.findIndex(
    (entry, index) => entry.type === 'snapshot' && index < entries.length - 1
  );
  const removeIndex = oldestSnapshotIndex >= 0 ? oldestSnapshotIndex : 0;
  return entries.filter((_, index) => index !== removeIndex);
};

const serializeBounded = (
  log: CrashBreadcrumbLog,
  maxEntries: number,
  maxSerializedBytes: number
): string => {
  let entries = [...log.entries];
  while (entries.length > maxEntries) {
    entries = removeOldestSnapshotOrEntry(entries);
  }

  let bounded: CrashBreadcrumbLog = {
    ...log,
    entries,
  };
  let serialized = JSON.stringify(bounded);
  while (serialized.length > maxSerializedBytes && bounded.entries.length > 1) {
    bounded = {
      ...bounded,
      entries: removeOldestSnapshotOrEntry(bounded.entries),
    };
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
  const storageCandidates = [
    ...(storage ? [storage] : []),
    ...getDefaultBrowserStorageCandidates(),
    memoryStorage,
  ].filter(
    (candidate, index, candidates) => candidates.indexOf(candidate) === index
  );
  let activeStorageIndex = 0;

  const candidateOrder = () => [
    ...storageCandidates.slice(activeStorageIndex),
    ...storageCandidates.slice(0, activeStorageIndex),
  ];

  const read = () => {
    for (const candidate of candidateOrder()) {
      try {
        const serializedLog = candidate.getItem(CRASH_LOG_KEY);
        if (serializedLog) {
          activeStorageIndex = storageCandidates.indexOf(candidate);
          return safeParse(serializedLog);
        }
      } catch {
        // Try the next storage provider before dropping to an empty log.
      }
    }
    return emptyLog();
  };
  const write = (log: CrashBreadcrumbLog) => {
    const serializedLog = serializeBounded(log, maxEntries, maxSerializedBytes);
    for (const candidate of candidateOrder()) {
      try {
        candidate.setItem(CRASH_LOG_KEY, serializedLog);
        activeStorageIndex = storageCandidates.indexOf(candidate);
        return;
      } catch {
        // Retry the next provider so sessionStorage can back up localStorage.
      }
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
  const exportCrashLog = () =>
    serializeBounded(read(), maxEntries, maxSerializedBytes);

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
      for (const candidate of storageCandidates) {
        try {
          candidate.removeItem(CRASH_LOG_KEY);
        } catch {
          // Ignore storage failures when clearing best-effort breadcrumbs.
        }
      }
    },
  };
}

export { CRASH_LOG_KEY };
