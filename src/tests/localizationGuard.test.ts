import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const guardedFiles = [
  'src/systems/controls/accessibilityPresetControl.ts',
  'src/systems/controls/avatarAccessoryControl.ts',
  'src/systems/controls/avatarVariantControl.ts',
  'src/systems/controls/graphicsQualityControl.ts',
  'src/systems/controls/motionBlurControl.ts',
  'src/ui/hud/customizationSection.ts',
  'src/ui/hud/controlOverlay.ts',
  'src/ui/hud/helpModal.ts',
  'src/ui/hud/responsiveControlOverlay.ts',
  'src/ui/accessibility/presetManager.ts',
  'src/ui/softwareRendererWarning.ts',
  'src/scene/poi/tooltipOverlay.ts',
  'src/scene/poi/worldTooltip.ts',
];

const allowedLiteralSnippets = [
  // Internal DOM/CSS/data attributes and empty clears, not rendered copy.
  "className = '",
  'dataset.',
  "setAttribute('role'",
  "setAttribute('aria-live'",
  "setAttribute('aria-atomic'",
  "setAttribute('aria-modal'",
  "setAttribute('aria-hidden'",
  "setAttribute('aria-expanded'",
  "setAttribute('aria-checked'",
  "setAttribute('aria-pressed'",
  "setAttribute('aria-controls'",
  "setAttribute('tabindex'",
  "setAttribute('type'",
  "textContent = ''",
  "textContent = '×'",
  "textContent = '·'",
  // Keyboard glyphs are stable controls vocabulary across locales.
  "DEFAULT_KEY_HINT = 'M'",
  "event.key !== '0'",
  // Internal diagnostics, storage states, and technical errors.
  'console.warn(',
  'throw new Error(',
  "state = 'active'",
  "state = 'idle'",
  "state = 'off'",
  "state = 'on'",
];

const userVisibleLiteralPattern =
  /(textContent\s*=\s*'[^']*[A-Za-z][^']*'|setAttribute\('(?:aria-label|title)'\s*,\s*'[^']*[A-Za-z][^']*'|(?:label|description|title)\s*=\s*'[^']*[A-Za-z][^']*')/;

describe('runtime localization guardrails', () => {
  it('keeps guarded HUD and settings modules free of hardcoded English UI copy', () => {
    const violations = guardedFiles.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return source
        .split('\n')
        .map((line, index) => ({ file, line, lineNumber: index + 1 }))
        .filter(({ line }) => userVisibleLiteralPattern.test(line))
        .filter(
          ({ line }) =>
            !allowedLiteralSnippets.some((snippet) => line.includes(snippet))
        )
        .map(
          ({ file, line, lineNumber }) =>
            `${file}:${lineNumber}: ${line.trim()}`
        );
    });

    expect(violations).toEqual([]);
  });
});
