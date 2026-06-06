export type NarrationPreferenceChangeSource = 'control' | 'storage' | 'api';

export interface NarrationPreferenceOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  windowTarget?: Window | null;
  defaultEnabled?: boolean;
}

export interface NarrationPreferenceChangeDetail {
  enabled: boolean;
  source: NarrationPreferenceChangeSource;
}

export type NarrationPreferenceListener = (enabled: boolean) => void;

export type NarrationPreferenceEvent =
  CustomEvent<NarrationPreferenceChangeDetail>;

export const NARRATION_PREFERENCE_EVENT = 'danielsmith.io/narration-preference';

export const NARRATION_PREFERENCE_STORAGE_KEY =
  'danielsmith.io::narrationEnabled::v1';

const getWindowTarget = (candidate?: Window | null): Window | null => {
  if (candidate) {
    return candidate;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  return window;
};

const getDefaultStorage = (target: Window | null): Storage | null => {
  if (!target) {
    return null;
  }
  try {
    if (target.localStorage) {
      return target.localStorage;
    }
  } catch (error) {
    console.warn('Unable to access localStorage for narration state.', error);
  }
  try {
    if (target.sessionStorage) {
      return target.sessionStorage;
    }
  } catch (error) {
    console.warn('Unable to access sessionStorage for narration state.', error);
  }
  return null;
};

const parseStoredValue = (value: string | null): boolean | null => {
  if (value === '1' || value === 'true') {
    return true;
  }
  if (value === '0' || value === 'false') {
    return false;
  }
  return null;
};

export class NarrationPreference {
  private readonly storage: NarrationPreferenceOptions['storage'];

  private readonly storageKey: string;

  private readonly windowTarget: Window | null;

  private readonly listeners = new Set<NarrationPreferenceListener>();

  private enabled: boolean;

  constructor(options: NarrationPreferenceOptions = {}) {
    this.windowTarget = getWindowTarget(options.windowTarget);
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

  getStorageKey(): string {
    return this.storageKey;
  }

  setEnabled(
    enabled: boolean,
    source: NarrationPreferenceChangeSource = 'api'
  ): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.persist();
    this.emit(source);
  }

  toggle(source: NarrationPreferenceChangeSource = 'control'): void {
    this.setEnabled(!this.enabled, source);
  }

  subscribe(listener: NarrationPreferenceListener): () => void {
    this.listeners.add(listener);
    listener(this.enabled);
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
    if (!this.storage) {
      return defaultEnabled;
    }
    try {
      const parsed = parseStoredValue(this.storage.getItem(this.storageKey));
      return parsed ?? defaultEnabled;
    } catch (error) {
      console.warn('Failed to read narration preference from storage.', error);
      return defaultEnabled;
    }
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }
    try {
      this.storage.setItem(this.storageKey, this.enabled ? '1' : '0');
    } catch (error) {
      console.warn('Failed to persist narration preference.', error);
    }
  }

  private emit(source: NarrationPreferenceChangeSource): void {
    for (const listener of this.listeners) {
      listener(this.enabled);
    }
    if (this.windowTarget && typeof CustomEvent !== 'undefined') {
      const event: NarrationPreferenceEvent = new CustomEvent(
        NARRATION_PREFERENCE_EVENT,
        {
          detail: { enabled: this.enabled, source },
        }
      );
      this.windowTarget.dispatchEvent(event);
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== null && event.key !== this.storageKey) {
      return;
    }
    const parsed =
      event.newValue === null ? false : parseStoredValue(event.newValue);
    if (parsed === null || parsed === this.enabled) {
      return;
    }
    this.enabled = parsed;
    this.emit('storage');
  };
}

export const defaultNarrationPreference = new NarrationPreference();
