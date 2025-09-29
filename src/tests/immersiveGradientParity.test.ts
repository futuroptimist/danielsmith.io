import fs from 'node:fs';
import path from 'node:path';

import { Color } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  IMMERSIVE_GRADIENT_CSS_BACKGROUND,
  IMMERSIVE_GRADIENT_SOLID_FALLBACK,
  IMMERSIVE_GRADIENT_STOPS,
  createImmersiveGradientTexture,
} from '../theme/immersiveGradient';

type DeviceScenario = {
  label: string;
  width: number;
  height: number;
  devicePixelRatio: number;
};

const projectRoot = path.resolve(__dirname, '..', '..');
const indexHtmlPath = path.resolve(projectRoot, 'index.html');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const INLINE_GRADIENT_REGEX = /background:\s*linear-gradient\(180deg,\s*(#[0-9a-fA-F]{6}) 0%,\s*(#[0-9a-fA-F]{6}) 100%\s*\);/;

const DEVICE_SCENARIOS: DeviceScenario[] = [
  { label: 'phone portrait', width: 375, height: 812, devicePixelRatio: 3 },
  { label: 'phone landscape', width: 812, height: 375, devicePixelRatio: 3 },
  { label: 'tablet', width: 1024, height: 1366, devicePixelRatio: 2 },
  { label: 'laptop', width: 1440, height: 900, devicePixelRatio: 2 },
  { label: '4k monitor', width: 3840, height: 2160, devicePixelRatio: 1.5 },
];

const ORIGINAL_VIEWPORT = {
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  devicePixelRatio: window.devicePixelRatio,
};

const toHex = (value: number) => value.toString(16).padStart(2, '0');

const parseGradientStops = (backgroundImage: string) => {
  const rgbMatches = [...backgroundImage.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)];
  if (rgbMatches.length >= 2) {
    return {
      top: `#${rgbMatches[0]
        .slice(1, 4)
        .map((component) => toHex(Number(component)))
        .join('')}`.toLowerCase(),
      bottom: `#${rgbMatches[rgbMatches.length - 1]
        .slice(1, 4)
        .map((component) => toHex(Number(component)))
        .join('')}`.toLowerCase(),
    } as const;
  }

  const hexMatches = [...backgroundImage.matchAll(/#([0-9a-fA-F]{6})/g)];
  if (hexMatches.length >= 2) {
    return {
      top: `#${hexMatches[0][1]}`.toLowerCase(),
      bottom: `#${hexMatches[hexMatches.length - 1][1]}`.toLowerCase(),
    } as const;
  }

  throw new Error(`Expected at least two color stops in ${backgroundImage}`);
};

describe('immersive gradient parity', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: ORIGINAL_VIEWPORT.innerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: ORIGINAL_VIEWPORT.innerHeight,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: ORIGINAL_VIEWPORT.devicePixelRatio,
    });

    document.documentElement.style.backgroundImage = '';
    document.documentElement.style.backgroundColor = '';
  });

  it('keeps the inline loading gradient in sync with the immersive stops', () => {
    const match = indexHtml.match(INLINE_GRADIENT_REGEX);
    expect(match).not.toBeNull();

    const [, topStop, bottomStop] = match!;
    expect(topStop.toLowerCase()).toBe(IMMERSIVE_GRADIENT_STOPS.top);
    expect(bottomStop.toLowerCase()).toBe(IMMERSIVE_GRADIENT_STOPS.bottom);
  });

  DEVICE_SCENARIOS.forEach((scenario) => {
    it(`renders matching gradients for ${scenario.label}`, () => {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: scenario.width,
      });
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: scenario.height,
      });
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: scenario.devicePixelRatio,
      });

      document.documentElement.style.backgroundImage = IMMERSIVE_GRADIENT_CSS_BACKGROUND;
      document.documentElement.style.backgroundColor = IMMERSIVE_GRADIENT_SOLID_FALLBACK;

      const computed = window.getComputedStyle(document.documentElement);
      const { top, bottom } = parseGradientStops(computed.backgroundImage);

      const recordedStops: Array<{ offset: number; color: string }> = [];
      const originalCreateElement = document.createElement.bind(document);
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementationOnce((tagName: string) => {
          if (tagName.toLowerCase() === 'canvas') {
            const gradient = {
              addColorStop: (offset: number, color: string) => {
                recordedStops.push({ offset, color });
              },
            };
            const context = {
              createLinearGradient: vi.fn(() => gradient),
              fillRect: vi.fn(),
              set fillStyle(_value: string | CanvasGradient) {
                // no-op for tests
              },
              get fillStyle() {
                return '';
              },
            };
            return {
              width: 0,
              height: 0,
              getContext: vi.fn((type: string) => (type === '2d' ? context : null)),
            } as unknown as HTMLCanvasElement;
          }
          return originalCreateElement(tagName);
        });

      const texture = createImmersiveGradientTexture();
      try {
        texture.dispose();
      } finally {
        createElementSpy.mockRestore();
      }

      expect(recordedStops).toHaveLength(2);
      expect(recordedStops[0].offset).toBe(0);
      expect(recordedStops[1].offset).toBe(1);

      const immersiveTop = `#${new Color(recordedStops[0].color).getHexString()}`;
      const immersiveBottom = `#${new Color(recordedStops[1].color).getHexString()}`;

      expect(top).toBe(immersiveTop);
      expect(bottom).toBe(immersiveBottom);
    });
  });
});
