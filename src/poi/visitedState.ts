import type { PoiId } from './types';

export type PoiVisitedListener = (visited: ReadonlySet<PoiId>) => void;

export interface PoiVisitedStateOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'danielsmith.io::poi::visited::v1';

type StorageKey = 'localStorage' | 'sessionStorage';

const getWindowStorage = (target: Window, key: StorageKey): Storage | null => {
  if (!(key in target)) {
    return null;
  }
  try {
    const storage = target[key];
    if (!storage) {
      return null;
    }
    return storage;
  } catch (error) {
    console.warn(
      `Accessing ${key} failed, continuing without persistence.`,
      error
    );
    return null;
  }
};

const getDefaultStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const local = getWindowStorage(window, 'localStorage');
  if (local) {
    return local;
  }

  return getWindowStorage(window, 'sessionStorage');
};

const normalizeVisitedList = (value: unknown): PoiId[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is PoiId => typeof item === 'string');
};

export class PoiVisitedState {
  private readonly storage: PoiVisitedStateOptions['storage'];
  private readonly storageKey: string;
  private readonly visited = new Set<PoiId>();
  private readonly listeners = new Set<PoiVisitedListener>();

  constructor(options: PoiVisitedStateOptions = {}) {
    this.storage =
      options.storage === undefined ? getDefaultStorage() : options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.loadFromStorage();
  }

  isVisited(id: PoiId): boolean {
    return this.visited.has(id);
  }

  snapshot(): ReadonlySet<PoiId> {
    return new Set(this.visited);
  }

  markVisited(id: PoiId): void {
    if (this.visited.has(id)) {
      return;
    }
    this.visited.add(id);
    this.persist();
    this.notifyListeners();
  }

  subscribe(listener: PoiVisitedListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private loadFromStorage() {
    if (!this.storage) {
      return;
    }
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw);
      const visitedIds = normalizeVisitedList(parsed);
      visitedIds.forEach((id) => this.visited.add(id));
    } catch (error) {
      console.warn('Failed to load visited POIs from storage.', error);
    }
  }

  private persist() {
    if (!this.storage) {
      return;
    }
    try {
      const payload = JSON.stringify(Array.from(this.visited));
      this.storage.setItem(this.storageKey, payload);
    } catch (error) {
      console.warn('Failed to persist visited POIs to storage.', error);
    }
  }

  private notifyListeners() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
