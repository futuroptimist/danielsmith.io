import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

describe('Metrics Documentation', () => {
  const metricsDir = join(__dirname, '..', '..', 'docs', 'metrics');

  describe('lighting.md', () => {
    const lightingPath = join(metricsDir, 'lighting.md');
    let content: string;

    it('exists and is readable', () => {
      expect(() => {
        content = readFileSync(lightingPath, 'utf8');
      }).not.toThrow();
      expect(content.length).toBeGreaterThan(0);
    });

    it('documents all core lighting components', () => {
      content = readFileSync(lightingPath, 'utf8');
      const requiredSections = [
        'Baked Gradient Lightmaps',
        'LED Strip System',
        'LED Pulse Programs',
        'Lightmap Bounce Animator',
        'Seasonal Lighting Presets',
        'Debug Controls',
      ];
      for (const section of requiredSections) {
        expect(content).toContain(section);
      }
    });

    it('includes performance metrics', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('Performance Metrics');
      expect(content).toContain('FPS');
      expect(content).toContain('Frame time');
    });

    it('documents accessibility features', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('Accessibility Features');
      expect(content).toContain('Pulse Damping');
      expect(content).toContain('pulseScale');
    });

    it('includes color palette documentation', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('Color Palettes');
      expect(content).toContain('FLOOR_BASE_COLOR');
      expect(content).toContain('WALL_BASE_COLOR');
      expect(content).toContain('CEILING_BASE_COLOR');
    });

    it('documents the debug toggle (Shift+L)', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('Shift+L');
      expect(content).toContain('debug');
      expect(content).toContain('cinematic');
    });

    it('includes integration guide', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('Integration Guide');
      expect(content).toContain('Adding a New Room');
    });

    it('references source files', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('src/scene/lighting/');
      expect(content).toContain('bakedLightmaps.ts');
      expect(content).toContain('ledPulsePrograms.ts');
      expect(content).toContain('lightmapBounceAnimator.ts');
    });

    it('includes bundle impact metrics', () => {
      content = readFileSync(lightingPath, 'utf8');
      expect(content).toContain('Bundle Impact');
      expect(content).toContain('Gzipped Size');
    });
  });

  describe('accessibility.md', () => {
    const accessibilityPath = join(metricsDir, 'accessibility.md');
    let content: string;

    it('exists and is readable', () => {
      expect(() => {
        content = readFileSync(accessibilityPath, 'utf8');
      }).not.toThrow();
      expect(content.length).toBeGreaterThan(0);
    });

    it('documents all accessibility presets', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      const requiredPresets = [
        'Standard Mode',
        'Calm Mode',
        'High Contrast Mode',
        'Photosensitive-Safe Mode',
      ];
      for (const preset of requiredPresets) {
        expect(content).toContain(preset);
      }
    });

    it('includes WCAG contrast ratios', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Contrast Ratios');
      expect(content).toContain('WCAG');
      expect(content).toContain('AAA');
      expect(content).toContain(':1'); // Ratio notation (e.g., "21:1")
    });

    it('documents photosensitive-safe constraints', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Photosensitive-Safe');
      expect(content).toContain('flicker');
      expect(content).toContain('0%'); // Zero pulse amplitude
    });

    it('includes screen reader compatibility', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Screen Reader');
      expect(content).toContain('aria-live');
      expect(content).toContain('Live Region');
    });

    it('documents keyboard navigation', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Keyboard Navigation');
      expect(content).toContain('WASD');
      expect(content).toContain('Tab');
    });

    it('includes touch accessibility metrics', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Touch');
      expect(content).toContain('48×48'); // Minimum touch target size
      expect(content).toContain('px');
    });

    it('documents INP (Input-to-Next-Paint) metrics', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('INP');
      expect(content).toContain('Input');
      expect(content).toContain('200 ms'); // Target threshold
    });

    it('includes audio caption settings', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Caption');
      expect(content).toContain('Subtitle');
    });

    it('documents Axe CI integration', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Axe');
      expect(content).toContain('CI');
      expect(content).toContain('Critical');
    });

    it('includes performance failover metrics', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('Failover');
      expect(content).toContain('Text Mode');
    });

    it('references WCAG guidelines', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('WCAG');
      expect(content).toContain('w3.org');
    });

    it('includes manual QA checklist', () => {
      content = readFileSync(accessibilityPath, 'utf8');
      expect(content).toContain('QA Checklist');
      expect(content).toContain('[ ]'); // Checkbox notation
    });
  });

  describe('metrics directory structure', () => {
    it('contains both required documentation files', () => {
      const lightingExists = readFileSync(
        join(metricsDir, 'lighting.md'),
        'utf8'
      );
      const accessibilityExists = readFileSync(
        join(metricsDir, 'accessibility.md'),
        'utf8'
      );
      expect(lightingExists.length).toBeGreaterThan(0);
      expect(accessibilityExists.length).toBeGreaterThan(0);
    });
  });
});
