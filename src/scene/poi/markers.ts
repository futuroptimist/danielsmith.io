import {
  AdditiveBlending,
  Box3,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

import {
  scalePoiValue,
  POI_ORB_VERTICAL_OFFSET,
  POI_ORB_HEIGHT_MULTIPLIER,
  POI_ORB_DIAMETER_MULTIPLIER,
} from './constants';
import type { PoiDefinition, PoiId } from './types';
import { createVisitedBadge, type PoiVisitedBadge } from './visitedBadge';

export interface PoiDisplayHighlight {
  mesh: Mesh;
  material: MeshBasicMaterial;
  baseOpacity: number;
  focusOpacity: number;
  baseScale?: number;
  focusScale?: number;
}

export type PoiInstanceOverride = {
  mode: 'display';
  hitArea: Mesh;
  highlight: PoiDisplayHighlight;
};

export type PoiInstanceOverrides = Partial<Record<PoiId, PoiInstanceOverride>>;

export interface PoiInstance {
  definition: PoiDefinition;
  group: Object3D;
  orb?: Mesh;
  orbMaterial?: MeshStandardMaterial;
  orbBaseHeight?: number;
  accentMaterial?: MeshStandardMaterial;
  label?: Mesh;
  labelMaterial?: MeshBasicMaterial;
  labelBaseHeight?: number;
  labelWorldPosition: Vector3;
  floatPhase: number;
  floatSpeed: number;
  floatAmplitude: number;
  halo?: Mesh;
  haloMaterial?: MeshBasicMaterial;
  collider?: { minX: number; maxX: number; minZ: number; maxZ: number };
  activation: number;
  pulseOffset: number;
  hitArea: Mesh;
  focus: number;
  focusTarget: number;
  accentBaseColor?: Color;
  accentFocusColor?: Color;
  haloBaseColor?: Color;
  haloFocusColor?: Color;
  orbEmissiveBase?: Color;
  orbEmissiveHighlight?: Color;
  visualMode: 'pedestal' | 'display';
  displayHighlight?: PoiDisplayHighlight;
  visited: boolean;
  visitedStrength: number;
  visitedHighlight?: {
    mesh: Mesh;
    material: MeshBasicMaterial;
  };
  visitedBadge?: PoiVisitedBadge;
}

export function createPoiInstances(
  definitions: PoiDefinition[],
  overrides: PoiInstanceOverrides = {}
): PoiInstance[] {
  return definitions.map((definition, index) => {
    const override = overrides[definition.id];
    if (override?.mode === 'display') {
      return createDisplayPoiInstance(definition, override);
    }
    return createPedestalPoiInstance(definition, index * Math.PI * 0.37);
  });
}

function createPedestalPoiInstance(
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

  const baseHeight = scalePoiValue(0.32);
  const baseRadiusX = definition.footprint.width / 2;
  const baseRadiusZ = definition.footprint.depth / 2;

  const hologramConfig =
    definition.pedestal?.type === 'hologram' ? definition.pedestal : null;
  const pedestalHeight = Math.max(0, hologramConfig?.height ?? 0);
  const baseRadius = Math.min(baseRadiusX, baseRadiusZ);
  const pedestalRadius =
    pedestalHeight > 0
      ? baseRadius *
        MathUtils.clamp(hologramConfig?.radiusScale ?? 0.75, 0.3, 1.25)
      : 0;

  let accentMaterial: MeshStandardMaterial | undefined;
  let accentBaseColor: Color | undefined;
  let accentFocusColor: Color | undefined;

  if (pedestalHeight > 0 && pedestalRadius > 0) {
    const bodyMaterial = new MeshStandardMaterial({
      color: new Color(hologramConfig?.bodyColor ?? 0x101c2a),
      emissive: new Color(hologramConfig?.emissiveColor ?? 0x2f8aff),
      emissiveIntensity: hologramConfig?.emissiveIntensity ?? 0.78,
      roughness: 0.2,
      metalness: 0.16,
    });
    bodyMaterial.transparent = true;
    bodyMaterial.opacity = MathUtils.clamp(
      hologramConfig?.bodyOpacity ?? 0.52,
      0,
      1
    );
    bodyMaterial.depthWrite = false;
    const bodyGeometry = new CylinderGeometry(
      pedestalRadius,
      pedestalRadius,
      pedestalHeight,
      48,
      1,
      true
    );
    const body = new Mesh(bodyGeometry, bodyMaterial);
    body.name = `POI_PedestalBody:${definition.id}`;
    body.position.y = pedestalHeight / 2;
    body.renderOrder = 6;
    group.add(body);

    const accentHeight = Math.max(
      Math.min(pedestalHeight * 0.2, scalePoiValue(0.4)),
      scalePoiValue(0.1)
    );
    accentMaterial = new MeshStandardMaterial({
      color: new Color(hologramConfig?.accentColor ?? 0x58ddff),
      emissive: new Color(
        hologramConfig?.accentEmissiveColor ??
          hologramConfig?.accentColor ??
          0x8cefff
      ),
      emissiveIntensity: hologramConfig?.accentEmissiveIntensity ?? 1.05,
      roughness: 0.18,
      metalness: 0.42,
    });
    accentMaterial.transparent = true;
    accentMaterial.opacity = MathUtils.clamp(
      hologramConfig?.accentOpacity ?? 0.88,
      0,
      1
    );
    accentMaterial.depthWrite = false;
    const accentGeometry = new CylinderGeometry(
      pedestalRadius * 1.02,
      pedestalRadius * 1.02,
      accentHeight,
      48,
      1,
      true
    );
    const accent = new Mesh(accentGeometry, accentMaterial);
    accent.name = `POI_PedestalAccent:${definition.id}`;
    accent.position.y = pedestalHeight - accentHeight / 2;
    accent.renderOrder = 7;
    group.add(accent);

    accentBaseColor = accentMaterial.color.clone();
    accentFocusColor = accentMaterial.color
      .clone()
      .lerp(new Color(0xffffff), 0.35);

    const ringMaterial = new MeshBasicMaterial({
      color: new Color(hologramConfig?.ringColor ?? 0x78eaff),
      transparent: true,
      opacity: MathUtils.clamp(hologramConfig?.ringOpacity ?? 0.6, 0, 1),
      blending: AdditiveBlending,
      depthWrite: false,
    });
    ringMaterial.side = DoubleSide;
    const ringGeometry = new RingGeometry(
      pedestalRadius * 0.55,
      pedestalRadius * 1.08,
      64,
      1
    );
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.name = `POI_PedestalRing:${definition.id}`;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = pedestalHeight + scalePoiValue(0.02);
    ring.renderOrder = 12;
    group.add(ring);
  }

  const orbRadius =
    Math.max(baseRadius, pedestalRadius) * 0.45 * POI_ORB_DIAMETER_MULTIPLIER;
  const orbGeometry = new SphereGeometry(orbRadius, 32, 32);
  const orbColor = new Color(hologramConfig?.orbColor ?? 0xb8f3ff);
  const orbEmissiveBase = new Color(
    hologramConfig?.orbEmissiveColor ?? 0x3de1ff
  );
  const orbEmissiveHighlight = new Color(
    hologramConfig?.orbHighlightColor ?? 0x7efcff
  );
  const orbMaterial = new MeshStandardMaterial({
    color: orbColor,
    emissive: orbEmissiveBase.clone(),
    emissiveIntensity: hologramConfig?.orbEmissiveIntensity ?? 0.9,
    roughness: 0.22,
    metalness: 0.18,
  });
  const orb = new Mesh(orbGeometry, orbMaterial);
  const orbBaseHeight =
    pedestalHeight +
    (baseHeight + orbRadius + scalePoiValue(POI_ORB_VERTICAL_OFFSET)) *
      POI_ORB_HEIGHT_MULTIPLIER;
  orb.position.y = orbBaseHeight;
  group.add(orb);

  const labelTexture = createPoiLabelTexture(definition);
  const labelMaterial = new MeshBasicMaterial({
    map: labelTexture,
    transparent: true,
    depthWrite: false,
  });
  labelMaterial.side = DoubleSide;
  const labelHeight = scalePoiValue(1.2);
  const labelWidth = scalePoiValue(2.7);
  const labelGeometry = new PlaneGeometry(labelWidth, labelHeight, 1, 1);
  const label = new Mesh(labelGeometry, labelMaterial);
  const labelBaseHeight = orbBaseHeight + orbRadius + scalePoiValue(0.4);
  label.position.set(0, labelBaseHeight, 0);
  label.renderOrder = 12;
  group.add(label);

  const badgeBaseHeight = labelBaseHeight + labelHeight * 0.42;
  const visitedBadge = createVisitedBadge({
    baseHeight: badgeBaseHeight,
  });
  visitedBadge.mesh.position.set(0, badgeBaseHeight, 0);
  group.add(visitedBadge.mesh);

  // Size the ground ring proportionally to the underlying model footprint.
  // Use the smaller half-extent to keep a conservative footprint and avoid overlaps.
  const modelRadius = Math.max(baseRadius, pedestalRadius);
  const haloInnerRadius = modelRadius * 0.62; // tighter than the platform base
  const haloOuterRadius = haloInnerRadius + scalePoiValue(0.22);
  const haloGeometry = new RingGeometry(
    haloInnerRadius,
    haloOuterRadius,
    48,
    1
  );
  const haloBaseColor = new Color(0x4bd8ff);
  const haloFocusColor = new Color(0xaefbff);
  const haloMaterial = new MeshBasicMaterial({
    color: haloBaseColor.clone(),
    transparent: true,
    opacity: 0.18,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  haloMaterial.side = DoubleSide;
  const halo = new Mesh(haloGeometry, haloMaterial);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = scalePoiValue(0.08);
  halo.renderOrder = 11;
  group.add(halo);

  const visitedRingGeometry = new RingGeometry(
    haloInnerRadius * 0.92,
    haloOuterRadius * 1.05,
    60,
    1
  );
  const visitedRingMaterial = new MeshBasicMaterial({
    color: new Color(0x7effc7),
    transparent: true,
    opacity: 0,
    blending: AdditiveBlending,
    depthWrite: false,
  });
  visitedRingMaterial.side = DoubleSide;
  const visitedRing = new Mesh(visitedRingGeometry, visitedRingMaterial);
  visitedRing.rotation.x = -Math.PI / 2;
  visitedRing.position.y = scalePoiValue(0.12);
  visitedRing.renderOrder = 10;
  visitedRing.visible = false;
  visitedRing.scale.setScalar(1);
  group.add(visitedRing);

  const hitAreaHeight = baseHeight + pedestalHeight + scalePoiValue(0.24);
  const hitAreaRadius = Math.max(baseRadiusX, pedestalRadius);
  const hitAreaGeometry = new CylinderGeometry(
    hitAreaRadius,
    hitAreaRadius,
    hitAreaHeight,
    32
  );
  const hitAreaMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  hitAreaMaterial.side = DoubleSide;
  const hitArea = new Mesh(hitAreaGeometry, hitAreaMaterial);
  hitArea.position.y = hitAreaHeight / 2;
  hitArea.name = `POI_HIT:${definition.id}`;
  group.add(hitArea);

  const colliderRadiusX = Math.max(baseRadiusX, pedestalRadius);
  const colliderRadiusZ = Math.max(baseRadiusZ, pedestalRadius);
  const collider = {
    minX: definition.position.x - colliderRadiusX,
    maxX: definition.position.x + colliderRadiusX,
    minZ: definition.position.z - colliderRadiusZ,
    maxZ: definition.position.z + colliderRadiusZ,
  };

  return {
    definition,
    group,
    orb,
    orbMaterial,
    orbBaseHeight,
    label,
    labelMaterial,
    labelBaseHeight,
    labelWorldPosition: new Vector3(),
    floatPhase: phaseOffset,
    floatSpeed: MathUtils.randFloat(0.8, 1.1),
    floatAmplitude: MathUtils.randFloat(0.12, 0.18) * scalePoiValue(1),
    halo,
    haloMaterial,
    accentMaterial,
    accentBaseColor,
    accentFocusColor,
    collider,
    activation: 0,
    pulseOffset: MathUtils.randFloatSpread(Math.PI * 2),
    hitArea,
    focus: 0,
    focusTarget: 0,
    haloBaseColor,
    haloFocusColor,
    orbEmissiveBase,
    orbEmissiveHighlight,
    visualMode: 'pedestal',
    visited: false,
    visitedStrength: 0,
    visitedHighlight: { mesh: visitedRing, material: visitedRingMaterial },
    visitedBadge,
  };
}

function createDisplayPoiInstance(
  definition: PoiDefinition,
  override: PoiInstanceOverride
): PoiInstance {
  override.hitArea.updateWorldMatrix(true, false);

  let collider: PoiInstance['collider'];
  const geometry = override.hitArea.geometry;

  if (geometry) {
    geometry.computeBoundingBox();
    const boundingBox = geometry.boundingBox?.clone();
    if (boundingBox) {
      boundingBox.applyMatrix4(override.hitArea.matrixWorld);
      collider = {
        minX: boundingBox.min.x,
        maxX: boundingBox.max.x,
        minZ: boundingBox.min.z,
        maxZ: boundingBox.max.z,
      };
    }
  }

  if (!collider) {
    const fallbackBounds = new Box3().setFromObject(override.hitArea);
    const hasValidBounds =
      Number.isFinite(fallbackBounds.min.x) &&
      Number.isFinite(fallbackBounds.max.x) &&
      Number.isFinite(fallbackBounds.min.z) &&
      Number.isFinite(fallbackBounds.max.z);

    if (hasValidBounds) {
      collider = {
        minX: fallbackBounds.min.x,
        maxX: fallbackBounds.max.x,
        minZ: fallbackBounds.min.z,
        maxZ: fallbackBounds.max.z,
      };
    }
  }

  override.hitArea.name = `POI_HIT:${definition.id}`;

  return {
    definition,
    group: override.hitArea,
    collider,
    activation: 0,
    pulseOffset: 0,
    hitArea: override.hitArea,
    focus: 0,
    focusTarget: 0,
    labelWorldPosition: new Vector3(),
    floatPhase: 0,
    floatSpeed: 0,
    floatAmplitude: 0,
    visualMode: 'display',
    displayHighlight: override.highlight,
    visited: false,
    visitedStrength: 0,
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
