import { describe, expect, it } from 'vitest';

import {
  checkManifest,
  normalizedTypeScriptTokens,
} from '../../scripts/miniatureManifest';

describe('miniature manifest', () => {
  it('normalizes TypeScript tokens independent of comments and whitespace', () => {
    const a = 'const value = 1; // comment\nexport { value };';
    const b = 'const   value=1;\n/* block */ export {value};';
    expect(normalizedTypeScriptTokens(a)).toBe(normalizedTypeScriptTokens(b));
  });

  it('accepts the committed manifest', () => {
    expect(() => checkManifest()).not.toThrow();
  });
});
