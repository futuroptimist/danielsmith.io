import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPoiLabelTexture } from '../scene/poi/markers';
import type { PoiDefinition } from '../scene/poi/types';

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
const mockContexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
    const existing = mockContexts.get(this);
    if (existing) {
      return existing;
    }
    const context = createMockCanvasContext(this);
    mockContexts.set(this, context);
    return context;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function createMockCanvasContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const fillTextLog: string[] = [];
  const context = {
    canvas,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    measureText: (text: string) => ({ width: text.length * 12 }),
    fillText: (text: string) => {
      fillTextLog.push(text);
    },
  };
  (context as { __fillTextLog?: string[] }).__fillTextLog = fillTextLog;
  return context as unknown as CanvasRenderingContext2D;
}

function createPoiDefinition(): PoiDefinition {
  return {
    id: 'gitshelves-living-room-installation',
    title: 'Gitshelves Living Room Array',
    summary: 'A detailed summary that should stay in the 2D overlay only.',
    interactionPrompt: 'Inspect Gitshelves Living Room Array',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 3,
    footprint: { width: 2, depth: 2 },
    outcome: { label: 'Outcome', value: 'Curated repo discovery' },
    metrics: [{ label: 'Repos', value: '42' }],
    links: [{ label: 'GitHub', href: 'https://github.com/futuroptimist' }],
    status: 'live',
  } as PoiDefinition;
}

describe('POI marker labels', () => {
  it('renders title-only marker textures without rich details', () => {
    const texture = createPoiLabelTexture(createPoiDefinition());
    const canvas = texture.image as HTMLCanvasElement;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D & {
      __fillTextLog: string[];
    };

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(180);
    expect(context.__fillTextLog).toEqual(['Gitshelves Living Room Array']);
    expect(context.__fillTextLog).not.toContain(
      'A detailed summary that should stay in the 2D overlay only.'
    );
    expect(context.__fillTextLog.some((entry) => entry.includes('Repos'))).toBe(
      false
    );
    expect(context.__fillTextLog).not.toContain('Live');
  });
});
