import type { PerformanceDiagnosticsSnapshot } from './performanceDiagnostics';
import type { RendererInfoSnapshot } from './rendererCapabilities';
import type { SoftwareRendererPolicyState } from './softwareRendererMode';

export type CrashBreadcrumbKind =
  | 'performance-snapshot'
  | 'renderer-warning'
  | 'mode-change'
  | 'webgl-context-lost'
  | 'fatal-error';

export interface CrashBreadcrumb {
  kind: CrashBreadcrumbKind;
  timestamp: string;
  url: string;
  renderer?: RendererInfoSnapshot;
  softwareRendererPolicy?: SoftwareRendererPolicyState;
  snapshot?: PerformanceDiagnosticsSnapshot;
  memory?: CrashMemorySnapshot | null;
  message?: string;
  detail?: unknown;
}

export interface CrashMemorySnapshot {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

export interface CrashLogExport {
  version: 1;
  generatedAt: string;
  pageUrl: string;
  renderer: RendererInfoSnapshot | null;
  softwareRendererPolicy: SoftwareRendererPolicyState | null;
  lastUserVisibleMessage: string | null;
  breadcrumbs: CrashBreadcrumb[];
}

interface CrashBreadcrumbStoreOptions {
  storage?: Storage | null;
  storageKey?: string;
  maxEntries?: number;
  maxSerializedBytes?: number;
  getLocationHref?: () => string;
  getMemory?: () => CrashMemorySnapshot | null;
}

const DEFAULT_STORAGE_KEY = 'danielsmith.io:immersive-crash-breadcrumbs';
const DEFAULT_MAX_ENTRIES = 40;
const DEFAULT_MAX_SERIALIZED_BYTES = 96_000;

const safeNow = () => new Date().toISOString();

function readMemory(): CrashMemorySnapshot | null {
  const performanceMemory =
    typeof performance === 'undefined'
      ? undefined
      : (
          performance as Performance & {
            memory?: CrashMemorySnapshot;
          }
        ).memory;
  if (!performanceMemory) {
    return null;
  }
  return {
    usedJSHeapSize: performanceMemory.usedJSHeapSize,
    totalJSHeapSize: performanceMemory.totalJSHeapSize,
    jsHeapSizeLimit: performanceMemory.jsHeapSizeLimit,
  };
}

function safeStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function safeHref(): string {
  try {
    return typeof window === 'undefined' ? '' : window.location.href;
  } catch {
    return '';
  }
}

function parseStoredBreadcrumbs(raw: string | null): CrashBreadcrumb[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as
      | Partial<CrashLogExport>
      | CrashBreadcrumb[];
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is CrashBreadcrumb => !!entry?.kind);
    }
    return Array.isArray(parsed.breadcrumbs)
      ? parsed.breadcrumbs.filter(
          (entry): entry is CrashBreadcrumb => !!entry?.kind
        )
      : [];
  } catch {
    return [];
  }
}

export function createCrashBreadcrumbStore({
  storage = safeStorage(),
  storageKey = DEFAULT_STORAGE_KEY,
  maxEntries = DEFAULT_MAX_ENTRIES,
  maxSerializedBytes = DEFAULT_MAX_SERIALIZED_BYTES,
  getLocationHref = safeHref,
  getMemory = readMemory,
}: CrashBreadcrumbStoreOptions = {}) {
  const boundedMaxEntries = Math.max(1, Math.floor(maxEntries));
  const boundedMaxBytes = Math.max(4096, Math.floor(maxSerializedBytes));
  const breadcrumbs = parseStoredBreadcrumbs(
    storage?.getItem(storageKey) ?? null
  ).slice(-boundedMaxEntries);
  let renderer: RendererInfoSnapshot | null = null;
  let softwareRendererPolicy: SoftwareRendererPolicyState | null = null;
  let lastUserVisibleMessage: string | null = null;

  const createExport = (): CrashLogExport => ({
    version: 1,
    generatedAt: safeNow(),
    pageUrl: getLocationHref(),
    renderer,
    softwareRendererPolicy,
    lastUserVisibleMessage,
    breadcrumbs: breadcrumbs.slice(-boundedMaxEntries),
  });

  const persist = () => {
    if (!storage) {
      return;
    }
    const exportLog = createExport();
    while (exportLog.breadcrumbs.length > 0) {
      const serialized = JSON.stringify(exportLog);
      if (serialized.length <= boundedMaxBytes) {
        storage.setItem(storageKey, serialized);
        return;
      }
      exportLog.breadcrumbs.shift();
      breadcrumbs.shift();
    }
    storage.setItem(storageKey, JSON.stringify(exportLog));
  };

  return {
    setRendererInfo(next: RendererInfoSnapshot) {
      renderer = next;
      persist();
    },
    setSoftwareRendererPolicy(next: SoftwareRendererPolicyState) {
      softwareRendererPolicy = next;
      persist();
    },
    setLastUserVisibleMessage(message: string | null) {
      lastUserVisibleMessage = message;
      persist();
    },
    record(entry: Omit<CrashBreadcrumb, 'timestamp' | 'url' | 'memory'>) {
      breadcrumbs.push({
        ...entry,
        renderer: entry.renderer ?? renderer ?? undefined,
        softwareRendererPolicy:
          entry.softwareRendererPolicy ?? softwareRendererPolicy ?? undefined,
        timestamp: safeNow(),
        url: getLocationHref(),
        memory: getMemory(),
      });
      while (breadcrumbs.length > boundedMaxEntries) {
        breadcrumbs.shift();
      }
      persist();
    },
    exportCrashLog(): CrashLogExport {
      return createExport();
    },
    exportCrashLogJson(space = 2): string {
      return JSON.stringify(createExport(), null, space);
    },
    async copyCrashLog(): Promise<string> {
      const json = JSON.stringify(createExport(), null, 2);
      if (typeof navigator !== 'undefined') {
        await navigator.clipboard?.writeText(json);
      }
      return json;
    },
    clear() {
      breadcrumbs.length = 0;
      storage?.removeItem(storageKey);
    },
  };
}

export type CrashBreadcrumbStore = ReturnType<
  typeof createCrashBreadcrumbStore
>;
