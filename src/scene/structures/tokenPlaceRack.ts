import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface TokenPlaceRackBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface TokenPlaceRackOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  tiers?: number;
}

interface LedNode {
  material: MeshStandardMaterial;
  offset: number;
}

function createCollider(
  center: Vector3,
  width: number,
  depth: number,
  rotation: number
): RectCollider {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const corners = [
    new Vector3(-halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, -halfDepth),
    new Vector3(halfWidth, 0, halfDepth),
    new Vector3(-halfWidth, 0, halfDepth),
  ];

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  corners.forEach((corner) => {
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  });

  return { minX, maxX, minZ, maxZ };
}

export function createTokenPlaceRack(
  options: TokenPlaceRackOptions
): TokenPlaceRackBuild {
  const { position, orientationRadians = 0, tiers = 3 } = options;
  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'TokenPlaceRack';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];
  const ledNodes: LedNode[] = [];

  const baseWidth = 1.6;
  const baseDepth = 0.9;
  const baseHeight = 0.18;

  const platformMaterial = new MeshStandardMaterial({
    color: new Color(0x131c24),
    roughness: 0.6,
    metalness: 0.18,
  });
  const platform = new Mesh(
    new BoxGeometry(baseDepth, baseHeight, baseWidth),
    platformMaterial
  );
  platform.name = 'TokenPlaceRackPlatform';
  platform.position.set(0, baseHeight / 2, 0);
  group.add(platform);

  const columnMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2a36),
    roughness: 0.42,
    metalness: 0.28,
  });
  const columnGeometry = new CylinderGeometry(
    0.08,
    0.08,
    tiers * 0.42 + 0.4,
    12
  );
  const columnOffsets: Array<[number, number]> = [
    [-baseDepth / 2 + 0.12, -baseWidth / 2 + 0.14],
    [baseDepth / 2 - 0.12, -baseWidth / 2 + 0.14],
    [-baseDepth / 2 + 0.12, baseWidth / 2 - 0.14],
    [baseDepth / 2 - 0.12, baseWidth / 2 - 0.14],
  ];
  columnOffsets.forEach(([offsetX, offsetZ], index) => {
    const column = new Mesh(columnGeometry, columnMaterial);
    column.name = `TokenPlaceRackColumn-${index}`;
    column.position.set(offsetX, columnGeometry.parameters.height / 2, offsetZ);
    group.add(column);
  });

  const trayMaterial = new MeshStandardMaterial({
    color: new Color(0x171f2a),
    roughness: 0.46,
    metalness: 0.24,
  });
  const trayGeometry = new BoxGeometry(
    baseDepth * 0.88,
    0.06,
    baseWidth * 0.86
  );

  const nodeMaterial = new MeshStandardMaterial({
    color: new Color(0x1d5b3d),
    emissive: new Color(0x0a3324),
    emissiveIntensity: 0.24,
    roughness: 0.36,
    metalness: 0.28,
  });
  const nodeGeometry = new BoxGeometry(0.18, 0.04, 0.28);
  const nodesPerTier = 4;

  const ledGeometry = new SphereGeometry(0.05, 12, 12);

  for (let tier = 0; tier < tiers; tier += 1) {
    const tray = new Mesh(trayGeometry, trayMaterial);
    tray.name = `TokenPlaceRackTray-${tier}`;
    tray.position.set(0, baseHeight + tier * 0.42 + 0.2, 0);
    group.add(tray);

    for (let node = 0; node < nodesPerTier; node += 1) {
      const lateral = node - (nodesPerTier - 1) / 2;
      const nodeMesh = new Mesh(nodeGeometry, nodeMaterial.clone());
      nodeMesh.name = `TokenPlaceNode-${tier}-${node}`;
      nodeMesh.position.set(0, tray.position.y + 0.12, lateral * 0.36);
      tray.add(nodeMesh);

      const ledMaterial = new MeshStandardMaterial({
        color: new Color(0x33f5ff),
        emissive: new Color(0x129dff),
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.4,
      });
      const led = new Mesh(ledGeometry, ledMaterial);
      led.name = `TokenPlaceNodeLed-${tier}-${node}`;
      led.position.set(nodeGeometry.parameters.width / 2 + 0.08, 0.04, 0);
      nodeMesh.add(led);
      ledNodes.push({
        material: ledMaterial,
        offset: tier * 0.9 + node * 0.35,
      });
    }
  }

  const fanMaterial = new MeshStandardMaterial({
    color: new Color(0x121c29),
    emissive: new Color(0x0c3e73),
    emissiveIntensity: 0.28,
    roughness: 0.4,
    metalness: 0.26,
  });
  const fanGeometry = new CylinderGeometry(0.34, 0.34, 0.08, 24);
  const fan = new Mesh(fanGeometry, fanMaterial);
  fan.name = 'TokenPlaceRackCoolingFan';
  fan.rotation.z = Math.PI / 2;
  fan.position.set(-baseDepth / 2 + 0.14, baseHeight + tiers * 0.42 + 0.24, 0);
  group.add(fan);

  const colliderCenter = new Vector3(basePosition.x, 0, basePosition.z);
  colliders.push(
    createCollider(
      colliderCenter,
      baseDepth + 0.4,
      baseWidth + 0.4,
      orientationRadians
    )
  );

  const update = ({
    elapsed,
    emphasis,
  }: {
    elapsed: number;
    delta: number;
    emphasis: number;
  }) => {
    ledNodes.forEach((node, index) => {
      const pulse = Math.max(
        0,
        Math.sin(elapsed * 3.2 + node.offset + index * 0.1)
      );
      const intensity = MathUtils.lerp(0.35, 1.2, pulse);
      node.material.emissiveIntensity =
        intensity * MathUtils.lerp(1, 1.8, emphasis);
    });

    const spin = (elapsed * 1.6) % (Math.PI * 2);
    fan.rotation.y = spin;
  };

  return { group, colliders, update };
}
