import { describe, expect, it } from 'vitest';
import {
  buildManifest,
  normalizedTypeScriptTokens,
  validateSourceChangeAcknowledged,
} from '../../scripts/miniature-manifest';

describe('miniature manifest', () => {
  it('ignores comments and formatting in token fingerprints', () => {
    expect(normalizedTypeScriptTokens('const x=1; // hi')).toBe(
      normalizedTypeScriptTokens('const   x = 1;\n/* bye */')
    );
    expect(normalizedTypeScriptTokens('const x=1;')).not.toBe(
      normalizedTypeScriptTokens('const x=2;')
    );
  });
  it('requires source changes to be acknowledged by proxy changes or revision bumps', () => {
    const oldEntry = {
      id: 'x',
      sourceHash: 'a',
      proxyHash: 'p',
      syncRevision: 1,
    };
    expect(
      validateSourceChangeAcknowledged(oldEntry, {
        ...oldEntry,
        sourceHash: 'b',
      })
    ).toBe(false);
    expect(
      validateSourceChangeAcknowledged(oldEntry, {
        ...oldEntry,
        sourceHash: 'b',
        proxyHash: 'q',
      })
    ).toBe(true);
    expect(
      validateSourceChangeAcknowledged(oldEntry, {
        ...oldEntry,
        sourceHash: 'b',
        syncRevision: 2,
      })
    ).toBe(true);
  });
  it('builds a deterministic registry manifest', () => {
    const manifest = buildManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.entries.length).toBeGreaterThan(14);
    expect(new Set(manifest.entries.map((entry) => entry.id)).size).toBe(
      manifest.entries.length
    );
  });
});
