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
  Object3D,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Vector3,
} from 'three';

import type { SceneDetailPolicy } from '../graphics/sceneDetailPolicy';
import { getSceneDetailPolicy } from '../graphics/sceneDetailPolicy';

import {
  scalePoiValue,
  POI_ORB_VERTICAL_OFFSET,
  POI_ORB_HEIGHT_MULTIPLIER,
  POI_ORB_DIAMETER_MULTIPLIER,
} from './constants';
import { createTightColliderFromObject } from './geometryCollider';
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

export interface PoiInstanceOptions {
  detailPolicy?: SceneDetailPolicy;
}

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
  modelRoots: Object3D[];
}

export function createPoiInstances(
  definitions: PoiDefinition[],
  overrides: PoiInstanceOverrides = {},
  options: PoiInstanceOptions = {}
): PoiInstance[] {
  return definitions.map((definition, index) => {
    const override = overrides[definition.id];
    if (override?.mode === 'display') {
      return createDisplayPoiInstance(definition, override);
    }
    return createPedestalPoiInstance(
      definition,
      index * Math.PI * 0.37,
      options.detailPolicy
    );
  });
}

export function updatePoiInstanceDefinition(
  instance: PoiInstance,
  definition: PoiDefinition
): void {
  instance.definition = definition;
  if (instance.labelMaterial) {
    const previousTexture = instance.labelMaterial.map;
    instance.labelMaterial.map = createPoiLabelTexture(definition);
    instance.labelMaterial.needsUpdate = true;
    previousTexture?.dispose();
  }
}

function createPedestalPoiInstance(
  definition: PoiDefinition,
  phaseOffset: number,
  detailPolicy: SceneDetailPolicy = getSceneDetailPolicy('balanced')
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

  const isPerformance = detailPolicy.level === 'performance';
  const cylinderSegments = detailPolicy.geometry.cylinderSegments;
  const sphereWidthSegments = detailPolicy.geometry.sphereWidthSegments;
  const sphereHeightSegments = detailPolicy.geometry.sphereHeightSegments;
  const ringSegments = detailPolicy.geometry.ringSegments;

  let accentMaterial: MeshStandardMaterial | undefined;
  let accentBaseColor: Color | undefined;
  let accentFocusColor: Color | undefined;

  const rendersPedestal =
    pedestalHeight > 0 &&
    pedestalRadius > 0 &&
    (!isPerformance || hologramConfig?.renderInPerformance === true);
  const effectivePedestalHeight = rendersPedestal ? pedestalHeight : 0;
  const effectivePedestalRadius = rendersPedestal ? pedestalRadius : 0;

  if (rendersPedestal) {
    const bodyMaterial = new MeshStandardMaterial({
      color: new Color(hologramConfig?.bodyColor ?? 0x101c2a),
      emissive: new Color(hologramConfig?.emissiveColor ?? 0x2f8aff),
      emissiveIntensity: hologramConfig?.emissiveIntensity ?? 0.78,
      roughness: 0.2,
      metalness: 0.16,
    });
    bodyMaterial.transparent = true;
    bodyMaterial.opacity = MathUtils.clamp(
      isPerformance
        ? (hologramConfig?.performanceBodyOpacity ??
            hologramConfig?.bodyOpacity ??
            0.52)
        : (hologramConfig?.bodyOpacity ?? 0.52),
      0,
      1
    );
    bodyMaterial.depthWrite = false;
    const bodyGeometry = new CylinderGeometry(
      pedestalRadius,
      pedestalRadius,
      pedestalHeight,
      cylinderSegments,
      1,
      true
    );
    const body = new Mesh(bodyGeometry, bodyMaterial);
    body.name = `POI_PedestalBody:${definition.id}`;
    body.userData.physicalCollider = true;
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
      isPerformance
        ? (hologramConfig?.performanceAccentOpacity ??
            hologramConfig?.accentOpacity ??
            0.88)
        : (hologramConfig?.accentOpacity ?? 0.88),
      0,
      1
    );
    accentMaterial.depthWrite = false;
    const accentGeometry = new CylinderGeometry(
      pedestalRadius * 1.02,
      pedestalRadius * 1.02,
      accentHeight,
      cylinderSegments,
      1,
      true
    );
    const accent = new Mesh(accentGeometry, accentMaterial);
    accent.name = `POI_PedestalAccent:${definition.id}`;
    accent.userData.physicalCollider = true;
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
      opacity: MathUtils.clamp(
        isPerformance
          ? (hologramConfig?.performanceRingOpacity ??
              hologramConfig?.ringOpacity ??
              0.6)
          : (hologramConfig?.ringOpacity ?? 0.6),
        0,
        1
      ),
      blending: AdditiveBlending,
      depthWrite: false,
    });
    ringMaterial.side = DoubleSide;
    const ringGeometry = new RingGeometry(
      pedestalRadius * 0.55,
      pedestalRadius * 1.08,
      ringSegments,
      1
    );
    const ring = new Mesh(ringGeometry, ringMaterial);
    ring.name = `POI_PedestalRing:${definition.id}`;
    ring.userData.physicalCollider = false;
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = pedestalHeight + scalePoiValue(0.02);
    ring.renderOrder = 12;
    group.add(ring);
  }

  const orbRadius =
    Math.max(baseRadius, effectivePedestalRadius) *
    0.45 *
    POI_ORB_DIAMETER_MULTIPLIER;
  const orbGeometry = new SphereGeometry(
    orbRadius,
    sphereWidthSegments,
    sphereHeightSegments
  );
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
  orb.name = `POI_Orb:${definition.id}`;
  orb.userData.physicalCollider = false;
  const orbBaseHeight =
    effectivePedestalHeight +
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
  const labelHeight = scalePoiValue(0.78);
  const labelWidth = scalePoiValue(2.7);
  const labelGeometry = new PlaneGeometry(labelWidth, labelHeight, 1, 1);
  const label = new Mesh(labelGeometry, labelMaterial);
  label.name = `POI_Label:${definition.id}`;
  label.userData.physicalCollider = false;
  const labelBaseHeight = orbBaseHeight + orbRadius + scalePoiValue(0.4);
  label.position.set(0, labelBaseHeight, 0);
  label.renderOrder = 12;
  group.add(label);

  const badgeBaseHeight = labelBaseHeight + labelHeight * 0.42;
  const visitedBadge = createVisitedBadge({
    baseHeight: badgeBaseHeight,
  });
  visitedBadge.mesh.userData.physicalCollider = false;
  visitedBadge.mesh.position.set(0, badgeBaseHeight, 0);
  group.add(visitedBadge.mesh);

  // Size the ground ring proportionally to the underlying model footprint.
  // Use the smaller half-extent to keep a conservative footprint and avoid overlaps.
  const modelRadius = Math.max(baseRadius, effectivePedestalRadius);
  const haloInnerRadius = modelRadius * 0.62; // tighter than the platform base
  const haloOuterRadius = haloInnerRadius + scalePoiValue(0.22);
  const haloGeometry = new RingGeometry(
    haloInnerRadius,
    haloOuterRadius,
    ringSegments,
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
  halo.userData.physicalCollider = false;
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = scalePoiValue(0.08);
  halo.renderOrder = 11;
  group.add(halo);

  const visitedRingGeometry = new RingGeometry(
    haloInnerRadius * 0.92,
    haloOuterRadius * 1.05,
    ringSegments,
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
  visitedRing.userData.physicalCollider = false;
  visitedRing.rotation.x = -Math.PI / 2;
  visitedRing.position.y = scalePoiValue(0.12);
  visitedRing.renderOrder = 10;
  visitedRing.visible = false;
  visitedRing.scale.setScalar(1);
  group.add(visitedRing);

  const hitAreaHeight =
    baseHeight + effectivePedestalHeight + scalePoiValue(0.24);
  const hitAreaRadius = Math.max(baseRadiusX, effectivePedestalRadius);
  const hitAreaGeometry = new CylinderGeometry(
    hitAreaRadius,
    hitAreaRadius,
    hitAreaHeight,
    cylinderSegments
  );
  const hitAreaMaterial = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  hitAreaMaterial.side = DoubleSide;
  const hitArea = new Mesh(hitAreaGeometry, hitAreaMaterial);
  hitArea.userData.physicalCollider = false;
  hitArea.position.y = hitAreaHeight / 2;
  hitArea.name = `POI_HIT:${definition.id}`;
  group.add(hitArea);

  const collider = createTightColliderFromObject(group);

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
    modelRoots: [],
  };
}

