import { describe, expect, it } from 'vitest';

import { DEFAULT_KEY_BINDINGS } from '../systems/controls/keyBindings';

describe('tutorial key binding', () => {
  it('uses R without conflicting with another default action', () => {
    expect(DEFAULT_KEY_BINDINGS.toggleTutorial).toEqual(['r']);
    const owners = Object.entries(DEFAULT_KEY_BINDINGS).filter(([, bindings]) =>
      bindings.includes('r')
    );
    expect(owners.map(([action]) => action)).toEqual(['toggleTutorial']);
  });
});
