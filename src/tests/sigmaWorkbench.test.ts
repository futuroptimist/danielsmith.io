import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSigmaWorkbench } from '../scene/structures/sigmaWorkbench';

type CapturingContext = CanvasRenderingContext2D & {
  fillTextCalls: string[];
};

const contexts: CapturingContext[] = [];

const createMockContext = (canvas: HTMLCanvasElement): CapturingContext => {
  const fillTextCalls: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillText: vi.fn((text: string) => {
      fillTextCalls.push(text);
    }),
    fillTextCalls,
  } as Partial<CapturingContext>;
  Object.defineProperty(context, 'canvas', { value: canvas });
  return context as CapturingContext;
};

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      if (type !== '2d') {
        return null;
      }
      const context = createMockContext(this);
      contexts.push(context);
      return context;
    },
  });
});

beforeEach(() => {
  contexts.length = 0;
});

describe('createSigmaWorkbench', () => {
  it('builds fabrication bench geometry with hologram signage', () => {
    const build = createSigmaWorkbench({
      position: { x: 0, z: 0 },
      orientationRadians: Math.PI / 4,
    });

    expect(build.group.name).toBe('SigmaWorkbench');
    expect(build.colliders).toHaveLength(1);
    expect(build.colliders[0].minX).toBeLessThan(build.colliders[0].maxX);

    const pinCore = build.group.getObjectByName('SigmaWorkbenchPinCore');
    expect(pinCore).toBeInstanceOf(Mesh);

    const hologram = build.group.getObjectByName('SigmaWorkbenchHologram');
    expect(hologram).toBeInstanceOf(Mesh);

    const printedText = contexts.flatMap((ctx) => ctx.fillTextCalls);
    expect(printedText).toContain('Sigma Fabrication Bench');
    expect(printedText).toContain('Sigma AI Pin');
  });

  it('animates hologram, pin, and motion hardware under emphasis', () => {
    const build = createSigmaWorkbench({ position: { x: 0, z: 0 } });
    const pinCore = build.group.getObjectByName(
      'SigmaWorkbenchPinCore'
    ) as Mesh;
    const pinMaterial = pinCore.material as MeshStandardMaterial;
    const hologram = build.group.getObjectByName(
      'SigmaWorkbenchHologram'
    ) as Mesh;
    const hologramMaterial = hologram.material as MeshBasicMaterial;
    const hologramGlow = build.group.getObjectByName(
      'SigmaWorkbenchHologramGlow'
    ) as Mesh;
    const hologramGlowMaterial = hologramGlow.material as MeshBasicMaterial;
    const armPivot = build.group.getObjectByName(
      'SigmaWorkbenchArmPivot'
    ) as Group;
    const edgeStrip = build.group.getObjectByName(
      'SigmaWorkbenchEdgeStrip-0'
    ) as Mesh;
    const edgeMaterial = edgeStrip.material as MeshStandardMaterial;
    const spoolGroup = build.group.getObjectByName(
      'SigmaWorkbenchSpoolGroup'
    ) as Group;

    build.update({ elapsed: 0.2, delta: 0.2, emphasis: 0 });
    const baselinePin = pinMaterial.emissiveIntensity;
    const baselineEdge = edgeMaterial.emissiveIntensity;
    const initialRotation = spoolGroup.rotation.y;

    build.update({ elapsed: 1.2, delta: 0.6, emphasis: 1 });

    expect(pinMaterial.emissiveIntensity).toBeGreaterThan(baselinePin);
    expect(edgeMaterial.emissiveIntensity).toBeGreaterThan(baselineEdge);
    expect(hologramMaterial.opacity).toBeGreaterThan(0.2);
    expect(hologramGlowMaterial.opacity).toBeGreaterThan(0.05);
    expect(hologram.visible).toBe(true);
    expect(armPivot.rotation.y).not.toBe(0);
    expect(spoolGroup.rotation.y).toBeGreaterThan(initialRotation);
  });

  it('keeps hologram hidden without emphasis and supports delta-free updates', () => {
    const build = createSigmaWorkbench({ position: { x: 0, z: 0 } });
    const hologram = build.group.getObjectByName(
      'SigmaWorkbenchHologram'
    ) as Mesh;
    const pinHalo = build.group.getObjectByName(
      'SigmaWorkbenchPinHalo'
    ) as Mesh;
    const pinHaloMaterial = pinHalo.material as MeshBasicMaterial;
    const spoolGroup = build.group.getObjectByName(
      'SigmaWorkbenchSpoolGroup'
    ) as Group;

    build.update({ elapsed: 0.5, delta: 0.4, emphasis: 0 });
    expect(hologram.visible).toBe(false);
    const previousHaloOpacity = pinHaloMaterial.opacity;

    build.update({ elapsed: 1.5, delta: 0, emphasis: 0 });

    expect(pinHaloMaterial.opacity).toBeCloseTo(previousHaloOpacity);
    expect(spoolGroup.rotation.y).toBeCloseTo(1.5 * 0.4);
  });
});
