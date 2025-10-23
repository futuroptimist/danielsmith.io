import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const loadReadme = () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readmePath = resolve(currentDir, '../../README.md');
  return readFileSync(readmePath, 'utf-8');
};

describe('README play demo entry', () => {
  it('surfaces the immersive demo link with failover bypass parameters', () => {
    const readme = loadReadme();
    expect(readme).toContain('## Play the demo');
    expect(readme).toContain(
      'https://danielsmith.io/?mode=immersive&disablePerformanceFailover=1'
    );
  });

  it('keeps the text fallback call-out adjacent to the demo link', () => {
    const readme = loadReadme();
    const snippetPattern = new RegExp(
      String.raw`\[▶️ Play the immersive demo\]\(https://danielsmith\.io/\?mode=immersive&disablePerformanceFailover=1\)` +
        String.raw`\s*· Prefer the lightweight tour\? \[Launch the text portfolio\]\(https://danielsmith\.io/\?mode=text\)\.`
    );
    expect(readme).toMatch(snippetPattern);
  });
});
