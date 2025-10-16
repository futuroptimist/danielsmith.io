import { Color } from 'three';
import { describe, expect, it } from 'vitest';

import { createColorblindLightingAdapter } from '../ui/accessibility/colorblindLightingAdapter';
import type { AccessibilityPresetId } from '../ui/accessibility/presetManager';

type Listener = (preset: AccessibilityPresetId) => void;

function createStubPresetManager(initial: AccessibilityPresetId) {
  let current = initial;
  const listeners = new Set<Listener>();
  return {
    getPreset: () => current,
    onChange: (listener: Listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPreset: (preset: AccessibilityPresetId) => {
      current = preset;
      listeners.forEach((listener) => listener(preset));
    },
  };
}

describe('createColorblindLightingAdapter', () => {
  it('applies colorblind overrides and restores defaults on preset changes', () => {
    const presetManager = createStubPresetManager('colorblind');
    const material = { emissive: new Color(0x123456) };
    const light = { color: new Color(0x123456) };

    const adapter = createColorblindLightingAdapter({
      presetManager,
      bindings: [
        {
          roomId: 'livingRoom',
          material,
          light,
        },
      ],
      colorblindPalette: {
        livingRoom: 0x1b9e77,
      },
    });

    expect(material.emissive.getHexString()).toBe('1b9e77');
    expect(light.color.getHexString()).toBe('1b9e77');

    presetManager.setPreset('standard');
    expect(material.emissive.getHexString()).toBe('123456');
    expect(light.color.getHexString()).toBe('123456');

    presetManager.setPreset('colorblind');
    expect(material.emissive.getHexString()).toBe('1b9e77');
    expect(light.color.getHexString()).toBe('1b9e77');

    adapter.dispose();
    presetManager.setPreset('calm');
    expect(material.emissive.getHexString()).toBe('1b9e77');
    expect(light.color.getHexString()).toBe('1b9e77');
  });

  it('keeps base colors when overrides are missing and refresh reapplies state', () => {
    const presetManager = createStubPresetManager('standard');
    const material = { emissive: new Color(0x445566) };
    const light = { color: new Color(0x998877) };
    const exteriorMaterial = { emissive: new Color(0xabcdef) };

    const adapter = createColorblindLightingAdapter({
      presetManager,
      bindings: [
        {
          roomId: 'studio',
          material,
          light,
        },
        {
          roomId: 'backyard',
          material: exteriorMaterial,
        },
      ],
      colorblindPalette: {
        livingRoom: 0x1b9e77,
      },
    });

    expect(material.emissive.getHexString()).toBe('445566');
    expect(light.color.getHexString()).toBe('998877');
    expect(exteriorMaterial.emissive.getHexString()).toBe('abcdef');

    presetManager.setPreset('colorblind');
    expect(material.emissive.getHexString()).toBe('445566');
    expect(light.color.getHexString()).toBe('998877');
    expect(exteriorMaterial.emissive.getHexString()).toBe('abcdef');

    material.emissive.set(0xffffff);
    light.color.set(0xffffff);
    exteriorMaterial.emissive.set(0xffffff);
    adapter.refresh();
    expect(material.emissive.getHexString()).toBe('445566');
    expect(light.color.getHexString()).toBe('998877');
    expect(exteriorMaterial.emissive.getHexString()).toBe('abcdef');
  });
});