function createDisplayPoiInstance(
  definition: PoiDefinition,
  override: PoiInstanceOverride
): PoiInstance {
  const collider = createTightColliderFromObject(override.highlight.mesh);

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
    modelRoots: [override.highlight.mesh],
  };
}

export function createPoiLabelTexture(
  definition: PoiDefinition
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 192;
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
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  wrapText(
    context,
    definition.title,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width - padding * 3,
    68,
    2
  );

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
  lineHeight: number,
  maxLines = Number.POSITIVE_INFINITY
) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  let truncated = false;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const nextLine = line ? `${line} ${word}` : word;
    const metrics = context.measureText(nextLine);
    if (metrics.width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) {
        truncated = true;
        break;
      }
    } else if (metrics.width > maxWidth) {
      lines.push(fitTextWithEllipsis(context, word, maxWidth));
      line = '';
      if (lines.length >= maxLines || index < words.length - 1) {
        truncated = index < words.length - 1;
        break;
      }
    } else {
      line = nextLine;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line);
  } else if (line) {
    truncated = true;
  }

  if (truncated && lines.length > 0) {
    lines[lines.length - 1] = fitTextWithEllipsis(
      context,
      lines[lines.length - 1],
      maxWidth
    );
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (context.measureText(lines[index]).width > maxWidth) {
      lines[index] = fitTextWithEllipsis(context, lines[index], maxWidth);
    }
  }

  const firstLineY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((wrappedLine, index) => {
    context.fillText(wrappedLine, x, firstLineY + index * lineHeight);
  });
}

function fitTextWithEllipsis(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  const ellipsis = '…';
  let candidate = `${text}${ellipsis}`;
  if (context.measureText(candidate).width <= maxWidth) {
    return candidate;
  }

  candidate = text;
  while (candidate.length > 0) {
    candidate = candidate.slice(0, -1).trimEnd();
    const truncated = `${candidate}${ellipsis}`;
    if (context.measureText(truncated).width <= maxWidth) {
      return truncated;
    }
  }

  return ellipsis;
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
