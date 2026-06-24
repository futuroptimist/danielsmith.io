import { describe, expect, it } from 'vitest';

import { normalizedTypeScriptTokens } from '../../scripts/miniatureManifest';

describe('miniature manifest source tokens', () => {
  it('ignore comments and formatting-only changes', () => {
    expect(normalizedTypeScriptTokens('const value = 1; // hello\n')).toBe(
      normalizedTypeScriptTokens('const    value=1;\n/* ignored */')
    );
  });
  it('change when semantic source changes', () => {
    expect(normalizedTypeScriptTokens('const value = 1;')).not.toBe(
      normalizedTypeScriptTokens('const value = 2;')
    );
  });
});
