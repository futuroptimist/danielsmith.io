import type { AmbientAudioController } from './ambientAudio';

export type AmbientAudioPreferenceChangeSource = 'init' | 'control' | 'storage';

export interface AmbientAudioPreferenceChange {
  readonly enabled: boolean;
  readonly source: AmbientAudioPreferenceChangeSource;
}

export interface AmbientAudioPreferenceOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  windowTarget?: Window | null;
  defaultEnabled?: boolean;
}

export interface AmbientAudioPreferenceBindingOptions {
  controller: Pick<AmbientAudioController, 'isEnabled' | 'enable' | 'disable'>;
  preference: AmbientAudioPreference;
  windowTarget?: Window | null;
  logger?: Pick<Console, 'warn'>;
}

export interface AmbientAudioPreferenceBindingHandle {
  dispose(): void;
}

const DEFAULT_STORAGE_KEY = 'danielsmith.io::ambientAudioEnabled::v1';

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
      'Unable to access localStorage for ambient audio preference.',
      error
    );
  }
  try {
    if (target.sessionStorage) {
      return target.sessionStorage;
    }
  } catch (error) {
    console.warn(
      'Unable to access sessionStorage for ambient audio preference.',
      error
    );
  }
  return null;
};

export class AmbientAudioPreference {
  private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null;

  private readonly storageKey: string;

  private readonly windowTarget: Window | null;

  private readonly listeners = new Set<
    (change: AmbientAudioPreferenceChange) => void
  >();

  private enabled: boolean;

  constructor(options: AmbientAudioPreferenceOptions = {}) {
    this.windowTarget =
      options.windowTarget ?? (typeof window !== 'undefined' ? window : null);
    this.storage =
      options.storage === undefined
        ? getDefaultStorage(this.windowTarget)
        : options.storage;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
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
    source: AmbientAudioPreferenceChangeSource = 'control'
  ): void {
    if (this.enabled === enabled) {
      return;
    }
    this.enabled = enabled;
    this.persist();
    this.notify(source);
  }

  subscribe(
    listener: (change: AmbientAudioPreferenceChange) => void
  ): () => void {
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
      const stored = this.storage.getItem(this.storageKey);
      const parsed = parseStoredValue(stored);
      if (parsed === null) {
        return defaultEnabled;
      }
      return parsed;
    } catch (error) {
      console.warn(
        'Failed to read ambient audio preference from storage.',
        error
      );
      return defaultEnabled;
    }
  }

  private persist(): void {
    if (!this.storage?.setItem) {
      return;
    }
    try {
      const payload = this.enabled ? '1' : '0';
      this.storage.setItem(this.storageKey, payload);
    } catch (error) {
      console.warn('Failed to persist ambient audio preference.', error);
    }
  }

  private notify(source: AmbientAudioPreferenceChangeSource): void {
    const change: AmbientAudioPreferenceChange = {
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

export const bindAmbientAudioPreference = ({
  controller,
  preference,
  windowTarget = typeof window !== 'undefined' ? window : null,
  logger = console,
}: AmbientAudioPreferenceBindingOptions): AmbientAudioPreferenceBindingHandle => {
  let disposed = false;
  let removeGestureListeners: (() => void) | null = null;

  const clearGestureListeners = () => {
    if (!removeGestureListeners) {
      return;
    }
    const disposeListeners = removeGestureListeners;
    removeGestureListeners = null;
    disposeListeners();
  };

  const scheduleGestureListeners = () => {
    if (disposed) {
      return;
    }
    if (!windowTarget) {
      attemptEnable();
      return;
    }
    if (controller.isEnabled()) {
      clearGestureListeners();
      return;
    }
    if (removeGestureListeners) {
      return;
    }
    const handlePointer = () => {
      clearGestureListeners();
      void attemptEnable();
    };
    const handleKey = (event: Event) => {
      if (
        'metaKey' in event &&
        ((event as KeyboardEvent).metaKey ||
          (event as KeyboardEvent).ctrlKey ||
          (event as KeyboardEvent).altKey)
      ) {
        return;
      }
      clearGestureListeners();
      void attemptEnable();
    };
    windowTarget.addEventListener('pointerdown', handlePointer, { once: true });
    windowTarget.addEventListener('keydown', handleKey);
    removeGestureListeners = () => {
      windowTarget.removeEventListener('pointerdown', handlePointer);
      windowTarget.removeEventListener('keydown', handleKey);
    };
  };

  const attemptEnable = async () => {
    if (disposed || controller.isEnabled()) {
      return;
    }
    try {
      await controller.enable();
    } catch (error) {
      logger.warn('Ambient audio auto-resume failed:', error);
      scheduleGestureListeners();
    }
  };

  const handlePreferenceChange = (change: AmbientAudioPreferenceChange) => {
    if (disposed) {
      return;
    }
    if (change.enabled) {
      if (change.source === 'control' || controller.isEnabled()) {
        clearGestureListeners();
        return;
      }
      scheduleGestureListeners();
      return;
    }
    clearGestureListeners();
    if (change.source === 'control' || !controller.isEnabled()) {
      return;
    }
    controller.disable();
  };

  const unsubscribe = preference.subscribe(handlePreferenceChange);

  return {
    dispose() {
      if (disposed) {
        return;
      }
      disposed = true;
      clearGestureListeners();
      unsubscribe();
    },
  };
};
