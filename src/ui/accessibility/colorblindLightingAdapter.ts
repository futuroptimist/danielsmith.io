import { Color } from 'three';

import type {
  AccessibilityPresetId,
  AccessibilityPresetManager,
} from './presetManager';

export interface LedColorBinding {
  readonly roomId: string;
  readonly material: { emissive: Color };
  readonly light?: { color: Color } | null;
}

export interface ColorblindLightingAdapterOptions {
  readonly presetManager: Pick<
    AccessibilityPresetManager,
    'getPreset' | 'onChange'
  >;
  readonly bindings: Iterable<LedColorBinding>;
  readonly colorblindPalette: Readonly<Record<string, number>>;
}

export interface ColorblindLightingAdapterHandle {
  refresh(): void;
  dispose(): void;
}

interface BindingEntry {
  readonly binding: LedColorBinding;
  readonly baseEmissive: Color;
  readonly baseLight: Color | null;
}

export function createColorblindLightingAdapter({
  presetManager,
  bindings,
  colorblindPalette,
}: ColorblindLightingAdapterOptions): ColorblindLightingAdapterHandle {
  const bindingEntries: BindingEntry[] = Array.from(bindings, (binding) => ({
    binding,
    baseEmissive: binding.material.emissive.clone(),
    baseLight: binding.light ? binding.light.color.clone() : null,
  }));

  const overrideColors = new Map(
    Object.entries(colorblindPalette).map(([roomId, hex]) => [
      roomId,
      new Color(hex),
    ])
  );

  const applyPreset = (presetId: AccessibilityPresetId) => {
    const useColorblindPalette = presetId === 'colorblind';

    for (const entry of bindingEntries) {
      const { binding, baseEmissive, baseLight } = entry;
      const override = useColorblindPalette
        ? overrideColors.get(binding.roomId)
        : undefined;

      if (override) {
        binding.material.emissive.copy(override);
        if (binding.light) {
          binding.light.color.copy(override);
        }
      } else {
        binding.material.emissive.copy(baseEmissive);
        if (binding.light && baseLight) {
          binding.light.color.copy(baseLight);
        }
      }
    }
  };

  applyPreset(presetManager.getPreset());

  const unsubscribe = presetManager.onChange((preset) => {
    applyPreset(preset);
  });

  return {
    refresh() {
      applyPreset(presetManager.getPreset());
    },
    dispose() {
      unsubscribe();
    },
  };
}
