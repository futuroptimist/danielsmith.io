import { describe, expect, it, vi } from 'vitest';

import { createCrashBreadcrumbStore } from '../scene/performance/crashBreadcrumbs';
import { classifyRendererInfo } from '../scene/performance/rendererCapabilities';
import { resolveSoftwareRendererPolicy } from '../scene/performance/softwareRendererMode';

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(values.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
    }),
  };
}

describe('crash breadcrumb store', () => {
  it('keeps a bounded serializable ring buffer with renderer info', () => {
    const storage = createStorage();
    const renderer = classifyRendererInfo({
      unmaskedRenderer: 'ANGLE (Microsoft, Microsoft Basic Render Driver)',
    });
    const softwareRendererPolicy = resolveSoftwareRendererPolicy(renderer);
    const store = createCrashBreadcrumbStore({
      storage,
      maxEntries: 3,
      getLocationHref: () => 'https://example.test/?mode=immersive',
      getMemory: () => ({ usedJSHeapSize: 1234 }),
    });

    store.setRendererInfo(renderer);
    store.setSoftwareRendererPolicy(softwareRendererPolicy);
    store.setLastUserVisibleMessage('software renderer safe mode');

    for (let index = 0; index < 5; index += 1) {
      store.record({
        kind: 'performance-snapshot',
        message: `snapshot ${index}`,
      });
    }

    const exported = store.exportCrashLog();
    expect(exported.renderer?.isDangerousSoftwareRenderer).toBe(true);
    expect(exported.softwareRendererPolicy?.softwareSafeMode).toBe(true);
    expect(exported.lastUserVisibleMessage).toBe('software renderer safe mode');
    expect(exported.breadcrumbs).toHaveLength(3);
    expect(exported.breadcrumbs[0]?.message).toBe('snapshot 2');
    expect(exported.breadcrumbs[2]?.memory?.usedJSHeapSize).toBe(1234);
    expect(() => JSON.parse(store.exportCrashLogJson())).not.toThrow();
    expect(storage.setItem).toHaveBeenCalled();
  });
});
