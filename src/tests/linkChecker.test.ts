import { createRequire } from 'node:module';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { AVAILABLE_LOCALES } from '../assets/i18n';
import { getPoiDefinitions } from '../scene/poi/registry';

const require = createRequire(import.meta.url);
type CollectedLink = { kind: 'poi' | 'docs'; source: string; target: string };

const linkChecker = require('../../scripts/check-links.cjs') as {
  collectLinks: () => Promise<CollectedLink[]>;
  extractMarkdownLinks: (source: string, text: string) => CollectedLink[];
  validateLinks: (
    links: CollectedLink[],
    options?: { concurrency?: number; retries?: number; timeoutMs?: number }
  ) => Promise<{ failures: string[]; warnings: string[]; skipped: number }>;
};

const allowedPoiSchemes = new Set(['http:', 'https:', 'mailto:']);

describe('POI link validation', () => {
  it('does not expose the removed DSPACE Mission Log link in any locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const dspace = getPoiDefinitions(locale).find(
        (poi) => poi.id === 'dspace-backyard-rocket'
      );
      const links = dspace?.links ?? [];

      expect(links, `${locale} keeps DSPACE links`).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            href: 'https://futuroptimist.dev/projects/dspace',
          }),
        ])
      );
      expect(links.some((link) => /mission log/i.test(link.label))).toBe(false);
    }
  });

  it('keeps all localized POI links on supported schemes with valid syntax', () => {
    for (const locale of AVAILABLE_LOCALES) {
      for (const poi of getPoiDefinitions(locale)) {
        for (const link of poi.links ?? []) {
          const url = new URL(link.href);
          expect(
            allowedPoiSchemes.has(url.protocol),
            `${locale} ${poi.id} ${link.href} uses an allowed scheme`
          ).toBe(true);
        }
      }
    }
  });

  it('requires localized POI links to be absolute URLs', () => {
    expect(() => new URL('/docs/foo')).toThrow(TypeError);
  });
});

describe('link checker collection', () => {
  it('collects both POI locale links and README/docs Markdown links', async () => {
    const links = await linkChecker.collectLinks();

    expect(links.some((link) => link.kind === 'poi')).toBe(true);
    expect(links.some((link) => link.kind === 'docs')).toBe(true);
    expect(
      links.some(
        (link) =>
          link.kind === 'poi' &&
          link.target === 'https://github.com/democratizedspace/dspace'
      )
    ).toBe(true);
    expect(
      links.some((link) => link.kind === 'docs' && link.source === 'README.md')
    ).toBe(true);
  });
});

describe('external link validation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to GET when HEAD reports a missing external URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const results = await linkChecker.validateLinks(
      [
        {
          kind: 'docs',
          source: 'README.md',
          target: 'https://example.org/head-404-get-ok',
        },
      ],
      { concurrency: 1, retries: 0 }
    );

    expect(results.failures).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([, init]) => init?.method)).toEqual([
      'HEAD',
      'GET',
    ]);
  });
});

describe('Markdown link extraction', () => {
  it('keeps balanced parentheses in inline Markdown link destinations', () => {
    const links = linkChecker.extractMarkdownLinks(
      'docs/example.md',
      '[API](https://example.com/a_(b))'
    );

    expect(links).toEqual([
      {
        kind: 'docs',
        source: 'docs/example.md',
        target: 'https://example.com/a_(b)',
      },
    ]);
  });

  it('validates repeated local targets relative to each source file', async () => {
    const results = await linkChecker.validateLinks(
      [
        {
          kind: 'docs',
          source: 'README.md',
          target: 'docs/roadmap.md',
        },
        {
          kind: 'docs',
          source: 'docs/architecture/scene-stack.md',
          target: 'docs/roadmap.md',
        },
      ],
      { concurrency: 1 }
    );

    expect(results.failures).toHaveLength(1);
    expect(results.failures[0]).toContain('missing local link target');
    expect(results.failures[0]).toContain('docs/architecture/scene-stack.md');
  });

  it('validates local Markdown anchors when hashes are present', async () => {
    const results = await linkChecker.validateLinks(
      [
        {
          kind: 'docs',
          source: 'README.md',
          target: 'README.md#local-quality-gates',
        },
        {
          kind: 'docs',
          source: 'README.md',
          target: '#key-resources',
        },
        {
          kind: 'docs',
          source: 'README.md',
          target: 'README.md#missing-section-for-test',
        },
      ],
      { concurrency: 1 }
    );

    expect(results.failures).toHaveLength(1);
    expect(results.failures[0]).toContain('missing local anchor');
    expect(results.failures[0]).toContain('README.md#missing-section-for-test');
  });
});
