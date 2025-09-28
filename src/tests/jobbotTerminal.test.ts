import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { createJobbotTerminal } from '../structures/jobbotTerminal';

function createMockContext(): CanvasRenderingContext2D {
  const gradient = { addColorStop: vi.fn() };
  return {
    fillStyle: '',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalAlpha: 1,
    fillRect: vi.fn(),
    fillText: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
  } as unknown as CanvasRenderingContext2D;
}

describe('JobbotTerminal structure', () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockContext());
  });

  afterAll(() => {
    getContextSpy.mockRestore();
  });

  it('creates terminal geometry and collider footprint', () => {
    const build = createJobbotTerminal({
      position: { x: 12, z: -1 },
      orientationRadians: Math.PI / 2,
    });

    expect(build.group.name).toBe('JobbotTerminal');
    expect(build.group.position.x).toBeCloseTo(12);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI / 2);

    expect(build.colliders).toHaveLength(1);
    const collider = build.colliders[0];
    expect(collider.minX).toBeLessThan(collider.maxX);
    expect(collider.minZ).toBeLessThan(collider.maxZ);
    expect(collider.minX).toBeLessThanOrEqual(12);
    expect(collider.maxX).toBeGreaterThanOrEqual(12);
    expect(collider.minZ).toBeLessThanOrEqual(-1);
    expect(collider.maxZ).toBeGreaterThanOrEqual(-1);

    expect(build.group.getObjectByName('JobbotTerminalScreen')).toBeInstanceOf(Mesh);
    expect(build.group.getObjectByName('JobbotTerminalHologram')).toBeInstanceOf(Group);
  });

  it('responds to emphasis updates with animated materials', () => {
    const build = createJobbotTerminal({ position: { x: 0, z: 0 } });
    const screen = build.group.getObjectByName('JobbotTerminalScreen') as Mesh;
    const hologramCore = build.group.getObjectByName('JobbotTerminalCore') as Mesh;
    const ticker = build.group.getObjectByName('JobbotTerminalTicker') as Mesh;

    const screenMaterial = screen.material as MeshBasicMaterial;
    const coreMaterial = hologramCore.material as MeshStandardMaterial;
    const tickerMaterial = ticker.material as MeshBasicMaterial;

    build.update({ elapsed: 0, delta: 0.016, emphasis: 0 });
    const initialScreenOpacity = screenMaterial.opacity;
    const initialCoreIntensity = coreMaterial.emissiveIntensity;
    const initialTickerOpacity = tickerMaterial.opacity;

    build.update({ elapsed: 1.5, delta: 0.016, emphasis: 1 });
    expect(screenMaterial.opacity).toBeGreaterThanOrEqual(initialScreenOpacity);
    expect(coreMaterial.emissiveIntensity).toBeGreaterThan(initialCoreIntensity);
    expect(tickerMaterial.opacity).toBeGreaterThanOrEqual(initialTickerOpacity);
  });
});
