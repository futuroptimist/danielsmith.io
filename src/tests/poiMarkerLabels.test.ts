import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPoiLabelTexture } from '../scene/poi/markers';
import type { PoiDefinition } from '../scene/poi/types';

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
const createdContexts: Array<
  CanvasRenderingContext2D & { __fillTextLog: string[] }
> = [];

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function () {
    const context = createMockCanvasContext() as CanvasRenderingContext2D & {
      __fillTextLog: string[];
    };
    createdContexts.push(context);
    return context;
  };
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function createMockCanvasContext(): CanvasRenderingContext2D {
  const fillTextLog: string[] = [];
  const context = {
    canvas: document.createElement('canvas'),
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
    summary: 'Rich summary copy remains reserved for the viewport overlay.',
    interactionPrompt: 'Inspect Gitshelves Living Room Array',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 3,
    footprint: { width: 2, depth: 2 },
    outcome: { label: 'Outcome', value: 'Curated repos faster' },
    metrics: [{ label: 'Repos', value: '42' }],
    links: [{ label: 'GitHub', href: 'https://github.com/futuroptimist' }],
    status: 'live',
  } as PoiDefinition;
}

describe('createPoiLabelTexture', () => {
  it('draws title-only marker labels without rich detail copy', () => {
    const poi = createPoiDefinition();
    const texture = createPoiLabelTexture(poi);
    const renderedText = createdContexts.at(-1)?.__fillTextLog.join(' ') ?? '';

    expect(renderedText).toContain(poi.title);
    expect(renderedText).not.toContain('Rich summary');
    expect(renderedText).not.toContain('Curated repos');
    expect(renderedText).not.toContain('Repos');
    expect(renderedText).not.toContain('Live');

    texture.dispose();
  });
});
