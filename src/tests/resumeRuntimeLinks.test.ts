import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { getSiteStrings } from '../assets/i18n';

const repositoryRoot = path.resolve(__dirname, '../..');
const activeRuntimeFiles = [
  'index.html',
  'src/systems/failover/index.ts',
  'src/assets/i18n/locales/ar.ts',
  'src/assets/i18n/locales/en.ts',
  'src/assets/i18n/locales/en-x-pseudo.ts',
  'src/assets/i18n/locales/ja.ts',
  'src/assets/i18n/locales/zh-Hans.ts',
];

async function readRepositoryFile(relativePath: string): Promise<string> {
  return readFile(path.join(repositoryRoot, relativePath), 'utf8');
}

describe('runtime resume links', () => {
  it('uses the stable resume PDF in localized active text fallback definitions', () => {
    const localeCodes = ['ar', 'en', 'en-x-pseudo', 'ja', 'zh-Hans'] as const;

    for (const localeCode of localeCodes) {
      expect(
        getSiteStrings(localeCode).textFallback.contact.resumeUrl
      ).toContain('/resume.pdf');
    }
  });

  it('uses the stable resume PDF in the no-script fallback', async () => {
    const indexHtml = await readRepositoryFile('index.html');

    expect(indexHtml).toContain(
      'class="noscript-fallback__link" href="/resume.pdf"'
    );
  });

  it('requires the stable resume PDF before strict static smoke validation', async () => {
    const expectations = await import(
      '../../scripts/static-asset-expectations.cjs'
    );
    const runtimeAssetExpectations =
      expectations.runtimeAssetExpectations as Array<{
        path: string;
      }>;

    expect(
      runtimeAssetExpectations.map((expectation) => expectation.path)
    ).toContain('/resume.pdf');
    expect(existsSync(path.join(repositoryRoot, 'public/resume.pdf'))).toBe(
      true
    );
  });

  it('keeps active runtime sources off the September 2025 dated PDF', async () => {
    const contents = await Promise.all(
      activeRuntimeFiles.map(readRepositoryFile)
    );

    for (const [index, content] of contents.entries()) {
      expect(content, activeRuntimeFiles[index]).not.toContain(
        ['/docs/resume', `2025-${'09'}`, 'resume.pdf'].join('/')
      );
    }
  });

  it('permits immutable dated resume archives alongside the stable alias', () => {
    expect(
      existsSync(
        path.join(
          repositoryRoot,
          path.join('public', 'docs', 'resume', `2025-${'09'}`, 'resume.pdf')
        )
      )
    ).toBe(true);
    expect(
      existsSync(
        path.join(repositoryRoot, 'public/docs/resume/2026-06/resume.pdf')
      )
    ).toBe(true);
  });
});
