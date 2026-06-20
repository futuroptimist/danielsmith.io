import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getSiteStrings } from '../assets/i18n';

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
  it('uses the stable PDF for localized text and immersive action surfaces', () => {
    for (const locale of ['ar', 'en', 'ja', 'zh-Hans'] as const) {
      expect(getSiteStrings(locale).textFallback.contact.resumeUrl).toBe(
        '/resume.pdf'
      );
    }

    expect(
      getSiteStrings('en-x-pseudo').textFallback.contact.resumeUrl
    ).toContain('/resume.pdf');
  });

  it('uses the stable PDF in the no-script fallback', () => {
    expect(readProjectFile('index.html')).toContain(
      '<a class="noscript-fallback__link" href="/resume.pdf">'
    );
  });

  it('requires the stable PDF before strict smoke validation runs', () => {
    const expectations = readProjectFile(
      'scripts/static-asset-expectations.cjs'
    );

    expect(expectations).toContain("path: '/resume.pdf'");
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
