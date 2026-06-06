export type NarrationPreferenceChangeSource =
  | 'init'
  | 'control'
  | 'storage'
  | 'api';

export interface NarrationPreferenceChange {
  readonly enabled: boolean;
  readonly source: NarrationPreferenceChangeSource;
}

export interface NarrationPreferenceOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  windowTarget?: Window | null;
  defaultEnabled?: boolean;
}

export const NARRATION_PREFERENCE_STORAGE_KEY =
  'danielsmith.io::narrationEnabled::v1';
export const LEGACY_NARRATION_PREFERENCE_STORAGE_KEYS = [
  'danielsmith.io::narrationEnabled',
  'danielsmith.io:narration-enabled',
] as const;

const parseStoredValue = (value: string | null): boolean | null => {
  if (value === '1' || value === 'true') {
    return true;
  }
  if (value === '0' || value === 'false') {
    return false;
  }
  return null;
};

const getDefaultStorage = (
  target: Window | null
): Pick<Storage, 'getItem' | 'setItem'> | null => {
  if (!target) {
    return null;
  }
  try {
    if (target.localStorage) {
      return target.localStorage;
    }
  } catch (error) {
    console.warn(
      'Unable to access localStorage for narration preference.',
      error
    );
  }
  try {
    if (target.sessionStorage) {
      return target.sessionStorage;
    }
  } catch (error) {
    console.warn(
      'Unable to access sessionStorage for narration preference.',
      error
    );
  }
  return null;
};

export class NarrationPreference {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;

  private readonly storageKey: string;

  private readonly windowTarget: Window | null;

  private readonly listeners = new Set<
    (change: NarrationPreferenceChange) => void
  >();

  private enabled: boolean;

  constructor(options: NarrationPreferenceOptions = {}) {
    this.windowTarget =
      options.windowTarget ?? (typeof window !== 'undefined' ? window : null);
    this.storage =
      options.storage === undefined
        ? getDefaultStorage(this.windowTarget)
        : options.storage;
    this.storageKey = options.storageKey ?? NARRATION_PREFERENCE_STORAGE_KEY;
    this.enabled = this.loadInitialState(options.defaultEnabled ?? false);

    if (this.windowTarget) {
      this.windowTarget.addEventListener('storage', this.handleStorageEvent);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(
    enabled: boolean,
    source: NarrationPreferenceChangeSource = 'control'
  ): void {
    if (this.enabled === enabled) {
      if (source === 'control') {
        this.persist();
      }
      return;
    }
    this.enabled = enabled;
    this.persist();
    this.notify(source);
  }

  getStorageKey(): string {
    return this.storageKey;
  }

  subscribe(listener: (change: NarrationPreferenceChange) => void): () => void {
    this.listeners.add(listener);
    listener({ enabled: this.enabled, source: 'init' });
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    if (this.windowTarget) {
      this.windowTarget.removeEventListener('storage', this.handleStorageEvent);
    }
    this.listeners.clear();
  }

  private loadInitialState(defaultEnabled: boolean): boolean {
    if (!this.storage?.getItem) {
      return defaultEnabled;
    }
    try {
      const parsed = parseStoredValue(this.storage.getItem(this.storageKey));
      if (parsed === null) {
        return defaultEnabled;
      }
      return parsed;
    } catch (error) {
      console.warn('Failed to read narration preference from storage.', error);
      return defaultEnabled;
    }
  }

  private persist(): void {
    if (!this.storage?.setItem) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, this.enabled ? '1' : '0');
    } catch (error) {
      console.warn('Failed to persist narration preference.', error);
    }
  }

  private notify(source: NarrationPreferenceChangeSource): void {
    const change: NarrationPreferenceChange = {
      enabled: this.enabled,
      source,
    };
    for (const listener of this.listeners) {
      listener(change);
    }
  }

  private readonly handleStorageEvent = (event: StorageEvent) => {
    if (!event.key || event.key !== this.storageKey) {
      return;
    }
    const parsed = parseStoredValue(event.newValue ?? null);
    if (parsed === null || parsed === this.enabled) {
      return;
    }
    this.enabled = parsed;
    this.notify('storage');
  };
}
