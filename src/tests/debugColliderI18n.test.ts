import { describe, expect, it } from 'vitest';

import { AVAILABLE_LOCALES, getDebugColliderStrings } from '../assets/i18n';

describe('debug collider i18n strings', () => {
  it('provides accessible toggle copy for every locale', () => {
    for (const locale of AVAILABLE_LOCALES) {
      const strings = getDebugColliderStrings(locale);

      expect(strings.labelEnabled, `${locale} enabled label`).toBeTruthy();
      expect(strings.labelDisabled, `${locale} disabled label`).toBeTruthy();
      expect(
        strings.descriptionEnabled,
        `${locale} enabled description`
      ).toBeTruthy();
      expect(
        strings.descriptionDisabled,
        `${locale} disabled description`
      ).toBeTruthy();
    }
  });
});
