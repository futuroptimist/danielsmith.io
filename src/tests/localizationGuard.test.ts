import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const guardedFiles = [
  'src/systems/controls/accessibilityPresetControl.ts',
  'src/systems/controls/avatarAccessoryControl.ts',
  'src/systems/controls/avatarVariantControl.ts',
  'src/systems/controls/graphicsQualityControl.ts',
  'src/systems/controls/motionBlurControl.ts',
  'src/ui/hud/customizationSection.ts',
  'src/ui/softwareRendererWarning.ts',
  'src/scene/poi/tooltipOverlay.ts',
  'src/scene/poi/worldTooltip.ts',
] as const;

const allowedLiterals = new Map<string, readonly string[]>([
  [
    'src/systems/controls/accessibilityPresetControl.ts',
    [
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Accessibility presets',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Tune motion assists and HUD contrast.',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      '{label} preset selected.',
    ],
  ],
  [
    'src/systems/controls/avatarAccessoryControl.ts',
    [
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Accessories',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Toggle companion gear for the avatar.',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      '{label} enabled.',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      '{label} disabled.',
    ],
  ],
  [
    'src/systems/controls/avatarVariantControl.ts',
    [
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Avatar style',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Switch outfits for the mannequin explorer.',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      '{label} avatar selected.',
    ],
  ],
  [
    'src/systems/controls/graphicsQualityControl.ts',
    [
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Graphics quality',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Pick a preset that matches your device performance.',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      '{label} preset selected.',
    ],
  ],
  [
    'src/systems/controls/motionBlurControl.ts',
    [
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Motion blur intensity',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Adjust the trail effect applied to fast camera and avatar movement.',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Motion blur controls',
      // Test and storybook fallback copy only; immersiveScene passes localized i18n strings.
      'Motion blur intensity slider.',
      // Stable percent template fallback paired with localized value-label templates.
      '{percent}% · Low trails',
      // Stable percent template fallback paired with localized value-label templates.
      '{percent}% · Medium trails',
      // Stable percent template fallback paired with localized value-label templates.
      '{percent}% · High trails',
      // Short slider value fallback paired with localized value labels.
      'Off',
    ],
  ],
]);

const userVisibleNeedles = [
  'Accessibility presets',
  'Standard',
  'Calm',
  'High contrast',
  'Photosensitive safe',
  'Graphics quality',
  'Avatar style',
  'Accessories',
  'Motion blur intensity',
];

describe('hardcoded runtime localization guard', () => {
  it('keeps guarded HUD and Settings files free of accidental English UI literals', () => {
    for (const file of guardedFiles) {
      const source = readFileSync(file, 'utf8');
      const allowed = allowedLiterals.get(file) ?? [];
      for (const needle of userVisibleNeedles) {
        if (allowed.includes(needle)) {
          continue;
        }
        expect(source, `${file} should localize "${needle}"`).not.toContain(
          needle
        );
      }
    }
  });
});
