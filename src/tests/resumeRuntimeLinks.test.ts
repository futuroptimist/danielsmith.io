import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { AVAILABLE_LOCALES, getSiteStrings } from '../assets/i18n';

const require = createRequire(import.meta.url);

const { runtimeAssetExpectations } =
  require('../../scripts/static-asset-expectations.cjs') as typeof import('../../scripts/static-asset-expectations.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const ACTIVE_SOURCE_FILES = [
  'index.html',
  'src/assets/i18n/locales/ar.ts',
  'src/assets/i18n/locales/en.ts',
  'src/assets/i18n/locales/en-x-pseudo.ts',
  'src/assets/i18n/locales/ja.ts',
  'src/assets/i18n/locales/zh-Hans.ts',
  'src/systems/failover/index.ts',
  'scripts/static-asset-expectations.cjs',
];
// Split to avoid this file matching its own scan for the legacy archive URL.
const LEGACY_RESUME_ARCHIVE_URL = [
  '/docs/resume',
  '2025' + '-09',
  'resume.pdf',
].join('/');

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
}

describe('runtime résumé links', () => {
  it('uses the stable PDF for every localized text fallback surface', () => {
    for (const locale of AVAILABLE_LOCALES) {
      expect(getSiteStrings(locale).textFallback.contact.resumeUrl).toBe(
        '/resume.pdf'
      );
    }
  });

  it('uses the stable PDF in the no-script fallback', () => {
    expect(readProjectFile('index.html')).toContain(
      '<a class="noscript-fallback__link" href="/resume.pdf">'
    );
  });

  it('requires the stable PDF before strict smoke validation runs', () => {
    expect(runtimeAssetExpectations).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: '/resume.pdf' })])
    );
    expect(runtimeAssetExpectations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: LEGACY_RESUME_ARCHIVE_URL }),
      ])
    );
    expect(existsSync(path.join(PROJECT_ROOT, 'public', 'resume.pdf'))).toBe(
      true
    );
  });

  it('keeps active source files off the September 2025 archive URL', () => {
    for (const relativePath of ACTIVE_SOURCE_FILES) {
      expect(readProjectFile(relativePath), relativePath).not.toContain(
        LEGACY_RESUME_ARCHIVE_URL
      );
    }
  });

  it('permits immutable dated archive artifacts alongside the stable PDF', () => {
    const archiveRoot = path.join(PROJECT_ROOT, 'public', 'docs', 'resume');
    const latestVersion = readdirSync(archiveRoot)
      .filter((entry) => /^\d{4}-\d{2}$/.test(entry))
      .sort()
      .at(-1);

    expect(latestVersion).toBeDefined();
    expect(
      existsSync(path.join(archiveRoot, latestVersion!, 'resume.pdf'))
    ).toBe(true);
  });
});
