import {
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  type ColorRepresentation,
  Vector3,
} from 'three';

import {
  getCombinedWallSegments,
  type CombinedWallSegment,
  type FloorPlanDefinition,
  type RoomCategory,
} from '../../assets/floorPlan';
import { getWallOutwardDirection } from '../../assets/floorPlan/wallSegments';

import type {
  SeasonalLightingFillLightTarget,
  SeasonalLightingTarget,
} from './seasonalPresets';

export const LED_STRIP_THICKNESS = 0.12;
export const LED_STRIP_DEPTH = 0.22;
export const LED_STRIP_EDGE_BUFFER = 0.3;
const FILL_LIGHT_HEIGHT_OFFSET = 0.1;
const CORNER_LIGHT_INTENSITY_SCALE = 0.35;
const CORNER_LIGHT_RANGE_SCALE = 0.9;
const CORNER_INSET = 1.1;
const CENTER_LIGHT_RANGE_SCALE = 1.1;

export interface RoomLedStripBuild {
  readonly group: Group;
  readonly fillLightGroup: Group;
  readonly materials: MeshStandardMaterial[];
  readonly fillLights: PointLight[];
  readonly materialsByRoom: Map<string, MeshStandardMaterial>;
  readonly fillLightsByRoom: Map<string, PointLight>;
  readonly seasonalTargets: SeasonalLightingTarget[];
  readonly stripMeshesByRoom: Map<string, Mesh[]>;
}

export interface RoomLedStripOptions {
  readonly plan: FloorPlanDefinition;
  readonly getRoomCategory: (roomId: string) => RoomCategory;
  readonly ledHeight: number;
  readonly baseColor: ColorRepresentation;
  readonly emissiveIntensity: number;
  readonly fillLightIntensity: number;
  readonly wallThickness: number;
  readonly stripThickness?: number;
  readonly stripDepth?: number;
  readonly edgeBuffer?: number;
}

function getEffectiveLength(
  segment: CombinedWallSegment,
  edgeBuffer: number
): number {
  const segmentLength =
    segment.orientation === 'horizontal'
      ? Math.abs(segment.end.x - segment.start.x)
      : Math.abs(segment.end.z - segment.start.z);
  return segmentLength - edgeBuffer * 2;
}

function createCornerOffsets(
  roomBounds: FloorPlanDefinition['rooms'][number]['bounds'],
  ledHeight: number
): readonly Vector3[] {
  const height = ledHeight - FILL_LIGHT_HEIGHT_OFFSET;
  return [
    new Vector3(
      roomBounds.minX + CORNER_INSET,
      height,
      roomBounds.minZ + CORNER_INSET
    ),
    new Vector3(
      roomBounds.maxX - CORNER_INSET,
      height,
      roomBounds.minZ + CORNER_INSET
    ),
    new Vector3(
      roomBounds.minX + CORNER_INSET,
      height,
      roomBounds.maxZ - CORNER_INSET
    ),
    new Vector3(
      roomBounds.maxX - CORNER_INSET,
      height,
      roomBounds.maxZ - CORNER_INSET
    ),
  ];
}

