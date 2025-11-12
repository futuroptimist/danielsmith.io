# Accessibility Presets

The immersive portfolio offers four accessibility presets that tune visual effects, motion,
audio, and HUD contrast to support diverse visitor needs. Each preset applies a coordinated set
of adjustments to bloom post-processing, LED lighting, animation pulses, motion blur, and ambient
audio volume.

## Overview

Presets are managed by `AccessibilityPresetManager` (`src/ui/accessibility/presetManager.ts`) and
can be switched via the HUD settings panel. The active preset persists across sessions using
localStorage (with sessionStorage fallback) and re-applies whenever graphics quality changes.

## Preset Definitions

### Standard

**Purpose**: Default balanced experience for visitors without specific accessibility needs.

**Metrics**:

- **Motion**: Default (no reduction)
- **Contrast**: Standard HUD contrast
- **Animation scales**:
  - Pulse scale: 1.0 (full intensity)
  - Flicker scale: 1.0 (full intensity)
- **Motion blur**: 0.6 intensity
- **Bloom**:
  - Enabled: Yes
  - Strength scale: 1.0 (baseline)
  - Radius scale: 1.0 (baseline)
  - Threshold offset: 0.0
- **LED lighting**:
  - Emissive scale: 1.0 (baseline)
  - Light intensity scale: 1.0 (baseline)
- **Audio**: Volume scale 1.0 (baseline)

**Use cases**: Visitors with no motion sensitivity, photosensitivity, or contrast needs. Default
landing experience.

### Calm

**Purpose**: Softens visual intensity and ambient audio for visitors who prefer a gentler
sensory profile without disabling motion cues entirely.

**Metrics**:

- **Motion**: Reduced
- **Contrast**: Standard HUD contrast
- **Animation scales**:
  - Pulse scale: 0.65 (35% reduction from baseline)
  - Flicker scale: 0.55 (45% reduction from baseline)
- **Motion blur**: 0.25 intensity (58% reduction from baseline)
- **Bloom**:
  - Enabled: Yes
  - Strength scale: 0.6 (40% reduction)
  - Radius scale: 0.9 (10% reduction)
  - Threshold offset: +0.02 (raises glow threshold, reducing bloom coverage)
- **LED lighting**:
  - Emissive scale: 0.75 (25% reduction)
  - Light intensity scale: 0.8 (20% reduction)
- **Audio**: Volume scale 0.8 (20% reduction)

**Use cases**: Visitors who find the standard preset visually or audibly overwhelming but still
want motion guidance. Helpful for extended viewing sessions or lower-stimulation environments.

### High Contrast

**Purpose**: Boosts HUD readability and enhances lighting cues while maintaining full animation
and motion blur. Ideal for visitors with low vision who benefit from stronger visual contrasts
without motion reduction.

**Metrics**:

- **Motion**: Default (no reduction)
- **Contrast**: High HUD contrast (applied via CSS `data-accessibility-contrast="high"`)
- **Animation scales**:
  - Pulse scale: 1.0 (full intensity)
  - Flicker scale: 1.0 (full intensity)
- **Motion blur**: 0.6 intensity (same as standard)
- **Bloom**:
  - Enabled: Yes
  - Strength scale: 1.1 (10% increase)
  - Radius scale: 1.0 (baseline)
  - Threshold offset: -0.02 (lowers glow threshold, expanding bloom coverage)
- **LED lighting**:
  - Emissive scale: 1.15 (15% increase)
  - Light intensity scale: 1.1 (10% increase)
- **Audio**: Volume scale 1.0 (baseline)

**Use cases**: Visitors with low vision or those in bright environments who need stronger visual
separation between UI elements and scene content. Does not reduce motion cues.

### Photosensitive Safe

**Purpose**: Eliminates bloom, disables animation pulses and flickers, removes motion blur, and
boosts HUD contrast to prevent photosensitive triggers. This is the most restrictive preset,
prioritizing safety over cinematic polish.

**Metrics**:

- **Motion**: Reduced
- **Contrast**: High HUD contrast
- **Animation scales**:
  - Pulse scale: 0.0 (completely disabled)
  - Flicker scale: 0.0 (completely disabled)
- **Motion blur**: 0.0 intensity (completely disabled)
- **Bloom**:
  - Enabled: **No** (bloom pass disabled entirely)
  - Strength scale: 0.0 (when re-enabled, would have zero strength)
  - Radius scale: 1.0
  - Threshold offset: +0.05
