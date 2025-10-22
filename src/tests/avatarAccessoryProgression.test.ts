import { describe, expect, it, vi } from 'vitest';

import type { AvatarAccessoryManager } from '../scene/avatar/accessoryManager';
import { PoiVisitedState } from '../scene/poi/visitedState';
import { createAvatarAccessoryProgression } from '../systems/progression/avatarAccessoryProgression';

const createManagerStub = (overrides: Partial<AvatarAccessoryManager> = {}) => {
  return {
    unlockPreset: vi.fn(() => false),
    applyPreset: vi.fn(),
    ...overrides,
  } as unknown as AvatarAccessoryManager;
};

describe('createAvatarAccessoryProgression', () => {
  it('unlocks presets and auto-applies when requirements are met', () => {
    const manager = createManagerStub({
      unlockPreset: vi.fn(() => true),
      applyPreset: vi.fn(),
    });
    const visitedState = new PoiVisitedState({ storage: null });

    createAvatarAccessoryProgression({
      manager,
      visitedState,
      rules: [
        {
          presetId: 'scout-drone',
          requiredPoiIds: ['gabriel-studio-sentry'],
          autoApplyOnUnlock: true,
        },
      ],
    });

    visitedState.markVisited('gabriel-studio-sentry');

    expect(manager.unlockPreset).toHaveBeenCalledWith('scout-drone');
    expect(manager.applyPreset).toHaveBeenCalledWith('scout-drone');
  });

  it('does not auto-apply when the preset was already unlocked', () => {
    const unlockPreset = vi.fn(() => false);
    const applyPreset = vi.fn();
    const manager = createManagerStub({ unlockPreset, applyPreset });
    const visitedState = new PoiVisitedState({ storage: null });

    createAvatarAccessoryProgression({
      manager,
      visitedState,
      rules: [
        {
          presetId: 'full-sync',
          requiredPoiIds: ['pr-reaper-backyard-console'],
          autoApplyOnUnlock: true,
        },
      ],
    });

    visitedState.markVisited('pr-reaper-backyard-console');

    expect(unlockPreset).toHaveBeenCalledWith('full-sync');
    expect(applyPreset).not.toHaveBeenCalled();
  });

  it('disposes the visited state subscription', () => {
    const unsubscribe = vi.fn();
    const visitedState = {
      subscribe: vi.fn(() => unsubscribe),
    } as unknown as PoiVisitedState;
    const manager = createManagerStub();

    const progression = createAvatarAccessoryProgression({
      manager,
      visitedState,
      rules: [
        {
          presetId: 'minimalist',
          requiredPoiIds: [],
        },
      ],
    });

    progression.dispose();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
