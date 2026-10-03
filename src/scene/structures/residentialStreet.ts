import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Shape,
  SpotLight,
  SRGBColorSpace,
  Vector3,
} from 'three';

import type { ExteriorStrings } from '../../assets/i18n/exterior';
import { assertDebugColliderId } from '../debug/colliderDebugIds';
import { getDebugHash } from '../debug/debugIds';
import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import type { FloorDefinition } from '../level/schema';
import { BUS_STOP, PARKED_EV, STREET_LAMPS } from '../level/streetLayout';

import type { ExteriorSolid } from './residentialExterior';

export interface StreetSolid extends ExteriorSolid {
  role: string;
  debugId: string;
}

export interface StreetSnapshot {
  busStop: {
    id: string;
    availability: string;
    signText: string;
  };
  lamps: Array<{
    id: string;
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    angle: number;
    castShadow: boolean;
    active: boolean;
    groundPoolVisible: boolean;
    hoodOpaque: boolean;
  }>;
  carBounds: ExteriorSolid['collider'];
  lifecycle: {
    isDisposed: boolean;
    geometries: number;
    materials: number;
    textures: number;
  };
}

/** Original low-poly assets. Repeated fixtures share geometry, materials and instances. */
export function createResidentialStreet(
  floor: FloorDefinition,
  scale: number,
  initialStrings: ExteriorStrings
) {
  const group = new Group();
  group.name = 'ResidentialStreet';
  const geometry = new BoxGeometry(1, 1, 1);
  const wheelGeometry = new CylinderGeometry(1, 1, 1, 12);
  const poolGeometry = new CircleGeometry(1, 24);
  const undersideGeometry = new PlaneGeometry(1, 1);
  const signGeometry = new PlaneGeometry(3.6, 1.4);
  const materials = {
    metal: new MeshStandardMaterial({
      color: 0x526775,
      roughness: 0.65,
      metalness: 0.35,
    }),
    roof: new MeshStandardMaterial({ color: 0x354552, roughness: 0.7 }),
    wood: new MeshStandardMaterial({ color: 0x947555, roughness: 0.9 }),
    body: new MeshStandardMaterial({
      color: 0x839d99,
      emissive: 0x3a514d,
      emissiveIntensity: 0.65,
      roughness: 0.4,
      metalness: 0.45,
    }),
    glass: new MeshStandardMaterial({
      color: 0x172934,
      emissive: 0x132532,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.15,
    }),
    tire: new MeshStandardMaterial({ color: 0x171e24, roughness: 1 }),
    light: new MeshBasicMaterial({ color: 0xffebc3 }),
    headlight: new MeshBasicMaterial({ color: 0xc2eff2 }),
    tail: new MeshBasicMaterial({ color: 0xb44f4c }),
    pool: new MeshBasicMaterial({
      color: 0xffe2a5,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  };
  type Palette = keyof typeof materials;
  const parts: Array<{
    palette: Palette;
    source: string;
    high: boolean;
    position: [number, number, number];
    size: [number, number, number];
  }> = [];
  const solids: StreetSolid[] = [];
  const identity = (sourceId: string, role: string) => ({
    role,
    debugId: assertDebugColliderId(getDebugHash(`${sourceId}|${role}`)),
  });
  const sourceObject = (kind: string) =>
    floor.sceneObjects!.find((object) => object.kind === kind)!;
  const car = sourceObject('street.ev');
  const lamps = sourceObject('street.lamps');
  const shelter = sourceObject('street.busStop');
  const add = (
    palette: Palette,
    source: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    high = false
  ) =>
    parts.push({ palette, source, position: [x, y, z], size: [w, h, d], high });
  const annotate = (mesh: Mesh, sourceId: string, high = false) => {
    mesh.userData.levelSourceId = sourceId;
    mesh.userData.levelSource = { sourceId, sourceType: 'sceneObject' };
    mesh.userData.collisionPolicy = high ? 'decorativeNoCollision' : 'solid';
    mesh.userData.nonPhysicalCollider = high;
    mesh.userData.collisionRationale = high
      ? 'Above avatar headroom or a flush downward light pool; source-owned posts remain solid.'
      : 'Source-backed solid with a conservative collision footprint.';
  };
  const carX = PARKED_EV.x * scale;
  const carZ = PARKED_EV.z * scale;
  const carBounds = {
    minX: carX - PARKED_EV.width / 2,
    maxX: carX + PARKED_EV.width / 2,
    minZ: carZ - PARKED_EV.depth / 2,
    maxZ: carZ + PARKED_EV.depth / 2,
  };
  solids.push({
    ...identity(car.sourceId, 'parked-sedan-body'),
    definition: car,
    collider: carBounds,
  });
  const profile = (
    points: number[][],
    width: number,
    material: MeshStandardMaterial,
    name: string
  ) => {
    const shape = new Shape();
    points.forEach(([z, y], index) =>
      index ? shape.lineTo(z, y) : shape.moveTo(z, y)
    );
    shape.closePath();
    const geo = new ExtrudeGeometry(shape, {
      depth: width,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.07,
      bevelThickness: 0.05,
      curveSegments: 1,
    });
    geo.rotateY(Math.PI / 2);
    geo.translate(-width / 2, 0, 0);
    const mesh = new Mesh(geo, material);
    mesh.position.set(carX, 0, carZ);
    mesh.name = name;
    annotate(mesh, car.sourceId);
    group.add(mesh);
    return geo;
  };
  const bodyGeometry = profile(
    [
      [-4, 0.35],
      [-4.1, 0.72],
      [-3.35, 1.04],
      [-1.8, 1.13],
      [2.8, 1.02],
      [4.1, 0.73],
      [3.9, 0.35],
    ],
    3.5,
    materials.body,
    'Original2040SedanBody'
  );
  const cabinGeometry = profile(
    [
      [-2.6, 1.04],
      [-1.5, 1.83],
      [1.45, 1.83],
      [2.5, 1.03],
    ],
    2.8,
    materials.glass,
    'FourDoorSedanCabin'
  );
  const wheels = new InstancedMesh(wheelGeometry, materials.tire, 4);
  const hubs = new InstancedMesh(wheelGeometry, materials.metal, 4);
  const transform = new Object3D();
  let wheelIndex = 0;
  for (const side of [-1, 1])
    for (const z of [-2.6, 2.6]) {
      transform.position.set(carX + side * 1.72, 0.66, carZ + z);
      transform.rotation.set(0, 0, Math.PI / 2);
      transform.scale.set(0.66, 0.44, 0.66);
      transform.updateMatrix();
      wheels.setMatrixAt(wheelIndex, transform.matrix);
      transform.position.x = carX + side * 1.955;
      transform.scale.set(0.37, 0.035, 0.37);
      transform.updateMatrix();
      hubs.setMatrixAt(wheelIndex++, transform.matrix);
    }
  for (const mesh of [wheels, hubs]) {
    annotate(mesh, car.sourceId);
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  for (const side of [-1, 1]) {
    for (const z of [-1.35, 1.35])
      add(
        'metal',
        car.sourceId,
        carX + side * 1.8,
        1.02,
        carZ + z,
        0.07,
        0.07,
        0.45
      );
    add('body', car.sourceId, carX + side * 1.43, 1.43, carZ, 0.09, 0.73, 0.16);
    add(
      'body',
      car.sourceId,
      carX + side * 2.01,
      1.2,
      carZ + 1.9,
      0.4,
      0.22,
      0.48
    );
    add(
      'metal',
      car.sourceId,
      carX + side * 1.81,
      0.68,
      carZ,
      0.04,
      0.64,
      0.035
    );
  }
  add('headlight', car.sourceId, carX, 0.76, carZ + 4.16, 3.25, 0.08, 0.06);
  add('tail', car.sourceId, carX, 0.7, carZ - 4.15, 3.25, 0.07, 0.06);
  const spotlights: SpotLight[] = [];
  const pools = new InstancedMesh(
    poolGeometry,
    materials.pool,
    STREET_LAMPS.z.length
  );
  pools.name = 'StreetLampDownwardPools';
  const undersides = new InstancedMesh(
    undersideGeometry,
    materials.light,
    STREET_LAMPS.z.length
  );
  STREET_LAMPS.z.forEach((planZ, index) => {
    const x = STREET_LAMPS.x * scale;
    const z = planZ * scale;
    const headX = x - 2.4;
    const y = STREET_LAMPS.height;
    add('metal', lamps.sourceId, x, y / 2, z, 0.22, y, 0.22);
    add('metal', lamps.sourceId, x, 0.15, z, 0.7, 0.3, 0.7);
    add('metal', lamps.sourceId, x - 1.2, y - 0.1, z, 2.6, 0.18, 0.18, true);
    add('metal', lamps.sourceId, headX, y, z, 1.5, 0.24, 1.05, true);
    solids.push({
      ...identity(lamps.sourceId, `lamp-pole-${index + 1}`),
      definition: lamps,
      collider: {
        minX: x - 0.35,
        maxX: x + 0.35,
        minZ: z - 0.35,
        maxZ: z + 0.35,
      },
    });
    transform.rotation.set(-Math.PI / 2, 0, 0);
    transform.position.set(headX, 0.012, z);
    transform.scale.set(3.8, 3.8, 1);
    transform.updateMatrix();
    pools.setMatrixAt(index, transform.matrix);
    // Single-sided emissive underside faces down; opaque housing masks all upward rays.
    transform.rotation.set(Math.PI / 2, 0, 0);
    transform.position.set(headX, y - 0.125, z);
    transform.scale.set(1.18, 0.74, 1);
    transform.updateMatrix();
    undersides.setMatrixAt(index, transform.matrix);
    const light = new SpotLight(0xffe7bd, 20, 11, Math.PI / 5, 0.7, 2);
    light.name = `ShieldedStreetLamp:${index + 1}`;
    light.position.set(headX, y - 0.16, z);
    light.target.position.set(headX, 0, z);
    light.castShadow = false;
    light.visible = false;
    group.add(light, light.target);
    spotlights.push(light);
  });
  for (const mesh of [pools, undersides]) {
    annotate(mesh, lamps.sourceId, true);
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  // Open-front shelter: full-height posts and bench are the only pedestrian obstacles.
  for (const x of [46.4, 51.6])
    for (const z of [26.4, 37.6]) {
      add('metal', shelter.sourceId, x, 2.2, z, 0.22, 4.4, 0.22);
      add('metal', shelter.sourceId, x, 0.1, z, 0.4, 0.2, 0.4);
      solids.push({
        ...identity(
          shelter.sourceId,
          `shelter-post-${x === 46.4 ? 'west' : 'east'}-${z === 26.4 ? 'south' : 'north'}`
        ),
        definition: shelter,
        collider: {
          minX: x - 0.2,
          maxX: x + 0.2,
          minZ: z - 0.2,
          maxZ: z + 0.2,
        },
      });
    }
  add('roof', shelter.sourceId, 49, 4.5, 32, 6.2, 0.25, 12.1, true);
  add('wood', shelter.sourceId, 48.1, 0.74, 32, 1.3, 0.18, 4.6);
  add('wood', shelter.sourceId, 47.5, 1.2, 32, 0.18, 0.85, 4.6);
  for (const z of [30.3, 33.7])
    add('metal', shelter.sourceId, 48.1, 0.35, z, 1.1, 0.7, 0.18);
  solids.push({
    ...identity(shelter.sourceId, 'shelter-bench'),
    definition: shelter,
    collider: { minX: 47.2, maxX: 48.8, minZ: 29.6, maxZ: 34.4 },
  });
  // The forward fascia keeps the world sign inside the close isometric view.
  const signZ = BUS_STOP.z * scale + 4.7;
  add('metal', shelter.sourceId, 51.76, 3.72, signZ, 0.16, 1.55, 3.8, true);
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const signMaterial = new MeshBasicMaterial({ map: texture });
  const sign = new Mesh(signGeometry, signMaterial);
  sign.name = 'BusStopComingSoonSign';
  sign.rotation.y = Math.PI / 2;
  sign.position.set(51.85, 3.72, signZ);
  annotate(sign, shelter.sourceId, true);
  group.add(sign);
  let signText = '';
  function setStrings(strings: ExteriorStrings) {
    const text = `${strings.busStop} · ${strings.comingSoon}`;
    if (text === signText) return;
    signText = text;
    sign.userData.accessibleText = text;
    if (!context) return;
    context.fillStyle = '#182b36';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const line = (value: string, y: number, size: number, color: string) => {
      context.font = `600 ${size}px system-ui, sans-serif`;
      while (context.measureText(value).width > 712 && size > 18)
        context.font = `600 ${--size}px system-ui, sans-serif`;
      context.fillStyle = color;
      context.fillText(value, 384, y);
    };
    line(strings.busStop, 79, 52, '#c4d6d6');
    line(strings.comingSoon, 190, 72, '#ffdeb0');
    texture.needsUpdate = true;
  }
  setStrings(initialStrings);
  const batches = new Map<string, typeof parts>();
  parts.forEach((part) => {
    const key = `${part.source}|${part.palette}|${part.high}`;
    const batch = batches.get(key) ?? [];
    batch.push(part);
    batches.set(key, batch);
  });
  const instances: InstancedMesh[] = [wheels, hubs, pools, undersides];
  for (const batch of batches.values()) {
    const first = batch[0];
    const mesh = new InstancedMesh(
      geometry,
      materials[first.palette],
      batch.length
    );
    mesh.name = `Street:${first.source}:${first.palette}:${first.high ? 'overhead' : 'solid'}`;
    annotate(mesh, first.source, first.high);
    mesh.userData.parts = batch;
    batch.forEach((part, index) => {
      transform.rotation.set(0, 0, 0);
      transform.position.set(...part.position);
      transform.scale.set(...part.size);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
    });
    mesh.computeBoundingSphere();
    group.add(mesh);
    instances.push(mesh);
  }
  const geometries = [
    geometry,
    wheelGeometry,
    poolGeometry,
    undersideGeometry,
    signGeometry,
    bodyGeometry,
    cabinGeometry,
  ];
  let disposed = false;
  function update(
    policy: SceneDetailPolicy,
    occupant: { x: number; z: number; floorId: string }
  ) {
    const insideShelter =
      occupant.floorId === 'ground' &&
      occupant.x > 45.5 &&
      occupant.x < 53 &&
      occupant.z > 25.5 &&
      occupant.z < 38.5;
    const opacity = insideShelter ? 0.2 : 1;
    if (materials.roof.opacity !== opacity) {
      materials.roof.opacity = opacity;
      materials.roof.transparent = insideShelter;
      materials.roof.depthWrite = !insideShelter;
      materials.roof.needsUpdate = true;
    }
    const nearby = occupant.floorId === 'ground' && occupant.x > 45;
    const dynamic = nearby && policy.effects.dynamicPointLights;
    // Keep the authored downward footprint continuous across the proximity and
    // quality boundary. Realtime light augments it rather than replacing it.
    spotlights.forEach((light) => {
      light.visible = dynamic;
    });
  }
  function getSnapshot(): StreetSnapshot {
    group.updateMatrixWorld(true);
    return {
      busStop: {
        id: BUS_STOP.id,
        availability: BUS_STOP.availability,
        signText,
      },
      carBounds: { ...carBounds },
      lamps: spotlights.map((light) => ({
        id: light.name,
        position: light.getWorldPosition(new Vector3()),
        target: light.target.getWorldPosition(new Vector3()),
        angle: light.angle,
        castShadow: light.castShadow,
        active: light.visible,
        groundPoolVisible: pools.visible,
        hoodOpaque:
          !materials.metal.transparent && materials.metal.opacity === 1,
      })),
      lifecycle: {
        isDisposed: disposed,
        geometries: geometries.length,
        materials: Object.keys(materials).length + 1,
        textures: 1,
      },
    };
  }
  return {
    group,
    solids,
    setStrings,
    update,
    getSnapshot,
    getCutawaySourceIds: () =>
      materials.roof.opacity < 1 ? [shelter.sourceId] : [],
    dispose() {
      if (disposed) return;
      disposed = true;
      instances.forEach((mesh) => mesh.dispose());
      geometries.forEach((geo) => geo.dispose());
      Object.values(materials).forEach((material) => material.dispose());
      signMaterial.dispose();
      texture.dispose();
      spotlights.forEach((light) => light.dispose());
      group.clear();
      group.removeFromParent();
    },
  };
}