- **LED lighting**:
  - Emissive scale: 0.55 (45% reduction)
  - Light intensity scale: 0.6 (40% reduction)
- **Audio**: Volume scale 0.7 (30% reduction)

**Use cases**: Visitors with photosensitive epilepsy or other conditions that require minimal
visual flicker, pulsing, or intensity changes. Meets reduced-motion and high-contrast needs
simultaneously.

## Contrast Ratios

### HUD Contrast

The high-contrast setting (used by `high-contrast` and `photosensitive` presets) applies CSS
custom properties to overlay text and controls:

- **Standard mode**: HUD text approximately 7:1 contrast ratio against overlay backgrounds
  (WCAG AA compliance for large text, approaching AAA)
- **High-contrast mode**: HUD text boosted to approximately 10:1 contrast ratio (exceeds WCAG AAA
  threshold for normal and large text)

These values are achieved via the `data-accessibility-contrast` attribute on
`document.documentElement` and corresponding CSS rules that adjust text color, background
opacity, and border visibility.

### In-World Contrast

High-contrast presets increase LED emissive and light intensity scales, which brightens POI
pedestals, holographic tooltips, and backyard signage. While exact in-world contrast ratios
depend on viewer position and lighting conditions, the 10–15% boost ensures that interactive
elements remain distinguishable even in bright environments or for visitors with low vision.

## Motion Reduction Levels

### Default Motion

- Full animation pulse intensity (pulseScale: 1.0)
- Full flicker intensity (flickerScale: 1.0)
- Standard motion blur (0.6 intensity)

Used by `standard` and `high-contrast` presets. Provides maximum cinematic polish and spatial
feedback.

### Reduced Motion

- Lowered or disabled pulse intensity (pulseScale: 0.0–0.65)
- Lowered or disabled flicker intensity (flickerScale: 0.0–0.55)
- Reduced or disabled motion blur (0.0–0.25 intensity)

Used by `calm` and `photosensitive` presets. Respects `prefers-reduced-motion` user preferences
and avoids abrupt intensity changes that may trigger discomfort or photosensitive reactions.

## Audio Adjustments

Each preset scales the master ambient audio volume:

- **Standard**: 1.0× (baseline)
- **Calm**: 0.8× (20% quieter)
- **High contrast**: 1.0× (baseline)
- **Photosensitive**: 0.7× (30% quieter)

The `AccessibilityPresetManager` also supports a separate `baseAudioVolume` control that visitors
can adjust independently via the HUD audio slider. The effective volume is:

```
effectiveVolume = baseAudioVolume × preset.audio.volumeScale
```

This allows fine-grained control without requiring preset switches. For example, a visitor on
the `calm` preset can further reduce volume to 0.5 by setting `baseAudioVolume = 0.625`
(0.625 × 0.8 = 0.5).

## Acceptance Criteria & Manual Testing

### Testing Standard Preset

1. Launch the immersive experience with
   `?mode=immersive&disablePerformanceFailover=1`.
2. Open the HUD settings panel and confirm "Standard" is selected.
3. **Expected**:
   - Bloom post-processing visible (glow around LED strips, POI halos).
   - Holographic tooltips and lantern beacons pulse at full intensity.
   - Motion blur visible when rotating camera quickly.
   - Ambient audio at comfortable baseline volume.
   - HUD text readable with standard contrast (approximately 7:1 ratio).

### Testing Calm Preset

1. Switch to "Calm" in the HUD settings panel.
2. **Expected**:
   - Bloom strength reduced (softer glow around LEDs and POIs).
   - Pulse animations slower and less pronounced (65% of standard intensity).
   - Motion blur reduced to approximately 42% of standard intensity.
   - Ambient audio 20% quieter than standard.
   - HUD text remains readable with standard contrast.
3. **Verification**:
   - Check `document.documentElement.dataset.accessibilityPreset === 'calm'`.
   - Check `document.documentElement.dataset.accessibilityMotion === 'reduced'`.
   - Check `document.documentElement.dataset.accessibilityPulseScale === '0.65'`.
   - Check `document.documentElement.dataset.accessibilityMotionBlur === '0.25'`.

### Testing High Contrast Preset

1. Switch to "High contrast" in the HUD settings panel.
2. **Expected**:
   - Bloom strength increased slightly (10% brighter glow).
   - LED emissives and light intensities boosted (10–15% brighter).
   - HUD text significantly more readable with high-contrast styling (approximately 10:1 ratio).
   - Motion blur and animation pulses remain at full intensity.
