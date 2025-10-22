import type { PoiId } from '../poi/types';

import type { AvatarAccessoryId } from './accessories';

export type AvatarAccessoryPresetId =
  | 'minimalist'
  | 'operations-console'
  | 'scout-drone'
  | 'full-sync';

export interface AvatarAccessoryPresetDefinition {
  readonly id: AvatarAccessoryPresetId;
  readonly label: string;
  readonly description: string;
  readonly accessories: Partial<Record<AvatarAccessoryId, boolean>>;
  readonly unlockedByDefault?: boolean;
}

export interface AvatarAccessoryPresetRule {
  readonly presetId: AvatarAccessoryPresetId;
  readonly requiredPoiIds: readonly PoiId[];
  readonly autoApplyOnUnlock?: boolean;
}

export const AVATAR_ACCESSORY_PRESETS: readonly AvatarAccessoryPresetDefinition[] =
  [
    {
      id: 'minimalist',
      label: 'Minimalist',
      description:
        'Hide all accessories for a clean-line mannequin silhouette.',
      accessories: {
        'wrist-console': false,
        'holo-drone': false,
      },
      unlockedByDefault: true,
    },
    {
      id: 'operations-console',
      label: 'Operations console',
      description: 'Enable the wrist console to monitor live diagnostics.',
      accessories: {
        'wrist-console': true,
        'holo-drone': false,
      },
      unlockedByDefault: true,
    },
    {
      id: 'scout-drone',
      label: 'Scout drone',
      description:
        'Deploy the holographic drone after meeting the Gabriel sentry.',
      accessories: {
        'wrist-console': false,
        'holo-drone': true,
      },
    },
    {
      id: 'full-sync',
      label: 'Full sync',
      description: 'Activate both accessories for mission-ready telemetry.',
      accessories: {
        'wrist-console': true,
        'holo-drone': true,
      },
    },
  ];

export const AVATAR_ACCESSORY_PRESET_RULES: readonly AvatarAccessoryPresetRule[] =
  [
    {
      presetId: 'scout-drone',
      requiredPoiIds: ['gabriel-studio-sentry'],
      autoApplyOnUnlock: true,
    },
    {
      presetId: 'full-sync',
      requiredPoiIds: ['pr-reaper-backyard-console', 'dspace-backyard-rocket'],
    },
  ];
