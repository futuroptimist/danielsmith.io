import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPoiLabelTexture } from '../scene/poi/markers';
import type { PoiDefinition } from '../scene/poi/types';

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function () {
    const context = createMockCanvasContext();
    (
      this as HTMLCanvasElement & { __mockContext?: CanvasRenderingContext2D }
    ).__mockContext = context;
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
    summary: 'A rich shelving summary that should only appear in the overlay.',
    interactionPrompt: 'Inspect Gitshelves Living Room Array',
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    interactionRadius: 3,
    footprint: { width: 2, depth: 2 },
    outcome: { label: 'Outcome', value: 'Mapped a personal library' },
    metrics: [{ label: 'Shelves', value: '200+' }],
    links: [{ label: 'Read more', href: '#' }],
    status: 'live',
  } as PoiDefinition;
}

describe('createPoiLabelTexture', () => {
  it('draws a compact title-only marker label', () => {
    const poi = createPoiDefinition();
    const texture = createPoiLabelTexture(poi);
    const context = (
      texture.image as HTMLCanvasElement & {
        __mockContext: CanvasRenderingContext2D & { __fillTextLog: string[] };
      }
    ).__mockContext;

    expect(context.__fillTextLog).toContain(poi.title);
    expect(context.__fillTextLog).not.toContain(poi.summary);
    expect(context.__fillTextLog).not.toContain('Shelves: 200+');
    expect(context.__fillTextLog).not.toContain('Live');
  });
});
