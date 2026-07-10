import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

describe('i18n hardcoded UI string guard', () => {
  it('rejects representative forbidden UI literals deterministically', () => {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/check-hardcoded-ui-strings.cjs',
        'scripts/__fixtures__/i18n-guard',
      ],
      { encoding: 'utf8' }
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('textContent assignment');
    expect(result.stderr).toContain('setAttribute literal');
    expect(result.stderr).toContain('dataset.hudAnnounce literal');
    expect(result.stderr).toContain('localized property literal');
    expect(result.stderr).toContain('localized default initializer');
  });
});
