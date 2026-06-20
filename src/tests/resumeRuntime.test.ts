import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { AVAILABLE_LOCALES, getSiteStrings } from '../assets/i18n';

const require = createRequire(import.meta.url);
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);
const INDEX_HTML = path.join(PROJECT_ROOT, 'index.html');
const STABLE_RESUME_PDF = '/resume.pdf';
const LEGACY_RESUME_VERSION = ['2025', '09'].join('-');
const LEGACY_SEPTEMBER_RESUME = [
  '/docs/resume',
  LEGACY_RESUME_VERSION,
  'resume.pdf',
].join('/');
const ACTIVE_SOURCE_ROOTS = [
  'index.html',
  'src',
  'scripts',
  'README.md',
  'docs',
];
const ARCHIVE_RESUME_PDF = '/docs/resume/2026-06/resume.pdf';

const { runtimeAssetExpectations } =
  require('../../scripts/static-asset-expectations.cjs') as {
    runtimeAssetExpectations: Array<{ path: string; reason: string }>;
  };

function collectTextFiles(entry: string): string[] {
  const absoluteEntry = path.join(PROJECT_ROOT, entry);
  if (!existsSync(absoluteEntry)) {
    return [];
  }
  const stat = statSync(absoluteEntry);
  if (stat.isFile()) {
    return [absoluteEntry];
  }
  return readdirSync(absoluteEntry, { withFileTypes: true }).flatMap((item) => {
    const relativePath = path.join(entry, item.name);
    if (relativePath === path.join('docs', 'resume', LEGACY_RESUME_VERSION)) {
      return [];
    }
    if (item.isDirectory()) {
      return collectTextFiles(relativePath);
    }
    return item.isFile() ? [path.join(PROJECT_ROOT, relativePath)] : [];
  });
}

describe('runtime resume URL contract', () => {
  it('uses the stable resume PDF in the no-script fallback', () => {
    const html = readFileSync(INDEX_HTML, 'utf8');

    expect(html).toContain(`href="${STABLE_RESUME_PDF}"`);
    expect(html).not.toContain(LEGACY_SEPTEMBER_RESUME);
  });

  it('uses the stable resume PDF in localized runtime link definitions', () => {
    const runtimeResumeUrls = AVAILABLE_LOCALES.map(
      (locale) => getSiteStrings(locale).textFallback.contact.resumeUrl
    );

    for (const resumeUrl of runtimeResumeUrls) {
      expect(resumeUrl).toContain(STABLE_RESUME_PDF);
      expect(resumeUrl).not.toContain(LEGACY_RESUME_VERSION);
    }
  });

  it('requires the stable resume PDF during static smoke validation', () => {
    expect(runtimeAssetExpectations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: STABLE_RESUME_PDF }),
      ])
    );
    expect(existsSync(path.join(PROJECT_ROOT, 'public', 'resume.pdf'))).toBe(
      true
    );
  });

  it('keeps active source files off the September 2025 resume archive', () => {
    const offenders = collectTextFilesFromActiveSources()
      .filter((filePath) => !isBinary(filePath))
      .filter((filePath) =>
        readFileSync(filePath, 'utf8').includes(LEGACY_SEPTEMBER_RESUME)
      );

    expect(
      offenders.map((filePath) => path.relative(PROJECT_ROOT, filePath))
    ).toEqual([]);
  });

  it('permits immutable dated resume archives alongside stable artifacts', () => {
    expect(
      existsSync(path.join(PROJECT_ROOT, 'public', ARCHIVE_RESUME_PDF))
    ).toBe(true);
    expect(existsSync(path.join(PROJECT_ROOT, 'public', 'resume.docx'))).toBe(
      true
    );
  });
});

function collectTextFilesFromActiveSources(): string[] {
  return ACTIVE_SOURCE_ROOTS.flatMap(collectTextFiles);
}

function isBinary(filePath: string): boolean {
  return [
    '.pdf',
    '.docx',
    '.png',
    '.jpg',
    '.jpeg',
    '.ico',
    '.webp',
    '.avif',
    '.gif',
  ].includes(path.extname(filePath).toLowerCase());
}