export function createRoomLedStrips(
  options: RoomLedStripOptions
): RoomLedStripBuild {
  const stripThickness = options.stripThickness ?? LED_STRIP_THICKNESS;
  const stripDepth = options.stripDepth ?? LED_STRIP_DEPTH;
  const edgeBuffer = options.edgeBuffer ?? LED_STRIP_EDGE_BUFFER;

  const ledGroup = new Group();
  const fillLightGroup = new Group();

  const materials: MeshStandardMaterial[] = [];
  const fillLights: PointLight[] = [];
  const materialsByRoom = new Map<string, MeshStandardMaterial>();
  const fillLightsByRoom = new Map<string, PointLight>();
  const stripMeshesByRoom = new Map<string, Mesh[]>();
  const seasonalTargets: SeasonalLightingTarget[] = [];
  const roomGroups = new Map<string, Group>();

  const baseColor = new Color(options.baseColor);

  options.plan.rooms.forEach((room) => {
    if (options.getRoomCategory(room.id) === 'exterior') {
      return;
    }

    const emissiveColor = new Color(room.ledColor);
    const material = new MeshStandardMaterial({
      color: baseColor,
      emissive: emissiveColor,
      emissiveIntensity: options.emissiveIntensity,
      roughness: 0.35,
      metalness: 0.15,
    });
    materials.push(material);
    materialsByRoom.set(room.id, material);

    const roomGroup = new Group();
    roomGroup.name = `${room.name} LED`;
    ledGroup.add(roomGroup);
    roomGroups.set(room.id, roomGroup);
    stripMeshesByRoom.set(room.id, []);

    const roomCenterX = (room.bounds.minX + room.bounds.maxX) / 2;
    const roomCenterZ = (room.bounds.minZ + room.bounds.maxZ) / 2;
    const roomWidth = room.bounds.maxX - room.bounds.minX;
    const roomDepth = room.bounds.maxZ - room.bounds.minZ;

    const centerLight = new PointLight(
      emissiveColor,
      options.fillLightIntensity,
      Math.max(roomWidth, roomDepth) * CENTER_LIGHT_RANGE_SCALE,
      2
    );
    centerLight.position.set(
      roomCenterX,
      options.ledHeight - FILL_LIGHT_HEIGHT_OFFSET,
      roomCenterZ
    );
    centerLight.castShadow = false;
    fillLightGroup.add(centerLight);
    fillLights.push(centerLight);
    fillLightsByRoom.set(room.id, centerLight);

    const fillTargets: SeasonalLightingFillLightTarget[] = [
      { light: centerLight, baseIntensity: centerLight.intensity },
    ];

    createCornerOffsets(room.bounds, options.ledHeight).forEach((offset) => {
      const cornerLight = new PointLight(
        emissiveColor,
        options.fillLightIntensity * CORNER_LIGHT_INTENSITY_SCALE,
        Math.max(roomWidth, roomDepth) * CORNER_LIGHT_RANGE_SCALE,
        2
      );
      cornerLight.position.copy(offset);
      cornerLight.castShadow = false;
      fillLightGroup.add(cornerLight);
      fillLights.push(cornerLight);
      fillTargets.push({
        light: cornerLight,
        baseIntensity: cornerLight.intensity,
      });
    });

    seasonalTargets.push({
      roomId: room.id,
      material,
      baseEmissiveColor: emissiveColor.clone(),
      baseEmissiveIntensity: options.emissiveIntensity,
      fillLights: fillTargets,
    });
  });

  const wallSegments = getCombinedWallSegments(options.plan);

  wallSegments.forEach((segment) => {
    const effectiveLength = getEffectiveLength(segment, edgeBuffer);
    if (effectiveLength <= stripDepth * 0.5) {
      return;
    }

    const width =
      segment.orientation === 'horizontal' ? effectiveLength : stripDepth;
    const depth =
      segment.orientation === 'horizontal' ? stripDepth : effectiveLength;
    const baseX =
      segment.orientation === 'horizontal'
        ? (segment.start.x + segment.end.x) / 2
        : segment.start.x;
    const baseZ =
      segment.orientation === 'horizontal'
        ? segment.start.z
        : (segment.start.z + segment.end.z) / 2;

    segment.rooms.forEach((roomInfo) => {
      if (options.getRoomCategory(roomInfo.id) === 'exterior') {
        return;
      }
      const material = materialsByRoom.get(roomInfo.id);
      const group = roomGroups.get(roomInfo.id);
      const strips = stripMeshesByRoom.get(roomInfo.id);
      if (!material || !group || !strips) {
        return;
      }

      const direction = getWallOutwardDirection(roomInfo.wall);
      const inwardOffset =
        segment.rooms.length > 1
          ? options.wallThickness / 2 + stripDepth / 2
          : stripDepth / 2;
      const offsetX = -direction.x * inwardOffset;
      const offsetZ = -direction.z * inwardOffset;

      const geometry = new BoxGeometry(width, stripThickness, depth);
      const strip = new Mesh(geometry, material);
      strip.position.set(baseX + offsetX, options.ledHeight, baseZ + offsetZ);
      strip.renderOrder = 1;
      group.add(strip);
      strips.push(strip);
    });
  });

  return {
    group: ledGroup,
    fillLightGroup,
    materials,
    fillLights,
    materialsByRoom,
    fillLightsByRoom,
    seasonalTargets,
    stripMeshesByRoom,
  };
}
