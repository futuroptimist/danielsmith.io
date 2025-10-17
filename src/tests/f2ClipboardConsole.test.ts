import {
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Texture,
} from 'three';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type SpyInstance,
} from 'vitest';

import { createF2ClipboardConsole } from '../scene/structures/f2ClipboardConsole';

interface CapturedContext extends CanvasRenderingContext2D {
  fillTextCalls: string[];
}

const contexts: CapturedContext[] = [];

function createMockContext(canvas: HTMLCanvasElement): CapturedContext {
  const fillTextCalls: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn((text: string) => {
      fillTextCalls.push(text);
    }),
    stroke: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as Partial<CapturedContext>;
  Object.defineProperty(context, 'canvas', { value: canvas });
  Object.defineProperty(context, 'fillTextCalls', { value: fillTextCalls });
  return context as CapturedContext;
}

describe('createF2ClipboardConsole', () => {
  let getContextSpy: SpyInstance<
    [contextId: string, ...args: unknown[]],
    RenderingContext | null
  >;

  beforeAll(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(function (this: HTMLCanvasElement, type: string) {
        if (type !== '2d') {
          return null;
        }
        const context = createMockContext(this);
        contexts.push(context);
        return context;
      });
  });

  beforeEach(() => {
    contexts.length = 0;
  });

  afterEach(() => {
    getContextSpy.mockReset();
    getContextSpy.mockImplementation(function (
      this: HTMLCanvasElement,
      type: string
    ) {
      if (type !== '2d') {
        return null;
      }
      const context = createMockContext(this);
      contexts.push(context);
      return context;
    });
    delete document.documentElement.dataset.accessibilityPulseScale;
  });

  afterAll(() => {
    getContextSpy.mockRestore();
  });

  it('builds kitchen diagnostics console geometry', () => {
    const build = createF2ClipboardConsole({
      position: { x: 4, z: 6 },
      orientationRadians: Math.PI / 3,
    });

    expect(build.group.name).toBe('F2ClipboardConsole');
    expect(build.group.position.x).toBeCloseTo(4);
    expect(build.group.rotation.y).toBeCloseTo(Math.PI / 3);

    expect(build.colliders).toHaveLength(1);
    const collider = build.colliders[0];
    expect(collider.minX).toBeLessThan(collider.maxX);
    expect(collider.minZ).toBeLessThan(collider.maxZ);

    expect(build.group.getObjectByName('F2ClipboardScreen')).toBeInstanceOf(
      Mesh
    );
    expect(build.group.getObjectByName('F2ClipboardTicker')).toBeInstanceOf(
      Mesh
    );
    expect(build.group.getObjectByName('F2ClipboardLogCard-0')).toBeInstanceOf(
      Mesh
    );

    const capturedText = contexts.flatMap((ctx) => ctx.fillTextCalls);
    expect(capturedText).toContain('f2clipboard');
    expect(capturedText).toContain('Incident digest pipeline');
    expect(capturedText).toContain('Queue synced');
  });

  it('animates hologram and ticker with emphasis changes', () => {
    const build = createF2ClipboardConsole({ position: { x: 0, z: 0 } });
    const ticker = build.group.getObjectByName('F2ClipboardTicker') as Mesh;
    const tickerMaterial = ticker.material as MeshBasicMaterial & {
      map?: Texture;
    };
    const ring = build.group.getObjectByName('F2ClipboardRing') as Mesh;
    const logCard = build.group.getObjectByName('F2ClipboardLogCard-1') as Mesh;
    const logMaterial = logCard.material as MeshBasicMaterial;
    const screen = build.group.getObjectByName('F2ClipboardScreen') as Mesh;
    const screenMaterial = screen.material as MeshBasicMaterial;

    const initialOpacity = tickerMaterial.opacity;
    const initialRingOpacity = (ring.material as MeshBasicMaterial).opacity;
    const initialLogY = logCard.position.y;

    build.update({ elapsed: 0.5, delta: 0.5, emphasis: 0 });
    const offsetBefore = tickerMaterial.map?.offset.x ?? 0;

    build.update({ elapsed: 1, delta: 0.5, emphasis: 1 });
    build.update({ elapsed: 1.5, delta: 0.5, emphasis: 1 });

    expect(tickerMaterial.opacity).toBeGreaterThan(initialOpacity);
    expect(screenMaterial.opacity).toBeGreaterThan(0.62);
    expect((ring.material as MeshBasicMaterial).opacity).toBeGreaterThan(
      initialRingOpacity
    );
    expect(tickerMaterial.map?.offset.x ?? 0).not.toBeCloseTo(offsetBefore);
    expect(logMaterial.opacity).toBeGreaterThan(0.2);
    expect(logCard.position.y).not.toBeCloseTo(initialLogY);
  });

  it('dampens hover motion when pulse scale is zero', () => {
    document.documentElement.dataset.accessibilityPulseScale = '0';
    const build = createF2ClipboardConsole({ position: { x: 0, z: 0 } });
    const logCard = build.group.getObjectByName('F2ClipboardLogCard-2') as Mesh;
    const ticker = build.group.getObjectByName('F2ClipboardTicker') as Mesh;
    const tickerMaterial = ticker.material as MeshBasicMaterial & {
      map?: Texture;
    };
    const beam = build.group.getObjectByName('F2ClipboardBeam') as Mesh;
    const beamMaterial = beam.material as MeshStandardMaterial;

    build.update({ elapsed: 0.4, delta: 0.016, emphasis: 0.6 });
    const baseY = logCard.position.y;
    const baseOpacity = tickerMaterial.opacity;
    const baseIntensity = beamMaterial.emissiveIntensity;

    build.update({ elapsed: 0.8, delta: 0.016, emphasis: 0.6 });

    expect(logCard.position.y).toBeCloseTo(baseY, 5);
    expect(Math.abs(tickerMaterial.opacity - baseOpacity)).toBeLessThan(0.01);
    expect(
      Math.abs(beamMaterial.emissiveIntensity - baseIntensity)
    ).toBeLessThan(0.02);
  });

  it('throws when canvas context is unavailable', () => {
    getContextSpy.mockImplementationOnce(() => null);
    expect(() =>
      createF2ClipboardConsole({ position: { x: 0, z: 0 } })
    ).toThrowError('Unable to create f2clipboard screen texture.');
  });
});
