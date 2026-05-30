import { describe, expect, it, vi } from 'vitest';

import { createCrashBreadcrumbStore } from '../scene/performance/crashBreadcrumbs';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('crash breadcrumb store', () => {
  it('keeps a bounded serializable ring buffer', () => {
    const storage = createMemoryStorage();
    const now = vi.fn(() => new Date('2026-05-30T12:00:00.000Z'));
    const store = createCrashBreadcrumbStore({
      storage,
      maxEvents: 3,
      now,
      getUrl: () => 'https://example.test/?mode=immersive',
    });

    for (let index = 0; index < 5; index += 1) {
      store.record({ type: 'snapshot', message: `snapshot ${index}` });
    }

    const exported = store.exportCrashLog();
    expect(exported.events).toHaveLength(3);
    expect(exported.events.map((event) => event.message)).toEqual([
      'snapshot 2',
      'snapshot 3',
      'snapshot 4',
    ]);
    expect(() => JSON.parse(store.serialize())).not.toThrow();
  });

  it('exports renderer info from recent events', () => {
    const store = createCrashBreadcrumbStore({
      storage: createMemoryStorage(),
      getUrl: () => 'https://example.test/',
      now: () => new Date('2026-05-30T12:00:00.000Z'),
    });

    store.record({
      type: 'renderer-warning',
      renderer: {
        vendor: 'Google Inc.',
        renderer: 'WebGL',
        unmaskedVendor: 'Microsoft',
        unmaskedRenderer: 'ANGLE (Microsoft Basic Render Driver)',
        isSoftwareRenderer: true,
        isDangerousSoftwareRenderer: true,
        riskLevel: 'dangerous-software',
        reason: 'matched dangerous microsoft basic render',
      },
    });

    expect(store.exportCrashLog().renderer).toMatchObject({
      isDangerousSoftwareRenderer: true,
      riskLevel: 'dangerous-software',
    });
  });
});
