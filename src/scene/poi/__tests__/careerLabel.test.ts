import { OrthographicCamera, Scene, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';

import { createPoiLabelTexture } from '../markers';
import { PoiWorldTooltip } from '../worldTooltip';

import { getTestCareerPois } from './helpers/careerFixtures';

afterEach(() => vi.restoreAllMocks());

for (const kind of ['plaque', 'world cue'] as const) {
  it(`renders the full institution name inside the ${kind}`, () => {
    const draws: Array<{ text: string; y: number; size: number }> = [];
    const context = {
      font: '',
      clearRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      fill() {},
      stroke() {},
      save() {},
      restore() {},
      createLinearGradient: () => ({ addColorStop() {} }),
      measureText(text: string) {
        return {
          width: text.length * Number(this.font.match(/\d+/)?.[0]) * 0.5,
        };
      },
      fillText(text: string, _x: number, y: number) {
        draws.push({ text, y, size: Number(this.font.match(/\d+/)?.[0]) });
      },
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      context as unknown as CanvasRenderingContext2D
    );
    const poi = getTestCareerPois().find(
      (entry) => entry.career.id === 'southern-mississippi'
    )!;
    if (kind === 'plaque') {
      const texture = createPoiLabelTexture(poi);
      texture.dispose();
    } else {
      const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
      camera.position.set(0, 0, 10);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      const tooltip = new PoiWorldTooltip({ parent: new Scene(), camera });
      tooltip.setActiveFloorId('basement');
      tooltip.setSelected({
        poi,
        floorId: 'basement',
        getAnchorPosition: (out: Vector3) => out.set(0, 0, 0),
      });
      tooltip.update(1);
      tooltip.dispose();
    }
    expect(draws.map(({ text }) => text).join(' ')).toBe(
      'The University of Southern Mississippi'
    );
    expect(draws).toHaveLength(2);
    const [top, bottom] = kind === 'plaque' ? [24, 168] : [64, 192];
    for (const draw of draws) {
      expect(draw.y - draw.size / 2).toBeGreaterThanOrEqual(top);
      expect(draw.y + draw.size / 2).toBeLessThanOrEqual(bottom);
    }
  });
}
