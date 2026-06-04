import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const linkChecker = require('../../scripts/check-links.cjs') as {
  collectLinks: () => Promise<
    Array<{ href: string; filePath: string; sourceType: string }>
  >;
};

describe('link checker coverage', () => {
  it('collects POI locale links and documentation links', async () => {
    const links = await linkChecker.collectLinks();

    expect(links.some((link) => link.sourceType === 'poi-locale')).toBe(true);
    expect(links.some((link) => link.sourceType === 'docs-markdown')).toBe(
      true
    );
    expect(
      links.some(
        (link) =>
          link.sourceType === 'poi-locale' &&
          link.href === 'https://github.com/democratizedspace/dspace'
      )
    ).toBe(true);
    expect(
      links.some(
        (link) =>
          link.sourceType === 'docs-markdown' &&
          link.href.includes('docs/prompts/summary.md')
      )
    ).toBe(true);
  });
});
