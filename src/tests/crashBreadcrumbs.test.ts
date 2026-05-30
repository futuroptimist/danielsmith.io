import { describe, expect, it } from 'vitest';

import { createCrashBreadcrumbStore } from '../scene/performance/crashBreadcrumbs';

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
