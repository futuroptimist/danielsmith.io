import type { AudioSubtitlesHandle } from '../../ui/hud/audioSubtitles';
import type { AudioHudControlHandle } from '../controls/audioHudControl';

import type { AmbientAudioController } from './ambientAudio';
import type { AmbientAudioPreference } from './ambientAudioPreference';
import type { FootstepAudioControllerHandle } from './footstepController';

export interface GlobalAudioControllerOptions {
  ambient: Pick<AmbientAudioController, 'enable' | 'disable' | 'isEnabled'>;
  preference: Pick<AmbientAudioPreference, 'isEnabled' | 'setEnabled'>;
  footstep?: Pick<
    FootstepAudioControllerHandle,
    'setEnabled' | 'isEnabled'
  > | null;
  stopFootstep?: () => void;
  subtitles?: Pick<AudioSubtitlesHandle, 'clear'> | null;
  hud?: Pick<AudioHudControlHandle, 'refresh'> | null;
}

export interface GlobalAudioControllerHandle {
  enable(): Promise<void>;
  disable(options?: { persist?: boolean }): void;
  isEnabled(): boolean;
  refreshHud(): void;
}

export function createGlobalAudioController({
  ambient,
  preference,
  footstep = null,
  stopFootstep,
  subtitles = null,
  hud = null,
}: GlobalAudioControllerOptions): GlobalAudioControllerHandle {
  const refreshHud = () => {
    hud?.refresh();
  };

  const hardDisableRuntimeAudio = () => {
    ambient.disable();
    footstep?.setEnabled(false);
    stopFootstep?.();
    subtitles?.clear();
  };

  return {
    async enable() {
      try {
        await ambient.enable();
      } catch (error) {
        hardDisableRuntimeAudio();
        refreshHud();
        throw error;
      }
      footstep?.setEnabled(true);
      preference.setEnabled(true, 'control');
      refreshHud();
    },
    disable(options = {}) {
      hardDisableRuntimeAudio();
      if (options.persist ?? true) {
        preference.setEnabled(false, 'control');
      }
      refreshHud();
    },
    isEnabled() {
      return ambient.isEnabled();
    },
    refreshHud,
  };
}
