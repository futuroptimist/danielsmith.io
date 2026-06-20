import { readFileSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { getSiteStrings } from '../assets/i18n';

const require = createRequire(import.meta.url);
const { runtimeAssetExpectations } =
  require('../../scripts/static-asset-expectations.cjs') as {
    runtimeAssetExpectations: Array<{ path: string; reason: string }>;
  };

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..', '..');
const legacyResumeVersion = ['2025', '09'].join('-');
const legacyResumePdfPath = `/docs/resume/${legacyResumeVersion}/resume.pdf`;

const activeSourceFiles = [
  'index.html',
  'src/assets/i18n/locales/en.ts',
  'src/assets/i18n/locales/en-x-pseudo.ts',
  'src/assets/i18n/locales/zh-Hans.ts',
  'src/assets/i18n/locales/ar.ts',
  'src/assets/i18n/locales/ja.ts',
  'src/systems/failover/index.ts',
  'scripts/static-asset-expectations.cjs',
];

const readProjectFile = (relativePath: string) =>
  readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('runtime résumé links', () => {
  it('keeps localized runtime contact links on the stable PDF alias', () => {
    for (const locale of ['en', 'zh-Hans', 'ar', 'ja'] as const) {
      expect(getSiteStrings(locale).textFallback.contact.resumeUrl).toBe(
        '/resume.pdf'
      );
    }
  });

  it('keeps the no-script fallback on the stable PDF alias', () => {
    const indexHtml = readProjectFile('index.html');

    expect(indexHtml).toContain('href="/resume.pdf"');
    expect(indexHtml).not.toContain(legacyResumePdfPath);
  });

  it('requires the stable PDF alias before strict static smoke validation runs', () => {
    expect(runtimeAssetExpectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/resume.pdf',
        }),
      ])
    );
    expect(runtimeAssetExpectations).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: legacyResumePdfPath,
        }),
      ])
    );
  });

  it('does not reference the September 2025 PDF from active runtime sources', () => {
    for (const relativePath of activeSourceFiles) {
      expect(readProjectFile(relativePath), relativePath).not.toContain(
        legacyResumePdfPath
      );
    }
  });

  it('keeps the stable PDF present for strict smoke validation', async () => {
    await expect(
      access(path.join(projectRoot, 'public', 'resume.pdf'))
    ).resolves.toBeUndefined();
  });

  it('permits immutable dated résumé archives alongside the stable alias', async () => {
    await expect(
      access(
        path.join(
          projectRoot,
          'public',
          'docs',
          'resume',
          '2026-06',
          'resume.pdf'
        )
      )
    ).resolves.toBeUndefined();
  });
});
