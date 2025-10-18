import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
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

import { createJobbotTerminal } from '../scene/structures/jobbotTerminal';

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
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('JobbotTerminal structure', () => {
  let getContextSpy: SpyInstance<
    [contextId: string, ...args: unknown[]],
    RenderingContext | null
  >;

  beforeAll(() => {
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(() => createMockContext());
  });

  afterAll(() => {
    getContextSpy.mockRestore();
  });

  afterEach(() => {
    delete document.documentElement.dataset.accessibilityPulseScale;
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

    expect(build.group.getObjectByName('JobbotTerminalScreen')).toBeInstanceOf(
      Mesh
    );
    expect(
      build.group.getObjectByName('JobbotTerminalHologram')
    ).toBeInstanceOf(Group);

    const shardGroup = build.group.getObjectByName(
      'JobbotTerminalDataShards'
    ) as Group;
    expect(shardGroup).toBeInstanceOf(Group);
    expect(shardGroup.children).toHaveLength(6);
    shardGroup.children.forEach((child) => {
      expect(child).toBeInstanceOf(Mesh);
    });

    const telemetryGroup = build.group.getObjectByName(
      'JobbotTerminalTelemetryGroup'
    ) as Group;
    expect(telemetryGroup).toBeInstanceOf(Group);
    expect(telemetryGroup.children.length).toBeGreaterThanOrEqual(3);
    telemetryGroup.children.forEach((child) => {
      expect(child).toBeInstanceOf(Mesh);
    });
    expect(
      build.group.getObjectByName('JobbotTerminalTelemetryAura')
    ).toBeInstanceOf(Mesh);
  });

  it('responds to emphasis updates with animated materials', () => {
    const build = createJobbotTerminal({ position: { x: 0, z: 0 } });
    const screen = build.group.getObjectByName('JobbotTerminalScreen') as Mesh;
    const hologramCore = build.group.getObjectByName(
      'JobbotTerminalCore'
    ) as Mesh;
    const ticker = build.group.getObjectByName('JobbotTerminalTicker') as Mesh;
    const telemetryGroup = build.group.getObjectByName(
      'JobbotTerminalTelemetryGroup'
    ) as Group;
    const telemetryPanel = build.group.getObjectByName(
      'JobbotTerminalTelemetry-0'
    ) as Mesh;
    const shard = build.group.getObjectByName(
      'JobbotTerminalDataShard-0'
    ) as Mesh;

    const screenMaterial = screen.material as MeshBasicMaterial;
    const coreMaterial = hologramCore.material as MeshStandardMaterial;
    const tickerMaterial = ticker.material as MeshBasicMaterial;
    const telemetryMaterial = telemetryPanel.material as MeshBasicMaterial;
    const shardMaterial = shard.material as MeshStandardMaterial;

    build.update({ elapsed: 0, delta: 0.016, emphasis: 0 });
    const initialScreenOpacity = screenMaterial.opacity;
    const initialCoreIntensity = coreMaterial.emissiveIntensity;
    const initialTickerOpacity = tickerMaterial.opacity;
    const initialTelemetryOpacity = telemetryMaterial.opacity;
    const initialTelemetryRotation = telemetryGroup.rotation.y;
    const initialShardPosition = shard.position.clone();
    const initialShardIntensity = shardMaterial.emissiveIntensity;
    const initialShardOpacity = shardMaterial.opacity;

    build.update({ elapsed: 1.5, delta: 0.016, emphasis: 1 });
    expect(screenMaterial.opacity).toBeGreaterThanOrEqual(initialScreenOpacity);
    expect(coreMaterial.emissiveIntensity).toBeGreaterThan(
      initialCoreIntensity
    );
    expect(tickerMaterial.opacity).toBeGreaterThanOrEqual(initialTickerOpacity);
    expect(telemetryMaterial.opacity).toBeGreaterThanOrEqual(
      initialTelemetryOpacity
    );
    expect(telemetryGroup.rotation.y).toBeGreaterThan(initialTelemetryRotation);
    expect(shard.position.distanceTo(initialShardPosition)).toBeGreaterThan(
      0.001
    );
    expect(shardMaterial.emissiveIntensity).toBeGreaterThan(
      initialShardIntensity
    );
    expect(shardMaterial.opacity).toBeGreaterThanOrEqual(initialShardOpacity);
  });

  it('reduces hologram flicker when pulse scale is disabled', () => {
    const build = createJobbotTerminal({ position: { x: 0, z: 0 } });
    const ticker = build.group.getObjectByName('JobbotTerminalTicker') as Mesh;
    const beacon = build.group.getObjectByName('JobbotTerminalBeacon-0') as
      | Mesh
      | undefined;
    const telemetryPanel = build.group.getObjectByName(
      'JobbotTerminalTelemetry-1'
    ) as Mesh;
    const shard = build.group.getObjectByName(
      'JobbotTerminalDataShard-1'
    ) as Mesh;

    expect(ticker).toBeInstanceOf(Mesh);
    expect(beacon).toBeInstanceOf(Mesh);
    expect(telemetryPanel).toBeInstanceOf(Mesh);
    expect(shard).toBeInstanceOf(Mesh);

    const tickerMaterial = ticker.material as MeshBasicMaterial;
    const beaconMaterial = (beacon!.material as MeshStandardMaterial)!;
    const telemetryMaterial = telemetryPanel.material as MeshBasicMaterial;
    const shardMaterial = shard.material as MeshStandardMaterial;

    document.documentElement.dataset.accessibilityPulseScale = '0';

    build.update({ elapsed: 0.8, delta: 0.016, emphasis: 0.6 });
    const steadyTicker = tickerMaterial.opacity;
    const steadyBeacon = beaconMaterial.emissiveIntensity;
    const steadyHeight = beacon!.position.y;
    const steadyTelemetry = telemetryMaterial.opacity;
    const steadyShardPosition = shard.position.clone();
    const steadyShardIntensity = shardMaterial.emissiveIntensity;
    const steadyShardOpacity = shardMaterial.opacity;

    build.update({ elapsed: 1.6, delta: 0.016, emphasis: 0.6 });

    expect(tickerMaterial.opacity).toBeCloseTo(steadyTicker, 5);
    expect(beaconMaterial.emissiveIntensity).toBeCloseTo(steadyBeacon, 5);
    expect(beacon!.position.y).toBeCloseTo(steadyHeight, 5);
    expect(telemetryMaterial.opacity).toBeCloseTo(steadyTelemetry, 5);
    expect(shard.position.distanceTo(steadyShardPosition)).toBeLessThan(0.002);
    expect(shardMaterial.emissiveIntensity).toBeCloseTo(
      steadyShardIntensity,
      5
    );
    expect(shardMaterial.opacity).toBeCloseTo(steadyShardOpacity, 5);
  });
});
