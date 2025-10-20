export type GuidedTourPreferenceChangeSource = 'control' | 'storage' | 'api';

export interface GuidedTourPreferenceOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  windowTarget?: Window | null;
  defaultEnabled?: boolean;
}

export interface GuidedTourPreferenceChangeDetail {
  enabled: boolean;
  source: GuidedTourPreferenceChangeSource;
}

export type GuidedTourPreferenceListener = (enabled: boolean) => void;

export type GuidedTourPreferenceEvent =
  CustomEvent<GuidedTourPreferenceChangeDetail>;

export const GUIDED_TOUR_PREFERENCE_EVENT =
  'danielsmith.io/guided-tour-preference';

const DEFAULT_STORAGE_KEY = 'danielsmith.io::guidedTourEnabled::v1';

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
    console.warn('Unable to access localStorage for guided tour state.', error);
  }
  try {
    if (target.sessionStorage) {
      return target.sessionStorage;
    }
  } catch (error) {
    console.warn(
      'Unable to access sessionStorage for guided tour state.',
      error
    );
  }
  return null;
};

const parseStoredValue = (value: string | null): boolean | null => {
  if (value === '1') {
    return true;
  }
  if (value === '0') {
    return false;
  }
  return null;
};

export class GuidedTourPreference {
  private readonly storage: GuidedTourPreferenceOptions['storage'];

  private readonly storageKey: string;

  private readonly windowTarget: Window | null;

  private readonly listeners = new Set<GuidedTourPreferenceListener>();

  private enabled: boolean;

  constructor(options: GuidedTourPreferenceOptions = {}) {
    this.windowTarget = getWindowTarget(options.windowTarget);
    this.storage =
      options.storage === undefined
        ? getDefaultStorage(this.windowTarget)
        : options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.enabled = this.loadInitialState(options.defaultEnabled ?? true);

    if (this.windowTarget) {
      this.windowTarget.addEventListener('storage', this.handleStorageEvent);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(
    enabled: boolean,
    source: GuidedTourPreferenceChangeSource = 'api'
  ): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.persist();
    this.emit(source);
  }

  toggle(source: GuidedTourPreferenceChangeSource = 'control'): void {
    this.setEnabled(!this.enabled, source);
  }

  subscribe(listener: GuidedTourPreferenceListener): () => void {
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
      const stored = this.storage.getItem(this.storageKey);
      const parsed = parseStoredValue(stored);
      if (parsed === null) {
        return defaultEnabled;
      }
      return parsed;
    } catch (error) {
      console.warn(
        'Failed to read guided tour preference from storage.',
        error
      );
      return defaultEnabled;
    }
  }

  private persist(): void {
    if (!this.storage) {
      return;
    }
    try {
      const payload = this.enabled ? '1' : '0';
      this.storage.setItem(this.storageKey, payload);
    } catch (error) {
      console.warn('Failed to persist guided tour preference.', error);
    }
  }

  private emit(source: GuidedTourPreferenceChangeSource): void {
    for (const listener of this.listeners) {
      listener(this.enabled);
    }
    if (this.windowTarget && typeof CustomEvent !== 'undefined') {
      const event: GuidedTourPreferenceEvent = new CustomEvent(
        GUIDED_TOUR_PREFERENCE_EVENT,
        {
          detail: { enabled: this.enabled, source },
        }
      );
      this.windowTarget.dispatchEvent(event);
    }
  }

  private handleStorageEvent = (event: StorageEvent) => {
    if (!event.key || event.key !== this.storageKey) {
      return;
    }
    const parsed = parseStoredValue(event.newValue ?? null);
    if (parsed === null || parsed === this.enabled) {
      return;
    }
    this.enabled = parsed;
    this.emit('storage');
  };
}

export const defaultGuidedTourPreference = new GuidedTourPreference();
