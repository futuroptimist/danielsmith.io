import { describe, expect, it, vi } from 'vitest';

import {
  AmbientAudioPreference,
  type AmbientAudioPreferenceChange,
} from '../systems/audio/ambientAudioPreference';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private readonly store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

class StorageFallbackWindow extends EventTarget {
  constructor(private readonly storage: MemoryStorage) {
    super();
  }

  get localStorage(): Storage {
    throw new Error('Blocked localStorage');
  }

  get sessionStorage(): Storage {
    return this.storage as unknown as Storage;
  }
}

class SharedStorageWindow extends EventTarget {
  constructor(private readonly storage: MemoryStorage) {
    super();
  }

  get localStorage(): Storage {
    return this.storage as unknown as Storage;
  }

  get sessionStorage(): Storage {
    return this.storage as unknown as Storage;
  }
}

describe('AmbientAudioPreference', () => {
  it('defaults to false when no stored preference exists', () => {
    const storage = new MemoryStorage();
    const preference = new AmbientAudioPreference({
      storage,
      storageKey: 'test::preference',
    });

    expect(preference.isEnabled()).toBe(false);
  });

  it('loads a persisted enabled state from storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('test::preference', '1');

    const preference = new AmbientAudioPreference({
      storage,
      storageKey: 'test::preference',
      defaultEnabled: false,
    });

    expect(preference.isEnabled()).toBe(true);
  });

  it('persists toggled states back to storage', () => {
    const storage = new MemoryStorage();
    const preference = new AmbientAudioPreference({
      storage,
      storageKey: 'test::preference',
    });

    preference.setEnabled(true);
    expect(storage.getItem('test::preference')).toBe('1');

    preference.setEnabled(false);
    expect(storage.getItem('test::preference')).toBe('0');
  });

  it('falls back to sessionStorage when localStorage access is blocked', () => {
    const sessionStorage = new MemoryStorage();
    const windowStub = new StorageFallbackWindow(sessionStorage);

    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storageKey: 'test::preference',
      defaultEnabled: true,
    });

    expect(preference.isEnabled()).toBe(true);
    preference.setEnabled(false);
    expect(sessionStorage.getItem('test::preference')).toBe('0');
  });

  it('responds to storage events from other tabs', () => {
    const storage = new MemoryStorage();
    const windowStub = new SharedStorageWindow(storage);

    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storageKey: 'test::preference',
    });

    const changes: AmbientAudioPreferenceChange[] = [];
    const unsubscribe = preference.subscribe((change) => {
      changes.push(change);
    });

    const event = new StorageEvent('storage', {
      key: 'test::preference',
      newValue: '1',
    });
    windowStub.dispatchEvent(event);

    expect(preference.isEnabled()).toBe(true);
    expect(changes).toContainEqual({ enabled: true, source: 'storage' });

    unsubscribe();
  });

  it('ignores irrelevant storage keys and invalid payloads', () => {
    const storage = new MemoryStorage();
    storage.setItem('test::preference', 'maybe');
    const windowStub = new SharedStorageWindow(storage);

    const preference = new AmbientAudioPreference({
      windowTarget: windowStub as unknown as Window,
      storageKey: 'test::preference',
      defaultEnabled: true,
    });

    expect(preference.isEnabled()).toBe(true);

    const event = new StorageEvent('storage', {
      key: 'other-key',
      newValue: '0',
    });
    windowStub.dispatchEvent(event);
    expect(preference.isEnabled()).toBe(true);
  });

  it('warns and falls back to defaults when storage access fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const preference = new AmbientAudioPreference({
      storage: {
        getItem() {
          throw new Error('boom');
        },
        setItem() {
          throw new Error('boom');
        },
      },
      storageKey: 'test::preference',
      defaultEnabled: true,
    });

    expect(preference.isEnabled()).toBe(true);
    preference.setEnabled(false);

    warnSpy.mockRestore();
  });
});