3. **Verification**:
   - Check `document.documentElement.dataset.accessibilityContrast === 'high'`.
   - Inspect HUD overlay CSS to confirm high-contrast custom properties are applied.
   - Compare LED glow intensity to standard preset (should be noticeably brighter).

### Testing Photosensitive Safe Preset

1. Switch to "Photosensitive safe" in the HUD settings panel.
2. **Expected**:
   - Bloom post-processing **completely disabled** (no glow around LEDs or POIs).
   - No animation pulses or flickers (pulseScale and flickerScale both 0).
   - Motion blur completely disabled.
   - LED emissives and light intensities significantly reduced (55–60% of standard, or 40–45% reduction from standard).
   - Ambient audio 30% quieter than standard.
   - HUD text readable with high-contrast styling (approximately 10:1 ratio).
3. **Verification**:
   - Check `document.documentElement.dataset.accessibilityPreset === 'photosensitive'`.
   - Check `document.documentElement.dataset.accessibilityMotion === 'reduced'`.
   - Check `document.documentElement.dataset.accessibilityContrast === 'high'`.
   - Check `document.documentElement.dataset.accessibilityPulseScale === '0'`.
   - Check `document.documentElement.dataset.accessibilityFlickerScale === '0'`.
   - Check `document.documentElement.dataset.accessibilityMotionBlur === '0'`.
   - Confirm bloom pass is disabled via console inspection or visual absence of glow effects.

### Persistence Testing

1. Switch to a non-standard preset (e.g., "Calm").
2. Reload the page.
3. **Expected**: The "Calm" preset remains active after reload.
4. **Verification**: Check localStorage for `danielsmith:accessibility-preset` key with
   `presetId: 'calm'` in the stored payload.

### Base Audio Volume Independence

1. Switch to "Calm" preset.
2. Adjust the HUD audio volume slider to 50%.
3. **Expected**: Effective volume is 0.5 × 0.8 = 0.4 (40% of baseline).
4. Reload the page.
5. **Expected**: Both preset and base volume settings persist.
6. **Verification**: Check localStorage payload includes `baseAudioVolume: 0.5` and
   `presetId: 'calm'`.

### Motion Blur Independence

1. Switch to "Standard" preset.
2. Open the HUD settings and reduce motion blur slider to 50%.
3. **Expected**: Motion blur intensity is 0.6 × 0.5 = 0.3.
4. Switch to "Calm" preset.
5. **Expected**: Motion blur intensity is 0.25 × 0.5 = 0.125 (preset scale still applies).
6. **Verification**: Check `document.documentElement.dataset.accessibilityMotionBlur` updates
   correctly after each change.

## Integration with Graphics Quality

The `AccessibilityPresetManager` subscribes to `GraphicsQualityManager` changes. When the
graphics quality level changes (e.g., from "Cinematic" to "Performance"), the manager re-applies
the current preset's bloom, LED, and lighting adjustments to ensure consistency.

**Testing**:

1. Set preset to "Calm" while on "Cinematic" graphics quality.
2. Switch graphics quality to "Performance" in the HUD.
3. **Expected**: Bloom and LED scales from the "Calm" preset re-apply to the new quality
   baseline.
4. **Verification**: Bloom and LED intensities remain scaled at 60% and 75–80% respectively,
   even after quality change.

## Automated Test Coverage

The `AccessibilityPresetManager` is covered by unit tests in
`src/tests/accessibilityPresetManager.test.ts`:

- Preset switching and persistence
- Bloom, LED, and audio scaling
- Base audio volume adjustments
- Base motion blur intensity adjustments
- Storage failure handling
- Re-application on graphics quality changes

**Coverage**: 100% of preset logic, including edge cases for clamping, storage failures, and
listener notifications.

## Future Enhancements

- **Contrast ratio validation**: Automate HUD contrast measurements using computed styles and
  luminance calculations to ensure 7:1 and 10:1 thresholds are met.
- **Motion detection**: Optionally auto-enable reduced-motion presets when
  `prefers-reduced-motion: reduce` media query is active.
- **Custom presets**: Allow visitors to save personalized combinations of pulse, bloom, and audio
  settings beyond the four built-in presets.
- **Preset recommendations**: Surface preset suggestions in the help modal based on detected
  device capabilities or user preferences.

## References

- Implementation: `src/ui/accessibility/presetManager.ts`
- Tests: `src/tests/accessibilityPresetManager.test.ts`
- Accessibility overlay guide: `docs/guides/accessibility-overlays.md`
- WCAG 2.2 contrast guidelines: <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum>
