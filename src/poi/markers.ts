import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

import type { PoiDefinition } from './types';

export interface PoiInstance {
  definition: PoiDefinition;
  group: Group;
  orb: Mesh;
  orbMaterial: MeshStandardMaterial;
  orbBaseHeight: number;
  accentMaterial: MeshStandardMaterial;
  label: Mesh;
  labelMaterial: MeshBasicMaterial;
  labelBaseHeight: number;
  labelWorldPosition: Vector3;
  floatPhase: number;
  floatSpeed: number;
  floatAmplitude: number;
  halo: Mesh;
  haloMaterial: MeshBasicMaterial;
  collider: { minX: number; maxX: number; minZ: number; maxZ: number };
  activation: number;
  pulseOffset: number;
  hitArea: Mesh;
  focus: number;
  focusTarget: number;
}

export function createPoiInstances(
  definitions: PoiDefinition[]
): PoiInstance[] {
  return definitions.map((definition, index) =>
    createPoiInstance(definition, index * Math.PI * 0.37)
  );
}

function createPoiInstance(
  definition: PoiDefinition,
  phaseOffset: number
): PoiInstance {
  const group = new Group();
  group.name = `POI:${definition.id}`;
  group.position.set(
    definition.position.x,
    definition.position.y,
    definition.position.z
  );
  group.rotation.y = definition.headingRadians ?? 0;

  const baseHeight = 0.32;
  const baseRadiusX = definition.footprint.width / 2;
  const baseRadiusZ = definition.footprint.depth / 2;
  const baseGeometry = new CylinderGeometry(
    baseRadiusX,
    baseRadiusX,
    baseHeight,
    28
  );
  const baseMaterial = new MeshStandardMaterial({
    color: new Color(0x1a2431),
    roughness: 0.42,
    metalness: 0.18,
  });
  const base = new Mesh(baseGeometry, baseMaterial);
  base.position.y = baseHeight / 2;
  group.add(base);

  const accentHeight = 0.08;
  const accentGeometry = new CylinderGeometry(
    baseRadiusX * 0.85,
    baseRadiusX * 0.85,
    accentHeight,
    28
  );
  const accentMaterial = new MeshStandardMaterial({
    color: new Color(0x3bb7ff),
    emissive: new Color(0x1073ff),
    emissiveIntensity: 0.65,
    roughness: 0.28,
    metalness: 0.2,
  });
  const accent = new Mesh(accentGeometry, accentMaterial);
  accent.position.y = baseHeight + accentHeight / 2;
  group.add(accent);

  const orbRadius = Math.min(baseRadiusX, baseRadiusZ) * 0.45;
  const orbGeometry = new SphereGeometry(orbRadius, 32, 32);
  const orbMaterial = new MeshStandardMaterial({
    color: new Color(0xb8f3ff),
    emissive: new Color(0x3de1ff),
    emissiveIntensity: 0.9,
    roughness: 0.22,
    metalness: 0.18,
  });
  const orb = new Mesh(orbGeometry, orbMaterial);
  const orbBaseHeight = baseHeight + accentHeight + orbRadius + 0.18;
  orb.position.y = orbBaseHeight;
  group.add(orb);

  const labelTexture = createPoiLabelTexture(definition);
  const labelMaterial = new MeshBasicMaterial({
    map: labelTexture,
    transparent: true,
    depthWrite: false,
  });
  labelMaterial.side = DoubleSide;
  const labelHeight = 1.2;
  const labelWidth = 2.7;
  const labelGeometry = new PlaneGeometry(labelWidth, labelHeight, 1, 1);
  const label = new Mesh(labelGeometry, labelMaterial);
  const labelBaseHeight = orbBaseHeight + orbRadius + 0.4;
  label.position.set(0, labelBaseHeight, 0);
  label.renderOrder = 12;
  group.add(label);

  const haloInnerRadius = Math.max(baseRadiusX, baseRadiusZ) * 0.92;
  const haloOuterRadius = haloInnerRadius + 0.36;
  const haloGeometry = new RingGeometry(
    haloInnerRadius,
    haloOuterRadius,
    48,
    1
  );
  const haloMaterial = new MeshBasicMaterial({
    color: new Color(0x4bd8ff),
    transparent: true,
    opacity: 0.18,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  haloMaterial.side = DoubleSide;
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.08;
  halo.renderOrder = 11;
  group.add(halo);

  const hitAreaGeometry = new CylinderGeometry(
    baseRadiusX,
    baseRadiusX,
    accentHeight + 0.24,
    32
  );
  const hitAreaMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  hitAreaMaterial.side = DoubleSide;
  const hitArea = new Mesh(hitAreaGeometry, hitAreaMaterial);
  hitArea.position.y = (accentHeight + 0.24) / 2;
  hitArea.name = `POI_HIT:${definition.id}`;
  group.add(hitArea);

  const collider = {
    minX: definition.position.x - baseRadiusX,
    maxX: definition.position.x + baseRadiusX,
    minZ: definition.position.z - baseRadiusZ,
    maxZ: definition.position.z + baseRadiusZ,
  };

  return {
    definition,
    group,
    orb,
    orbMaterial,
    orbBaseHeight,
    accentMaterial,
    label,
    labelMaterial,
    labelBaseHeight,
    labelWorldPosition: new Vector3(),
    floatPhase: phaseOffset,
    floatSpeed: MathUtils.randFloat(0.8, 1.1),
    floatAmplitude: MathUtils.randFloat(0.12, 0.18),
    halo,
    haloMaterial,
    collider,
    activation: 0,
    pulseOffset: MathUtils.randFloatSpread(Math.PI * 2),
    hitArea,
    focus: 0,
    focusTarget: 0,
  };
}

function createPoiLabelTexture(definition: PoiDefinition): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 320;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to acquire 2D context for POI label.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(
    0,
    0,
    canvas.width,
    canvas.height
  );
  gradient.addColorStop(0, 'rgba(33, 108, 255, 0.92)');
  gradient.addColorStop(1, 'rgba(20, 188, 255, 0.55)');

  context.fillStyle = 'rgba(6, 20, 32, 0.84)';
  context.strokeStyle = 'rgba(112, 214, 255, 0.68)';
  context.lineWidth = 4;
  const padding = 24;
  roundRect(
    context,
    padding,
    padding,
    canvas.width - padding * 2,
    canvas.height - padding * 2,
    18
  );
  context.fill();
  context.stroke();

  context.fillStyle = gradient;
  context.font = 'bold 64px "Inter", "Segoe UI", sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(definition.title, padding * 1.5, padding * 1.35);

  const summaryY = padding * 1.35 + 84;
  context.font = '28px "Inter", "Segoe UI", sans-serif';
  context.fillStyle = 'rgba(220, 245, 255, 0.92)';
  wrapText(
    context,
    definition.summary,
    padding * 1.5,
    summaryY,
    canvas.width - padding * 3,
    40
  );

  if (definition.metrics && definition.metrics.length > 0) {
    const metricsY = canvas.height - padding * 2.1;
    const metricText = definition.metrics
      .slice(0, 2)
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join('   •   ');
    context.font = '26px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = 'rgba(160, 226, 255, 0.95)';
    context.fillText(metricText, padding * 1.5, metricsY);
  }

  if (definition.status) {
    const statusText = definition.status === 'prototype' ? 'Prototype' : 'Live';
    context.font = '24px "Inter", "Segoe UI", sans-serif';
    context.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const textWidth = context.measureText(statusText).width;
    context.fillText(
      statusText,
      canvas.width - padding * 1.5 - textWidth,
      padding * 1.4
    );
  }

  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    const metrics = context.measureText(nextLine);
    if (metrics.width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = nextLine;
    }
  }
  if (line) {
    context.fillText(line, x, cursorY);
  }
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}
