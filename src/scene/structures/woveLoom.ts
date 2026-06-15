import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';

import type { RectCollider } from '../collision';

export interface WoveLoomBuild {
  group: Group;
  colliders: RectCollider[];
  update(context: { elapsed: number; delta: number; emphasis: number }): void;
}

export interface WoveLoomOptions {
  position: { x: number; z: number; y?: number };
  orientationRadians?: number;
}

interface GlowPanel {
  material: MeshBasicMaterial;
  baseOpacity: number;
}

interface EmissiveSurface {
  material: MeshStandardMaterial;
  baseIntensity: number;
}

interface WarpThreadState {
  mesh: Mesh;
  baseX: number;
  phaseOffset: number;
}

interface ShuttleState {
  mesh: Mesh;
  baseX: number;
  baseY: number;
  amplitude: number;
  speed: number;
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

  for (const corner of corners) {
    const worldX = center.x + corner.x * cos - corner.z * sin;
    const worldZ = center.z + corner.x * sin + corner.z * cos;
    minX = Math.min(minX, worldX);
    maxX = Math.max(maxX, worldX);
    minZ = Math.min(minZ, worldZ);
    maxZ = Math.max(maxZ, worldZ);
  }

  return { minX, maxX, minZ, maxZ };
}

export function createWoveLoom(options: WoveLoomOptions): WoveLoomBuild {
  const { position, orientationRadians = 0 } = options;
  const baseY = position.y ?? 0;
  const basePosition = new Vector3(position.x, baseY, position.z);
  const group = new Group();
  group.name = 'WoveLoom';
  group.position.set(position.x, baseY, position.z);
  group.rotation.y = orientationRadians;

  const colliders: RectCollider[] = [];
  const emissiveSurfaces: EmissiveSurface[] = [];
  const glowPanels: GlowPanel[] = [];
  const warpThreads: WarpThreadState[] = [];

  const daisHeight = 0.14;
  const tableHeight = 0.26;
  const frameHeight = 1.6;
  const tableWidth = 2.4;
  const tableDepth = 1.26;

  const dais = new Mesh(
    new CylinderGeometry(tableWidth * 0.62, tableWidth * 0.62, daisHeight, 24),
    new MeshStandardMaterial({
      color: new Color(0x0e1723),
      roughness: 0.52,
      metalness: 0.2,
    })
  );
  dais.name = 'WoveLoomDais';
  dais.position.set(0, daisHeight / 2, 0);
  group.add(dais);

  const daisGlow = new Mesh(
    new CylinderGeometry(tableWidth * 0.68, tableWidth * 0.68, 0.01, 32),
    new MeshBasicMaterial({
      color: new Color(0x56d9ff),
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    })
  );
  daisGlow.name = 'WoveLoomDaisGlow';
  daisGlow.position.set(0, daisHeight + 0.015, 0);
  daisGlow.renderOrder = 8;
  group.add(daisGlow);
  glowPanels.push({
    material: daisGlow.material as MeshBasicMaterial,
    baseOpacity: (daisGlow.material as MeshBasicMaterial).opacity ?? 0,
  });

  const table = new Mesh(
    new BoxGeometry(tableWidth, tableHeight, tableDepth),
    new MeshStandardMaterial({
      color: new Color(0x152232),
      roughness: 0.46,
      metalness: 0.24,
    })
  );
  table.name = 'WoveLoomTable';
  table.position.set(0, daisHeight + tableHeight / 2, 0);
  group.add(table);

  const tableInset = new Mesh(
    new BoxGeometry(tableWidth * 0.92, 0.08, tableDepth * 0.82),
    new MeshStandardMaterial({
      color: new Color(0x0f1824),
      emissive: new Color(0x1f3f5f),
      emissiveIntensity: 0.32,
      roughness: 0.3,
      metalness: 0.3,
    })
  );
  tableInset.name = 'WoveLoomTableInset';
  tableInset.position.set(
    0,
    daisHeight + tableHeight + 0.04,
    tableDepth * 0.08
  );
  group.add(tableInset);

  const frameGroup = new Group();
  frameGroup.name = 'WoveLoomFrame';
  frameGroup.position.set(0, daisHeight + tableHeight, -tableDepth * 0.08);
  group.add(frameGroup);

  const frameMaterial = new MeshStandardMaterial({
    color: new Color(0x1b2d44),
    roughness: 0.34,
    metalness: 0.36,
  });
  const postGeometry = new BoxGeometry(0.16, frameHeight, 0.22);
  const postOffsets: Array<[number, number]> = [
    [-tableWidth * 0.42, 0],
    [tableWidth * 0.42, 0],
  ];
  postOffsets.forEach(([offsetX, offsetZ], index) => {
    const post = new Mesh(postGeometry, frameMaterial);
    post.name = `WoveLoomPost-${index}`;
    post.position.set(offsetX, frameHeight / 2, offsetZ);
    frameGroup.add(post);
  });

  const crossbarMaterial = new MeshStandardMaterial({
    color: new Color(0x1f3852),
    roughness: 0.32,
    metalness: 0.38,
  });
  const crossbar = new Mesh(
    new BoxGeometry(tableWidth * 0.9, 0.12, 0.18),
    crossbarMaterial
  );
  crossbar.name = 'WoveLoomCrossbarTop';
  crossbar.position.set(0, frameHeight - 0.08, 0);
  frameGroup.add(crossbar);

  const lowerCrossbar = new Mesh(
    new BoxGeometry(tableWidth * 0.9, 0.12, 0.18),
    crossbarMaterial
  );
  lowerCrossbar.name = 'WoveLoomCrossbarBottom';
  lowerCrossbar.position.set(0, frameHeight * 0.28, 0.04);
  frameGroup.add(lowerCrossbar);

  const spoolMaterial = new MeshStandardMaterial({
    color: new Color(0x152b3b),
    emissive: new Color(0x2bcfff),
    emissiveIntensity: 0.3,
    roughness: 0.28,
    metalness: 0.54,
  });
  const spool = new Mesh(
    new CylinderGeometry(0.22, 0.22, tableWidth * 0.72, 32),
    spoolMaterial
  );
  spool.name = 'WoveLoomSpool';
  spool.rotation.z = Math.PI / 2;
  spool.position.set(0, frameHeight - 0.18, 0.02);
  frameGroup.add(spool);

  const spoolHalo = new Mesh(
    new CylinderGeometry(0.26, 0.26, tableWidth * 0.78, 48),
    new MeshBasicMaterial({
      color: new Color(0x6cf6ff),
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    })
  );
  spoolHalo.name = 'WoveLoomSpoolHalo';
  spoolHalo.rotation.z = spool.rotation.z;
  spoolHalo.position.copy(spool.position);
  spoolHalo.renderOrder = 9;
  frameGroup.add(spoolHalo);
  glowPanels.push({
    material: spoolHalo.material as MeshBasicMaterial,
    baseOpacity: (spoolHalo.material as MeshBasicMaterial).opacity ?? 0,
  });

  const warpCount = 8;
  const warpSpan = tableWidth * 0.78;
  const warpHeight = frameHeight * 0.92;
  const warpMaterial = new MeshStandardMaterial({
    color: new Color(0xcaf3ff),
    emissive: new Color(0x4fc1ff),
    emissiveIntensity: 0.38,
    roughness: 0.18,
    metalness: 0.24,
  });

  for (let i = 0; i < warpCount; i += 1) {
    const thread = new Mesh(
      new BoxGeometry(0.025, warpHeight, 0.012),
      warpMaterial.clone()
    );
    thread.name = `WoveLoomWarpThread-${i}`;
    const ratio = warpCount <= 1 ? 0.5 : i / (warpCount - 1);
    const offsetX = -warpSpan / 2 + ratio * warpSpan;
    thread.position.set(offsetX, warpHeight / 2, 0.06);
    frameGroup.add(thread);
    const material = thread.material as MeshStandardMaterial;
    emissiveSurfaces.push({
      material,
      baseIntensity: material.emissiveIntensity ?? 1,
    });
    warpThreads.push({
      mesh: thread,
      baseX: thread.position.x,
      phaseOffset: i * 0.55,
    });
  }

  const clothMaterial = new MeshStandardMaterial({
    color: new Color(0x1a3242),
    emissive: new Color(0x226c91),
    emissiveIntensity: 0.24,
    roughness: 0.34,
    metalness: 0.22,
  });
  const cloth = new Mesh(
    new PlaneGeometry(tableWidth * 0.82, 0.68),
    clothMaterial
  );
  cloth.name = 'WoveLoomCloth';
  cloth.rotation.x = -Math.PI / 2;
  cloth.position.set(0, daisHeight + tableHeight + 0.36, 0.32);
  cloth.renderOrder = 6;
  group.add(cloth);
  emissiveSurfaces.push({
    material: cloth.material as MeshStandardMaterial,
    baseIntensity:
      (cloth.material as MeshStandardMaterial).emissiveIntensity ?? 1,
  });

  const clothGlow = new Mesh(
    new PlaneGeometry(tableWidth * 0.86, 0.72),
    new MeshBasicMaterial({
      color: new Color(0x3ed9ff),
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
    })
  );
  clothGlow.name = 'WoveLoomClothGlow';
  clothGlow.rotation.copy(cloth.rotation);
  clothGlow.position.copy(cloth.position).setY(cloth.position.y + 0.02);
  clothGlow.renderOrder = 7;
  group.add(clothGlow);
  glowPanels.push({
    material: clothGlow.material as MeshBasicMaterial,
    baseOpacity: (clothGlow.material as MeshBasicMaterial).opacity ?? 0,
  });

  const shuttleMaterial = new MeshStandardMaterial({
    color: new Color(0xfff3d6),
    emissive: new Color(0xffd67f),
    emissiveIntensity: 0.42,
    roughness: 0.28,
    metalness: 0.16,
  });
  const shuttle = new Mesh(new BoxGeometry(0.48, 0.08, 0.18), shuttleMaterial);
  shuttle.name = 'WoveLoomShuttle';
  shuttle.position.set(0, daisHeight + tableHeight + 0.26, 0.18);
  shuttle.castShadow = false;
  group.add(shuttle);
  emissiveSurfaces.push({
    material: shuttleMaterial,
    baseIntensity: shuttleMaterial.emissiveIntensity ?? 1,
  });

  const shuttleGlow = new Mesh(
    new PlaneGeometry(0.72, 0.32),
    new MeshBasicMaterial({
      color: new Color(0xffd9a1),
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    })
  );
  shuttleGlow.name = 'WoveLoomShuttleGlow';
  shuttleGlow.rotation.x = -Math.PI / 2;
  shuttleGlow.position.set(
    shuttle.position.x,
    shuttle.position.y - 0.04,
    shuttle.position.z
  );
  shuttleGlow.renderOrder = 9;
  group.add(shuttleGlow);
  glowPanels.push({
    material: shuttleGlow.material as MeshBasicMaterial,
    baseOpacity: (shuttleGlow.material as MeshBasicMaterial).opacity ?? 0,
  });

  const shuttleState: ShuttleState = {
    mesh: shuttle,
    baseX: shuttle.position.x,
    baseY: shuttle.position.y,
    amplitude: tableWidth * 0.32,
    speed: 1.2,
  };

  colliders.push(
    createCollider(
      new Vector3(basePosition.x, 0, basePosition.z),
      tableWidth * 0.95,
      tableDepth * 0.9,
      orientationRadians
    )
  );
  colliders.push(
    createCollider(
      new Vector3(basePosition.x, 0, basePosition.z + 0.32),
      tableWidth * 0.7,
      0.6,
      orientationRadians
    )
  );

  return {
    group,
    colliders,
    update: ({ elapsed, delta, emphasis }) => {
      const clampedEmphasis = MathUtils.clamp(emphasis, 0, 1);
      const spinSpeed = MathUtils.lerp(0.8, 2.6, clampedEmphasis);
      spool.rotation.x += spinSpeed * delta;

      const pulse = 0.2 + Math.sin(elapsed * 2.3) * 0.1;
      const threadIntensity = MathUtils.clamp(
        0.28 + clampedEmphasis * 0.9 + pulse * (0.3 + clampedEmphasis * 0.4),
        0.1,
        2
      );
      emissiveSurfaces.forEach(({ material, baseIntensity }) => {
        material.emissiveIntensity = baseIntensity * threadIntensity;
      });

      const weaveSpeed = MathUtils.lerp(1.05, 2.4, clampedEmphasis);
      const weavePhase = elapsed * weaveSpeed;
      const weaveAmplitude = MathUtils.lerp(0.02, 0.07, clampedEmphasis);
      const weaveScale = MathUtils.lerp(0.02, 0.14, clampedEmphasis);
      warpThreads.forEach(({ mesh, baseX, phaseOffset }) => {
        const phase = weavePhase + phaseOffset;
        mesh.position.x = baseX + Math.sin(phase) * weaveAmplitude;
        mesh.scale.y = 1 + Math.sin(phase * 1.6) * weaveScale;
      });

      const glowOpacity = MathUtils.clamp(
        0.04 + clampedEmphasis * 0.3 + pulse * 0.08,
        0,
        0.9
      );
      glowPanels.forEach(({ material, baseOpacity }) => {
        material.opacity = Math.min(1, baseOpacity + glowOpacity);
      });

      const shuttlePhase =
        elapsed * (shuttleState.speed + clampedEmphasis * 1.1);
      const travel = shuttleState.amplitude * (0.4 + clampedEmphasis * 0.6);
      shuttleState.mesh.position.x =
        shuttleState.baseX + Math.sin(shuttlePhase) * travel;
      shuttleState.mesh.position.y =
        shuttleState.baseY + Math.cos(shuttlePhase * 0.8) * 0.04;
    },
  };
}
