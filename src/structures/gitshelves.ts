import {
  BoxGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface GitshelvesInstallationBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface GitshelvesInstallationOptions {
  position: { x: number; y?: number; z: number };
  orientationRadians?: number;
  columns?: number;
  rows?: number;
}

interface CommitCell {
  mesh: Mesh;
  material: MeshStandardMaterial;
  baseY: number;
  offset: number;
}

function createLabelTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create gitshelves label context.');
  }

  context.fillStyle = '#07111f';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, '#10243d');
  gradient.addColorStop(1, '#061320');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#7de3ff';
  context.font = '600 120px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.fillText('Gitshelves Commit Array', 64, 180);

  context.fillStyle = '#aeefff';
  context.font = '48px "Inter", "Segoe UI", sans-serif';
  context.fillText('Auto-sculpted streak shelves rendered nightly', 64, 280);

  context.fillStyle = '#4cbbff';
  context.font = '44px "JetBrains Mono", "Fira Code", monospace';
  context.fillText('sync: github.com/futuroptimist/gitshelves', 64, 360);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createOrientedCollider(
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

export function createGitshelvesInstallation(
  options: GitshelvesInstallationOptions
): GitshelvesInstallationBuild {
  const { position, orientationRadians = 0, columns = 6, rows = 4 } = options;

  const basePosition = new Vector3(position.x, position.y ?? 0, position.z);

  const group = new Group();
  group.name = 'GitshelvesInstallation';
  group.position.copy(basePosition);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];
  const commitCells: CommitCell[] = [];

  const baseHeight = 0.22;
  const baseWidth = Math.max(2.2, columns * 0.34 + 0.8);
  const baseDepth = 1.1;

  const baseMaterial = new MeshStandardMaterial({
    color: new Color(0x121b29),
    roughness: 0.6,
    metalness: 0.22,
  });
  const base = new Mesh(
    new BoxGeometry(baseWidth, baseHeight, baseDepth),
    baseMaterial
  );
  base.name = 'GitshelvesBase';
  base.position.set(0, baseHeight / 2, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const pedestalMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2637),
    roughness: 0.46,
    metalness: 0.28,
  });
  const pedestal = new Mesh(
    new BoxGeometry(baseWidth * 0.82, baseHeight * 0.85, baseDepth * 0.62),
    pedestalMaterial
  );
  pedestal.name = 'GitshelvesPedestal';
  pedestal.position.set(
    0,
    baseHeight + pedestal.geometry.parameters.height / 2,
    0.04
  );
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  const panelHeight = rows * 0.36 + 1.1;
  const panelWidth = columns * 0.34 + 0.8;
  const panelThickness = 0.12;
  const panelMaterial = new MeshStandardMaterial({
    color: new Color(0x0c1626),
    roughness: 0.42,
    metalness: 0.18,
  });
  const panel = new Mesh(
    new BoxGeometry(panelWidth, panelHeight, panelThickness),
    panelMaterial
  );
  panel.name = 'GitshelvesPanel';
  panel.position.set(
    0,
    baseHeight + panelHeight / 2 + 0.1,
    -baseDepth / 2 + panelThickness / 2
  );
  panel.receiveShadow = true;
  group.add(panel);

  const railMaterial = new MeshStandardMaterial({
    color: new Color(0x1f3752),
    emissive: new Color(0x0d89ff),
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.38,
  });

  const railGeometry = new BoxGeometry(0.08, panelHeight * 0.88, 0.08);
  const railOffsetX = panelWidth / 2 - 0.16;
  const railZ = panel.position.z + panelThickness / 2 + 0.02;
  ['Left', 'Right'].forEach((label, index) => {
    const rail = new Mesh(railGeometry, railMaterial.clone());
    rail.name = `GitshelvesRail${label}`;
    rail.position.set(
      index === 0 ? -railOffsetX : railOffsetX,
      panel.position.y,
      railZ
    );
    rail.castShadow = true;
    group.add(rail);
  });

  const headerMaterial = new MeshStandardMaterial({
    color: new Color(0x123044),
    emissive: new Color(0x0f9bff),
    emissiveIntensity: 0.55,
    roughness: 0.28,
    metalness: 0.36,
  });
  const header = new Mesh(
    new BoxGeometry(panelWidth * 0.92, 0.16, 0.1),
    headerMaterial
  );
  header.name = 'GitshelvesHeader';
  header.position.set(
    0,
    panel.position.y + panelHeight / 2 - 0.18,
    railZ + 0.02
  );
  group.add(header);

  const labelTexture = createLabelTexture();
  const labelMaterial = new MeshBasicMaterial({
    map: labelTexture,
    transparent: true,
    side: DoubleSide,
  });
  const label = new Mesh(
    new PlaneGeometry(panelWidth * 0.86, 0.78),
    labelMaterial
  );
  label.name = 'GitshelvesLabel';
  label.position.set(0, header.position.y + 0.56, railZ + 0.05);
  label.renderOrder = 10;
  group.add(label);

  const shelfMaterial = new MeshStandardMaterial({
    color: new Color(0x152132),
    roughness: 0.4,
    metalness: 0.24,
  });
  const shelfGeometry = new BoxGeometry(panelWidth * 0.86, 0.06, 0.4);

  for (let row = 0; row < rows; row += 1) {
    const shelf = new Mesh(shelfGeometry, shelfMaterial);
    shelf.name = `GitshelvesShelf-${row}`;
    const shelfY = baseHeight + 0.32 + row * 0.34;
    shelf.position.set(0, shelfY, railZ);
    shelf.castShadow = true;
    group.add(shelf);
  }

  const commitGeometry = new BoxGeometry(0.26, 0.12, 0.26);
  const palette = [0x6ff7ff, 0x8affe8, 0x7cd2ff, 0x65a9ff, 0x7bffcc, 0x9bf4ff];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const paletteColor = palette[(row + column) % palette.length];
      const material = new MeshStandardMaterial({
        color: new Color(paletteColor).multiplyScalar(0.6),
        emissive: new Color(paletteColor),
        emissiveIntensity: 0.35,
        roughness: 0.32,
        metalness: 0.42,
      });
      const commit = new Mesh(commitGeometry, material);
      commit.name = `GitshelvesCommit-${row}-${column}`;
      const offsetX = (column - (columns - 1) / 2) * 0.32;
      const offsetY = baseHeight + 0.44 + row * 0.34;
      commit.position.set(offsetX, offsetY, railZ + 0.14);
      commit.castShadow = true;
      commitCells.push({
        mesh: commit,
        material,
        baseY: offsetY,
        offset: row * 0.55 + column * 0.34,
      });
      group.add(commit);
    }
  }

  const spotlightMaterial = new MeshStandardMaterial({
    color: new Color(0x1c3048),
    emissive: new Color(0x2cb2ff),
    emissiveIntensity: 0.4,
    roughness: 0.28,
    metalness: 0.34,
  });
  const spotlight = new Mesh(
    new BoxGeometry(panelWidth * 0.74, 0.08, 0.18),
    spotlightMaterial
  );
  spotlight.name = 'GitshelvesSpotlight';
  spotlight.position.set(0, baseHeight + 0.26, railZ + 0.05);
  group.add(spotlight);

  colliders.push(
    createOrientedCollider(
      basePosition,
      baseWidth + 0.4,
      baseDepth + 0.4,
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
    const intensityScale = MathUtils.lerp(
      1,
      1.75,
      MathUtils.clamp(emphasis, 0, 1)
    );
    commitCells.forEach((cell, index) => {
      const wave = Math.sin(elapsed * 2.2 + cell.offset + index * 0.05);
      const normalized = (wave + 1) / 2;
      const emissive = MathUtils.lerp(0.25, 1.1, normalized) * intensityScale;
      cell.material.emissiveIntensity = emissive;
      const bounce = Math.sin(elapsed * 3.1 + cell.offset) * 0.02 * emphasis;
      cell.mesh.position.y = cell.baseY + bounce;
    });

    const headerPulse = (Math.sin(elapsed * 1.8) + 1) / 2;
    headerMaterial.emissiveIntensity =
      MathUtils.lerp(0.35, 1.1, headerPulse) * intensityScale;
    spotlightMaterial.emissiveIntensity =
      MathUtils.lerp(0.28, 0.95, (Math.sin(elapsed * 2.5 + 0.6) + 1) / 2) *
      MathUtils.lerp(1, 1.4, emphasis);
  };

  return { group, colliders, update };
}
