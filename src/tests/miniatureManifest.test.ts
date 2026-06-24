import { describe, expect, it } from 'vitest';

import {
  buildMiniatureManifest,
  normalizeTypeScriptTokens,
  validateMiniatureManifest,
} from '../../scripts/miniature-manifest';

describe('miniature manifest', () => {
  it('token fingerprints ignore comments and formatting trivia', () => {
    expect(normalizeTypeScriptTokens('const value = 1; // comment')).toBe(
      normalizeTypeScriptTokens('const   value=1;\n/* block */')
    );
  });

  it('builds a deterministic manifest for current proxies and coverage', () => {
    const manifest = buildMiniatureManifest();
    expect(manifest.entries.length).toBeGreaterThan(10);
    expect(new Set(manifest.entries.map((entry) => entry.id)).size).toBe(
      manifest.entries.length
    );
  });

  it('rejects source changes when proxy fingerprint and sync revision do not change', () => {
    const manifest = buildMiniatureManifest();
    const changed = structuredClone(manifest);
    changed.entries[0].sourceFingerprint = 'changed';
    expect(() => validateMiniatureManifest(manifest, changed)).toThrow(
      /source changed/i
    );
  });

  it('allows explicit revision acknowledgements for source-only changes', () => {
    const manifest = buildMiniatureManifest();
    const changed = structuredClone(manifest);
    changed.entries[0].sourceFingerprint = 'changed';
    changed.entries[0].syncRevision += 1;
    changed.entries[0].syncNote = 'Reviewed source-only miniature impact.';
    expect(() => validateMiniatureManifest(changed, changed)).not.toThrow();
  });
});
