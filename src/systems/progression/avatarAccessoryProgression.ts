import type { AvatarAccessoryManager } from '../../scene/avatar/accessoryManager';
import type {
  AvatarAccessoryPresetId,
  AvatarAccessoryPresetRule,
} from '../../scene/avatar/accessoryPresets';
import type { PoiVisitedState } from '../../scene/poi/visitedState';

export interface AvatarAccessoryProgressionOptions {
  readonly manager: AvatarAccessoryManager;
  readonly visitedState: PoiVisitedState;
  readonly rules: readonly AvatarAccessoryPresetRule[];
}

export interface AvatarAccessoryProgressionHandle {
  dispose(): void;
}

export function createAvatarAccessoryProgression({
  manager,
  visitedState,
  rules,
}: AvatarAccessoryProgressionOptions): AvatarAccessoryProgressionHandle {
  if (!rules.length) {
    return { dispose() {} };
  }

  const applyIfUnlocks = (
    presetId: AvatarAccessoryPresetId,
    autoApply: boolean
  ) => {
    const unlocked = manager.unlockPreset(presetId);
    if (unlocked && autoApply) {
      manager.applyPreset(presetId);
    }
  };

  const evaluateRules = (visited: ReadonlySet<string>) => {
    for (const rule of rules) {
      const requirementsMet = rule.requiredPoiIds.every((poiId) =>
        visited.has(poiId)
      );
      if (!requirementsMet) {
        continue;
      }
      applyIfUnlocks(rule.presetId, Boolean(rule.autoApplyOnUnlock));
    }
  };

  const unsubscribe = visitedState.subscribe((visited) => {
    evaluateRules(visited);
  });

  return {
    dispose() {
      unsubscribe();
    },
  };
}
