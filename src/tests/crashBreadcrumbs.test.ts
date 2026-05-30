import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CRASH_LOG_KEY,
  createCrashBreadcrumbStore,
} from '../scene/performance/crashBreadcrumbs';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}

describe('crash breadcrumbs', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('treats storage failures as best-effort diagnostics', () => {
    const failingStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createCrashBreadcrumbStore({ storage: failingStorage });

    expect(() =>
      store.record({ type: 'mode-change', message: 'should not throw' })
    ).not.toThrow();
    expect(store.read().entries).toContainEqual(
      expect.objectContaining({
        type: 'mode-change',
        message: 'should not throw',
      })
    );
    expect(() => store.clear()).not.toThrow();
    expect(store.read().entries).toEqual([]);
  });

  it('defaults to browser storage so exports survive a reload', () => {
    const storage = createMemoryStorage();
    const originalLocalStorage = Object.getOwnPropertyDescriptor(
      window,
      'localStorage'
    );
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => storage,
    });

    try {
      createCrashBreadcrumbStore().record({
        type: 'mode-change',
        message: 'persisted in browser storage',
      });
      const reloadedStore = createCrashBreadcrumbStore();
      const exported = JSON.parse(reloadedStore.exportCrashLog()) as ReturnType<
        typeof reloadedStore.read
      >;

      expect(exported.entries).toHaveLength(1);
      expect(exported.entries[0]).toMatchObject({
        type: 'mode-change',
        message: 'persisted in browser storage',
      });
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
    }
  });

  it('retries sessionStorage when localStorage writes fail', () => {
    const localFallbackStorage = createMemoryStorage();
    const sessionFallbackStorage = createMemoryStorage();
    const originalLocalStorage = Object.getOwnPropertyDescriptor(
      window,
      'localStorage'
    );
    const originalSessionStorage = Object.getOwnPropertyDescriptor(
      window,
      'sessionStorage'
    );
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({
        ...localFallbackStorage,
        setItem: () => {
          throw new Error('quota exceeded');
        },
      }),
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => sessionFallbackStorage,
    });

    try {
      createCrashBreadcrumbStore().record({
        type: 'mode-change',
        message: 'persisted in session fallback',
      });
      const reloadedStore = createCrashBreadcrumbStore();
      const exported = JSON.parse(reloadedStore.exportCrashLog()) as ReturnType<
        typeof reloadedStore.read
      >;

      expect(exported.entries).toHaveLength(1);
      expect(exported.entries[0]).toMatchObject({
        type: 'mode-change',
        message: 'persisted in session fallback',
      });
      expect(localFallbackStorage.getItem(CRASH_LOG_KEY)).toBeNull();
      expect(sessionFallbackStorage.getItem(CRASH_LOG_KEY)).toContain(
        'persisted in session fallback'
      );
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
      if (originalSessionStorage) {
        Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
      } else {
        Reflect.deleteProperty(window, 'sessionStorage');
      }
    }
  });

  it('exports the newest fallback log when stale localStorage remains readable', () => {
    const localFallbackStorage = createMemoryStorage();
    const sessionFallbackStorage = createMemoryStorage();
    const oldTimestamp = '2026-05-30T20:00:00.000Z';
    localFallbackStorage.setItem(
      CRASH_LOG_KEY,
      JSON.stringify({
        version: 1,
        updatedAt: oldTimestamp,
        entries: [
          {
            type: 'mode-change',
            timestamp: oldTimestamp,
            pageUrl: 'https://example.test/?mode=immersive',
            message: 'stale local breadcrumb',
            memory: null,
          },
        ],
      })
    );
    const originalLocalStorage = Object.getOwnPropertyDescriptor(
      window,
      'localStorage'
    );
    const originalSessionStorage = Object.getOwnPropertyDescriptor(
      window,
      'sessionStorage'
    );
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => ({
        ...localFallbackStorage,
        setItem: () => {
          throw new Error('quota exceeded');
        },
      }),
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => sessionFallbackStorage,
    });

    try {
      createCrashBreadcrumbStore().record({
        type: 'mode-change',
        message: 'newer session fallback breadcrumb',
      });
      const reloadedStore = createCrashBreadcrumbStore();
      const exported = JSON.parse(reloadedStore.exportCrashLog()) as ReturnType<
        typeof reloadedStore.read
      >;

      expect(exported.entries).toHaveLength(2);
      expect(exported.entries.map((entry) => entry.message)).toEqual([
        'stale local breadcrumb',
        'newer session fallback breadcrumb',
      ]);
      expect(sessionFallbackStorage.getItem(CRASH_LOG_KEY)).toContain(
        'newer session fallback breadcrumb'
      );
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
      if (originalSessionStorage) {
        Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
      } else {
        Reflect.deleteProperty(window, 'sessionStorage');
      }
    }
  });

  it('retries sessionStorage when an explicit localStorage provider cannot write', () => {
    const localFallbackStorage = createMemoryStorage();
    const sessionFallbackStorage = createMemoryStorage();
    const explicitLocalStorage = {
      ...localFallbackStorage,
      setItem: () => {
        throw new Error('quota exceeded');
      },
    };
    const originalLocalStorage = Object.getOwnPropertyDescriptor(
      window,
      'localStorage'
    );
    const originalSessionStorage = Object.getOwnPropertyDescriptor(
      window,
      'sessionStorage'
    );
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => explicitLocalStorage,
    });
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => sessionFallbackStorage,
    });

    try {
      createCrashBreadcrumbStore({ storage: explicitLocalStorage }).record({
        type: 'mode-change',
        message: 'explicit local falls back to session',
      });
      const reloadedStore = createCrashBreadcrumbStore();
      const exported = JSON.parse(reloadedStore.exportCrashLog()) as ReturnType<
        typeof reloadedStore.read
      >;

      expect(exported.entries).toHaveLength(1);
      expect(exported.entries[0]).toMatchObject({
        type: 'mode-change',
        message: 'explicit local falls back to session',
      });
      expect(localFallbackStorage.getItem(CRASH_LOG_KEY)).toBeNull();
      expect(sessionFallbackStorage.getItem(CRASH_LOG_KEY)).toContain(
        'explicit local falls back to session'
      );
    } finally {
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      } else {
        Reflect.deleteProperty(window, 'localStorage');
      }
      if (originalSessionStorage) {
        Object.defineProperty(window, 'sessionStorage', originalSessionStorage);
      } else {
        Reflect.deleteProperty(window, 'sessionStorage');
      }
    }
  });

  it('persists breadcrumbs across fresh stores on the same browser storage', () => {
    const storage = createMemoryStorage();
    const firstStore = createCrashBreadcrumbStore({ storage });

    firstStore.record({
      type: 'webgl-context-lost',
      message: 'simulated context loss before reload',
      renderer: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'Microsoft',
        unmaskedRenderer:
          'ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)',
        isSoftwareRenderer: true,
        isDangerousSoftwareRenderer: true,
        riskLevel: 'dangerous-software',
        reason: 'test',
      },
      softwareRendererPolicy: {
        mode: 'safe',
        safeMode: true,
        renderCadenceFps: 12,
        reason: 'test',
      },
    });

    const reloadedStore = createCrashBreadcrumbStore({ storage });
    const exported = JSON.parse(reloadedStore.exportCrashLog()) as ReturnType<
      typeof reloadedStore.read
    >;

    expect(exported.entries).toHaveLength(1);
    expect(exported.entries[0]).toMatchObject({
      type: 'webgl-context-lost',
      message: 'simulated context loss before reload',
      renderer: { isDangerousSoftwareRenderer: true },
      softwareRendererPolicy: { safeMode: true, renderCadenceFps: 12 },
    });
  });

  it('keeps snapshot recording and clipboard copy destructure-safe', async () => {
    const store = createCrashBreadcrumbStore({
      storage: createMemoryStorage(),
    });
    const { copyCrashLog, recordSnapshot } = store;
    const writeText = vi.fn().mockRejectedValue(new Error('not focused'));
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    recordSnapshot({
      averageFps: 12,
      medianFps: 12,
      p95FrameMs: 90,
      minFps: 8,
      sampleCount: 5,
      phases: {
        inputMovementCamera: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        avatarIkAudio: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        poiHudTooltips: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        decorativeStructures: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        lightingLedLightmap: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        mirror: { averageMs: 0, p95Ms: 0, sampleCount: 0 },
        mainRender: { averageMs: 80, p95Ms: 90, sampleCount: 5 },
      },
      renderer: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'Microsoft',
        unmaskedRenderer: 'ANGLE (Microsoft, WARP, D3D11)',
        isSoftwareRenderer: true,
        isDangerousSoftwareRenderer: true,
        riskLevel: 'dangerous-software',
        reason: 'test',
      },
      softwareRendererPolicy: {
        mode: 'safe',
        safeMode: true,
        renderCadenceFps: 12,
        reason: 'test',
      },
      rendererSize: {
        pixelRatio: 0.5,
        viewport: { width: 1280, height: 720 },
        drawingBuffer: { width: 640, height: 360 },
      },
      quality: {
        level: 'performance',
        selectionSource: 'initial',
        adaptiveDowngradeCount: 0,
        adaptiveRecoveryCount: 0,
        lastAdaptiveReason: null,
        lastAdaptiveDowngradeReason: null,
        lastAdaptiveRecoveryReason: null,
        adaptivePolicy: null,
      },
      features: {
        bloomEnabled: false,
        composerEnabled: false,
        activePostprocessingPassCount: 0,
        mirrorEnabled: false,
        mirrorRenderTargetSize: 0,
        mirrorUpdateRateFps: 0,
        mirrorRenderCount: 0,
      },
      lastFailoverReason: null,
    });

    expect(store.read().entries).toHaveLength(1);
    await expect(copyCrashLog()).resolves.toBe(false);
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it('keeps a bounded serializable ring buffer', () => {
    const store = createCrashBreadcrumbStore({
      storage: createMemoryStorage(),
      maxEntries: 3,
      maxSerializedBytes: 20_000,
    });

    for (let index = 0; index < 5; index += 1) {
      store.record({ type: 'mode-change', message: `entry-${index}` });
    }

    const exported = JSON.parse(store.exportCrashLog()) as ReturnType<
      typeof store.read
    >;
    expect(exported.entries).toHaveLength(3);
    expect(exported.entries.map((entry) => entry.message)).toEqual([
      'entry-2',
      'entry-3',
      'entry-4',
    ]);
    expect(() => JSON.stringify(exported)).not.toThrow();
  });

  it('keeps exported crash logs under the serialized byte budget', () => {
    const store = createCrashBreadcrumbStore({
      storage: createMemoryStorage(),
      maxEntries: 40,
      maxSerializedBytes: 1_200,
    });

    for (let index = 0; index < 12; index += 1) {
      store.record({
        type: 'mode-change',
        message: `entry-${index}-${'x'.repeat(400)}`,
      });
    }

    const exported = store.exportCrashLog();
    const parsed = JSON.parse(exported) as ReturnType<typeof store.read>;
    expect(new Blob([exported]).size).toBeLessThanOrEqual(1_200);
    expect(parsed.entries.at(-1)?.message).toContain('entry-11');
  });

  it('preserves critical warning breadcrumbs before trimming old snapshots', () => {
    const store = createCrashBreadcrumbStore({
      storage: createMemoryStorage(),
      maxEntries: 5,
      maxSerializedBytes: 1_800,
    });

    store.record({ type: 'renderer-warning', message: 'Basic Render Driver' });
    for (let index = 0; index < 12; index += 1) {
      store.record({ type: 'snapshot', message: `snapshot-${index}` });
    }

    const exported = store.exportCrashLog();
    const parsed = JSON.parse(exported) as ReturnType<typeof store.read>;
    expect(new Blob([exported]).size).toBeLessThanOrEqual(1_800);
    expect(parsed.entries).toContainEqual(
      expect.objectContaining({
        type: 'renderer-warning',
        message: 'Basic Render Driver',
      })
    );
    expect(parsed.entries.at(-1)).toMatchObject({ message: 'snapshot-11' });
  });

  it('exports recent snapshots with renderer and software-safe state', () => {
    const store = createCrashBreadcrumbStore({
      storage: createMemoryStorage(),
    });
    store.recordSnapshot({
      averageFps: 12,
      medianFps: 12,
      p95FrameMs: 90,
      minFps: 8,
      sampleCount: 5,
      phases: {
        inputMovementCamera: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        avatarIkAudio: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        poiHudTooltips: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        decorativeStructures: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        lightingLedLightmap: { averageMs: 1, p95Ms: 2, sampleCount: 1 },
        mirror: { averageMs: 0, p95Ms: 0, sampleCount: 0 },
        mainRender: { averageMs: 80, p95Ms: 90, sampleCount: 5 },
      },
      renderer: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'Microsoft',
        unmaskedRenderer:
          'ANGLE (Microsoft, Microsoft Basic Render Driver, D3D11)',
        isSoftwareRenderer: true,
        isDangerousSoftwareRenderer: true,
        riskLevel: 'dangerous-software',
        reason: 'test',
      },
      softwareRendererPolicy: {
        mode: 'safe',
        safeMode: true,
        renderCadenceFps: 12,
        reason: 'test',
      },
      rendererSize: {
        pixelRatio: 0.5,
        viewport: { width: 1280, height: 720 },
        drawingBuffer: { width: 640, height: 360 },
      },
      quality: {
        level: 'performance',
        selectionSource: 'initial',
        adaptiveDowngradeCount: 0,
        adaptiveRecoveryCount: 0,
        lastAdaptiveReason: null,
        lastAdaptiveDowngradeReason: null,
        lastAdaptiveRecoveryReason: null,
        adaptivePolicy: null,
      },
      features: {
        bloomEnabled: false,
        composerEnabled: false,
        activePostprocessingPassCount: 0,
        mirrorEnabled: false,
        mirrorRenderTargetSize: 0,
        mirrorUpdateRateFps: 0,
        mirrorRenderCount: 0,
      },
      lastFailoverReason: null,
    });

    const exported = JSON.parse(store.exportCrashLog()) as ReturnType<
      typeof store.read
    >;
    expect(exported.entries[0]).toMatchObject({
      type: 'snapshot',
      renderer: { isDangerousSoftwareRenderer: true },
      softwareRendererPolicy: { safeMode: true, renderCadenceFps: 12 },
    });
  });
});
