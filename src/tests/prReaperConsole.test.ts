import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
  type SpyInstance,
} from 'vitest';

import { createPrReaperConsole } from '../scene/structures/prReaperConsole';

const gradientStub = { addColorStop: vi.fn() };

function createMockContext(this: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => gradientStub),
    createRadialGradient: vi.fn(() => gradientStub),
    fillStyle: '',
    strokeStyle: '',
    font: '',
    globalAlpha: 1,
    textAlign: 'left',
    textBaseline: 'alphabetic',
  } as Partial<CanvasRenderingContext2D>;
  Object.defineProperty(context, 'canvas', { value: this });
  return context as CanvasRenderingContext2D;
}

describe('createPrReaperConsole', () => {
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
        return createMockContext.call(this);
      });
  });

  afterEach(() => {
    getContextSpy.mockClear();
    delete document.documentElement.dataset.accessibilityPulseScale;
  });

  afterAll(() => {
    getContextSpy.mockRestore();
  });

  it('builds the console with expected structure and colliders respecting rotation', () => {
    const position = { x: 6.6, z: 19.6 };
    const orientation = Math.PI * 0.35;
    const console = createPrReaperConsole({
      position,
      orientationRadians: orientation,
    });

    expect(console.group.name).toBe('PrReaperConsole');
    expect(
      console.group.getObjectByName('PrReaperConsoleScreen')
    ).toBeInstanceOf(Mesh);
    expect(
      console.group.getObjectByName('PrReaperConsoleHologram')
    ).toBeInstanceOf(Mesh);
    expect(
      console.group.getObjectByName('PrReaperConsoleWalkway')
    ).toBeInstanceOf(Mesh);
    expect(
      console.group.getObjectByName('PrReaperConsoleLogPanel')
    ).toBeInstanceOf(Mesh);
    expect(
      console.group.getObjectByName('PrReaperConsoleLogTicker')
    ).toBeInstanceOf(Mesh);

    expect(console.colliders).toHaveLength(2);
    const [deckCollider, walkwayCollider] = console.colliders;

    const deckCenterX = (deckCollider.minX + deckCollider.maxX) / 2;
    const deckCenterZ = (deckCollider.minZ + deckCollider.maxZ) / 2;
    expect(deckCenterX).toBeCloseTo(position.x, 6);
    expect(deckCenterZ).toBeCloseTo(position.z, 6);

    const walkwayCenterX = (walkwayCollider.minX + walkwayCollider.maxX) / 2;
    const walkwayCenterZ = (walkwayCollider.minZ + walkwayCollider.maxZ) / 2;
    const walkwayOffset = 1.6 / 2 + 0.7 / 2 - 0.12;
    const expectedWalkwayX = position.x + Math.sin(orientation) * walkwayOffset;
    const expectedWalkwayZ = position.z + Math.cos(orientation) * walkwayOffset;
    expect(walkwayCenterX).toBeCloseTo(expectedWalkwayX, 6);
    expect(walkwayCenterZ).toBeCloseTo(expectedWalkwayZ, 6);
    expect(walkwayCenterX).not.toBeCloseTo(deckCenterX, 6);
    expect(walkwayCenterZ).not.toBeCloseTo(deckCenterZ, 6);
  });

  it('animates hologram elements and emissive surfaces based on emphasis', () => {
    const console = createPrReaperConsole({ position: { x: 0, z: 0 } });
    const screen = console.group.getObjectByName(
      'PrReaperConsoleScreen'
    ) as Mesh;
    const bridge = console.group.getObjectByName(
      'PrReaperConsoleBridge'
    ) as Mesh;
    const hologram = console.group.getObjectByName(
      'PrReaperConsoleHologram'
    ) as Mesh;
    const intake = console.group.getObjectByName(
      'PrReaperConsoleIntake'
    ) as Mesh;
    const sweep = console.group.getObjectByName('PrReaperConsoleSweep') as Mesh;
    const walkway = console.group.getObjectByName(
      'PrReaperConsoleWalkway'
    ) as Mesh;
    const caution = console.group.getObjectByName(
      'PrReaperConsoleCautionStrip'
    ) as Mesh;

    const screenMaterial = screen.material as MeshStandardMaterial;
    const bridgeMaterial = bridge.material as MeshStandardMaterial;
    const hologramMaterial = hologram.material as MeshStandardMaterial;
    const intakeMaterial = intake.material as MeshStandardMaterial;
    const sweepMaterial = sweep.material as MeshBasicMaterial;
    const walkwayMaterial = walkway.material as MeshStandardMaterial;
    const cautionMaterial = caution.material as MeshBasicMaterial;

    console.update({ elapsed: 0.5, delta: 0.016, emphasis: 0 });
    const baselineScreen = screenMaterial.emissiveIntensity;
    const baselineBridge = bridgeMaterial.emissiveIntensity;
    const baselineHologram = hologramMaterial.emissiveIntensity;
    const baselineIntake = intakeMaterial.emissiveIntensity;
    const baselineOpacity = sweepMaterial.opacity;

    const baselineWalkway = walkwayMaterial.emissiveIntensity;
    const baselineCaution = cautionMaterial.opacity;

    document.documentElement.dataset.accessibilityPulseScale = '0';
    console.update({ elapsed: 1.5, delta: 0.016, emphasis: 0 });
    const reducedWalkwayBaseline = walkwayMaterial.emissiveIntensity;
    const reducedCautionBaseline = cautionMaterial.opacity;
    expect(reducedWalkwayBaseline).toBeLessThanOrEqual(baselineWalkway);
    expect(reducedCautionBaseline).toBeLessThanOrEqual(baselineCaution);

    console.update({ elapsed: 2.5, delta: 0.016, emphasis: 0.8 });
    const dampenedWalkway = walkwayMaterial.emissiveIntensity;
    const dampenedCaution = cautionMaterial.opacity;
    expect(dampenedWalkway).toBeGreaterThan(reducedWalkwayBaseline);
    expect(dampenedCaution).toBeGreaterThan(reducedCautionBaseline);

    delete document.documentElement.dataset.accessibilityPulseScale;
    console.update({ elapsed: 3.5, delta: 0.016, emphasis: 0.8 });
    expect(screenMaterial.emissiveIntensity).toBeGreaterThan(baselineScreen);
    expect(bridgeMaterial.emissiveIntensity).toBeGreaterThan(baselineBridge);
    expect(hologramMaterial.emissiveIntensity).toBeGreaterThan(
      baselineHologram
    );
    expect(intakeMaterial.emissiveIntensity).toBeGreaterThan(baselineIntake);
    expect(sweepMaterial.opacity).toBeGreaterThan(baselineOpacity);
    expect(sweep.rotation.z).not.toBe(0);
    expect(walkwayMaterial.emissiveIntensity).toBeGreaterThan(dampenedWalkway);
    expect(cautionMaterial.opacity).toBeGreaterThan(dampenedCaution);
  });

  it('drives the severity indicator ring with emphasis and calm-mode damping', () => {
    const console = createPrReaperConsole({ position: { x: 0, z: 0 } });
    const segments = [0, 1, 2].map((index) => {
      const segment = console.group.getObjectByName(
        `PrReaperSeveritySegment-${index}`
      );
      expect(segment).toBeInstanceOf(Mesh);
      return segment as Mesh;
    });

    const materials = segments.map(
      (mesh) => mesh.material as MeshStandardMaterial
    );
    const baseIntensities = materials.map((material) => {
      return material.emissiveIntensity;
    });
    const baseOpacities = materials.map((material) => material.opacity ?? 0);

    console.update({ elapsed: 0.6, delta: 0.016, emphasis: 0.6 });
    const activeIntensities = materials.map(
      (material) => material.emissiveIntensity
    );
    activeIntensities.forEach((value, index) => {
      expect(value).toBeGreaterThan(baseIntensities[index]);
      expect(materials[index].opacity ?? 0).toBeGreaterThan(
        baseOpacities[index]
      );
    });

    document.documentElement.dataset.accessibilityPulseScale = '0';
    console.update({ elapsed: 1.6, delta: 0.016, emphasis: 0.6 });
    const dampedIntensities = materials.map(
      (material) => material.emissiveIntensity
    );
    dampedIntensities.forEach((value, index) => {
      expect(value).toBeLessThanOrEqual(activeIntensities[index]);
    });

    delete document.documentElement.dataset.accessibilityPulseScale;
    console.update({ elapsed: 2.6, delta: 0.016, emphasis: 0.9 });
    const restoredIntensities = materials.map(
      (material) => material.emissiveIntensity
    );
    restoredIntensities.forEach((value, index) => {
      expect(value).toBeGreaterThan(dampedIntensities[index]);
    });
    expect(restoredIntensities[2]).toBeGreaterThan(baseIntensities[2]);
  });

  it('animates log review surfaces with ticker scroll and emphasis glow', () => {
    const console = createPrReaperConsole({ position: { x: 0, z: 0 } });
    const panel = console.group.getObjectByName(
      'PrReaperConsoleLogPanel'
    ) as Mesh;
    const ticker = console.group.getObjectByName(
      'PrReaperConsoleLogTicker'
    ) as Mesh;

    const panelMaterial = panel.material as MeshBasicMaterial;
    const tickerMaterial = ticker.material as MeshBasicMaterial;

    expect(panelMaterial.map).toBeDefined();
    expect(tickerMaterial.map).toBeDefined();

    const initialPanelOffset = panelMaterial.map?.offset.y ?? 0;
    const initialTickerOffset = tickerMaterial.map?.offset.x ?? 0;
    const basePanelOpacity = panelMaterial.opacity;
    const baseTickerOpacity = tickerMaterial.opacity;

    console.update({ elapsed: 0.6, delta: 0.016, emphasis: 0.1 });
    const midPanelOffset = panelMaterial.map?.offset.y ?? 0;
    const midTickerOffset = tickerMaterial.map?.offset.x ?? 0;
    expect(midPanelOffset).not.toBeCloseTo(initialPanelOffset);
    expect(midTickerOffset).not.toBeCloseTo(initialTickerOffset);

    console.update({ elapsed: 1.6, delta: 0.016, emphasis: 0.85 });
    const emphasizedPanelOpacity = panelMaterial.opacity;
    const emphasizedTickerOpacity = tickerMaterial.opacity;
    expect(emphasizedPanelOpacity).toBeGreaterThan(basePanelOpacity);
    expect(emphasizedTickerOpacity).toBeGreaterThan(baseTickerOpacity);

    document.documentElement.dataset.accessibilityPulseScale = '0';
    console.update({ elapsed: 2.6, delta: 0.016, emphasis: 0.15 });
    const calmPanelOffset = panelMaterial.map?.offset.y ?? 0;
    const calmTickerOffset = tickerMaterial.map?.offset.x ?? 0;
    expect(calmPanelOffset).not.toBeCloseTo(midPanelOffset);
    expect(calmTickerOffset).not.toBeCloseTo(midTickerOffset);
    expect(panelMaterial.opacity).toBeLessThanOrEqual(emphasizedPanelOpacity);
    expect(tickerMaterial.opacity).toBeLessThanOrEqual(emphasizedTickerOpacity);
  });
});
