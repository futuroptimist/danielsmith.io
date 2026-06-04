import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import { AVAILABLE_LOCALES } from '../assets/i18n';
import { getPoiDefinitions } from '../scene/poi/registry';

const require = createRequire(import.meta.url);
const linkChecker = require('../../scripts/check-links.cjs') as {
  collectLinks: () => Promise<
    Array<{ kind: 'poi' | 'docs'; source: string; target: string }>
  >;
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
          const url = new URL(link.href, 'https://danielsmith.io/');
          expect(
            allowedPoiSchemes.has(url.protocol),
            `${locale} ${poi.id} ${link.href} uses an allowed scheme`
          ).toBe(true);
        }
      }
    }
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
