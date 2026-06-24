import { describe, expect, it } from 'vitest';

import {
  assertManifestUpdateIsAcknowledged,
  checkManifest,
  normalizedTypeScriptTokens,
} from '../../scripts/miniatureManifest';

const entry = {
  id: 'poi:test',
  sourceFiles: ['src/scene/structures/example.ts'],
  proxyFiles: ['src/scene/miniature/example.ts'],
  syncRevision: 1,
  syncNote: 'Initial sync.',
  sourceFingerprint: 'source-a',
  proxyFingerprint: 'proxy-a',
  metadataFingerprint: 'metadata-a',
};

const manifest = (override = {}) => ({
  generatedBy: 'scripts/miniatureManifest.ts',
  auditedDirs: ['src/scene/structures'],
  entries: [{ ...entry, ...override }],
});

describe('miniature manifest', () => {
  it('normalizes TypeScript tokens independent of comments and whitespace', () => {
    const a = 'const value = 1; // comment\nexport { value };';
    const b = 'const   value=1;\n/* block */ export {value};';
    expect(normalizedTypeScriptTokens(a)).toBe(normalizedTypeScriptTokens(b));
  });

  it('accepts the committed manifest', () => {
    expect(() => checkManifest()).not.toThrow();
  });

  it('rejects source-only manifest updates without an acknowledgement', () => {
    expect(() =>
      assertManifestUpdateIsAcknowledged(
        manifest(),
        manifest({ sourceFingerprint: 'source-b' })
      )
    ).toThrow(/changed source files without proxy changes/);
  });

  it('accepts proxy changes or revision bumps with changed notes', () => {
    expect(() =>
      assertManifestUpdateIsAcknowledged(
        manifest(),
        manifest({ proxyFingerprint: 'proxy-b', sourceFingerprint: 'source-b' })
      )
    ).not.toThrow();
    expect(() =>
      assertManifestUpdateIsAcknowledged(
        manifest(),
        manifest({
          sourceFingerprint: 'source-b',
          syncRevision: 2,
          syncNote: 'Reviewed source-only geometry change.',
        })
      )
    ).not.toThrow();
  });

  it('rejects note-only manifest updates as acknowledgements', () => {
    expect(() =>
      assertManifestUpdateIsAcknowledged(
        manifest(),
        manifest({ syncNote: 'Only the note changed.' })
      )
    ).toThrow(/note-only acknowledgements/);
  });
});
