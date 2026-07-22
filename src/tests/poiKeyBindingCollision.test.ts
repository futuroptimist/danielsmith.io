import { describe, expect, it } from 'vitest';

import { POI_CYCLE_KEYS } from '../scene/poi/interactionManager';
import {
  DEFAULT_KEY_BINDINGS,
  type KeyBindingAction,
} from '../systems/controls/keyBindings';

const MOVEMENT_ACTIONS: KeyBindingAction[] = [
  'moveForward',
  'moveBackward',
  'moveLeft',
  'moveRight',
];

function normalize(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

describe('POI cycle keys vs movement keys', () => {
  it('never share a key with player movement bindings', () => {
    const cycleKeys = new Set(POI_CYCLE_KEYS.map(normalize));

    for (const action of MOVEMENT_ACTIONS) {
      for (const boundKey of DEFAULT_KEY_BINDINGS[action]) {
        expect(cycleKeys.has(normalize(boundKey))).toBe(false);
      }
    }
  });

  it('only binds POI cycling to Q and E', () => {
    expect(new Set(POI_CYCLE_KEYS.map(normalize))).toEqual(new Set(['q', 'e']));
  });
});
