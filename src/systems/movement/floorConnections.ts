import type { Object3D } from 'three';

import type { FloorRegistry } from '../../scene/floors/floorRegistry';
import type { FloorId } from '../../scene/level/floorElevations';
import { assertLevelSourceId } from '../../scene/level/sourceIds';

import type { StairLayoutResult } from './stairLayout';
import {
  classifyStairTransitionZone,
  createStairNavAreaRect,
  createStairNavigationZones,
  isWithinStairWidth,
  predictStairFloorId,
  sampleStairSurfaceHeight,
  type StairBehavior,
  type StairFloorPair,
  type StairGeometry,
  type StairTransitionZone,
} from './stairs';

export interface StairConnection extends StairFloorPair {
  readonly id: string;
  readonly lowerFloorElevation: number;
  readonly upperFloorElevation: number;
  readonly geometry: StairGeometry;
  readonly layout: StairLayoutResult;
  readonly behavior: StairBehavior;
  readonly groups: readonly Object3D[];
  readonly sources: {
    readonly visual: string;
    readonly navigation: string;
    readonly safety: readonly string[];
  };
}

export interface FloorConnectionState {
  readonly floorId: FloorId;
  readonly activeConnectionId: string | null;
  readonly descentOriginFloorId: FloorId | null;
  readonly zone: StairTransitionZone;
}

export const isConnectionAdjacent = (
  connection: StairFloorPair,
  floorId: FloorId
): boolean =>
  connection.lowerFloorId === floorId || connection.upperFloorId === floorId;

const isTransitionZone = (zone: StairTransitionZone): boolean =>
  zone !== 'outsideStairs' && zone !== 'safeUpperFloor';

/**
 * Keeps collision floor and surface context together. Call preview before a
 * collision check, and commitPosition only for an accepted runtime movement.
 */
export function createFloorConnectionController({
  floors,
  connections,
  initialFloorId,
}: {
  floors: Pick<FloorRegistry, 'get'>;
  connections: readonly StairConnection[];
  initialFloorId: FloorId;
}) {
  floors.get(initialFloorId);
  const byId = new Map<string, StairConnection>();
  const sourceIds = new Set<string>();
  for (const connection of connections) {
    if (!connection.id || byId.has(connection.id)) {
      throw new Error(
        `Duplicate or empty stair connection '${connection.id}'.`
      );
    }
    const lower = floors.get(connection.lowerFloorId);
    const upper = floors.get(connection.upperFloorId);
    const { geometry, behavior } = connection;
    if (
      lower.elevation !== connection.lowerFloorElevation ||
      upper.elevation !== connection.upperFloorElevation ||
      lower.elevation >= upper.elevation ||
      !Object.values(geometry).every(Number.isFinite) ||
      !Object.values(behavior).every(Number.isFinite) ||
      geometry.halfWidth <= 0 ||
      geometry.totalRise <= 0 ||
      geometry.totalRise > upper.elevation - lower.elevation ||
      Math.sign(geometry.topZ - geometry.bottomZ) !== geometry.direction ||
      behavior.transitionMargin <= behavior.landingTriggerMargin ||
      behavior.landingTriggerMargin < 0 ||
      behavior.stepRise <= 0 ||
      (behavior.descentCorridorInset ?? 0) < 0 ||
      geometry.landingMinZ > geometry.landingMaxZ ||
      connection.layout.topZ !== geometry.topZ ||
      connection.layout.landingMinZ !== geometry.landingMinZ ||
      connection.layout.landingMaxZ !== geometry.landingMaxZ ||
      connection.layout.directionMultiplier !== geometry.direction
    ) {
      throw new Error(
        `Invalid stair connection geometry/elevations '${connection.id}'.`
      );
    }
    for (const source of [
      connection.sources.visual,
      connection.sources.navigation,
      ...connection.sources.safety,
    ]) {
      assertLevelSourceId(source);
      if (sourceIds.has(source))
        throw new Error(`Duplicate connection source '${source}'.`);
      sourceIds.add(source);
    }
    for (const other of byId.values()) {
      if (
        !isConnectionAdjacent(other, lower.id) &&
        !isConnectionAdjacent(other, upper.id)
      )
        continue;
      const a = createStairNavAreaRect(geometry);
      const b = createStairNavAreaRect(other.geometry);
      if (
        a.minX < b.maxX &&
        a.maxX > b.minX &&
        a.minZ < b.maxZ &&
        a.maxZ > b.minZ
      ) {
        throw new Error(
          `Overlapping stair corridors '${other.id}' and '${connection.id}'.`
        );
      }
    }
    byId.set(connection.id, connection);
  }

  let state: FloorConnectionState = {
    floorId: initialFloorId,
    activeConnectionId: null,
    descentOriginFloorId: null,
    zone: 'outsideStairs',
  };
  const getConnection = (id: string): StairConnection => {
    const connection = byId.get(id);
    if (!connection) throw new Error(`Unknown stair connection '${id}'.`);
    return connection;
  };
  const classify = (
    connection: StairConnection,
    x: number,
    z: number,
    floorId: FloorId
  ) =>
    classifyStairTransitionZone(
      connection.geometry,
      connection.behavior,
      x,
      z,
      floorId,
      connection
    );

  const resolve = (
    x: number,
    z: number,
    floorId: FloorId
  ): StairConnection | undefined => {
    floors.get(floorId);
    if (!Number.isFinite(x) || !Number.isFinite(z))
      throw new Error('Non-finite stair position.');
    // Never select by distance or by an unrelated floor's projected stair geometry.
    const candidates = connections.filter(
      (connection) =>
        isConnectionAdjacent(connection, floorId) &&
        isTransitionZone(classify(connection, x, z, floorId))
    );
    if (candidates.length > 1) {
      throw new Error(`Ambiguous stair transition on floor '${floorId}'.`);
    }
    return candidates[0];
  };

  const preview = (
    x: number,
    z: number,
    currentFloor = state.floorId
  ): FloorConnectionState => {
    const connection = resolve(x, z, currentFloor);
    if (!connection)
      return {
        floorId: currentFloor,
        activeConnectionId: null,
        descentOriginFloorId: null,
        zone: 'outsideStairs',
      };
    const zone = classify(connection, x, z, currentFloor);
    const floorId = predictStairFloorId(
      connection.geometry,
      connection.behavior,
      x,
      z,
      currentFloor,
      connection
    );
    const upperZone = classify(connection, x, z, connection.upperFloorId);
    const beganDescent =
      currentFloor === connection.upperFloorId &&
      floorId === connection.lowerFloorId;
    const continuingDescent =
      state.activeConnectionId === connection.id &&
      state.descentOriginFloorId === connection.upperFloorId;
    // Retain the origin through a reversal toward the lip as well as slow descent.
    const inLip =
      upperZone === 'explicitDescentCorridor' ||
      (upperZone === 'upperLanding' &&
        isWithinStairWidth(connection.geometry, x));
    return {
      floorId,
      activeConnectionId: connection.id,
      descentOriginFloorId:
        floorId === connection.lowerFloorId &&
        inLip &&
        (beganDescent || continuingDescent)
          ? connection.upperFloorId
          : null,
      zone,
    };
  };

  return {
    getConnection,
    getState: (): FloorConnectionState => ({ ...state }),
    preview,
    commitPosition(x: number, z: number): FloorConnectionState {
      state = preview(x, z);
      return { ...state };
    },
    reset(floorId: FloorId) {
      floors.get(floorId);
      state = {
        floorId,
        activeConnectionId: null,
        descentOriginFloorId: null,
        zone: 'outsideStairs',
      };
    },
    sampleHeight(x: number, z: number): number {
      const connection = state.activeConnectionId
        ? getConnection(state.activeConnectionId)
        : resolve(x, z, state.floorId);
      if (!connection) return floors.get(state.floorId).elevation;
      return sampleStairSurfaceHeight({
        ...connection,
        x,
        z,
        currentFloor: state.descentOriginFloorId ?? state.floorId,
      });
    },
    getSnapshot(x: number, z: number) {
      return {
        ...state,
        connections: connections.map((connection) => ({
          id: connection.id,
          lowerFloorId: connection.lowerFloorId,
          upperFloorId: connection.upperFloorId,
          lowerFloorElevation: connection.lowerFloorElevation,
          upperFloorElevation: connection.upperFloorElevation,
          adjacent: isConnectionAdjacent(connection, state.floorId),
          visible: connection.groups.some((group) => group.visible),
          geometry: { ...connection.geometry },
          behavior: { ...connection.behavior },
          zones: createStairNavigationZones(
            connection.geometry,
            connection.behavior
          ),
          zone: isConnectionAdjacent(connection, state.floorId)
            ? classify(connection, x, z, state.floorId)
            : ('outsideStairs' as StairTransitionZone),
          sources: {
            ...connection.sources,
            safety: [...connection.sources.safety],
          },
        })),
      };
    },
  };
}

export type FloorConnectionController = ReturnType<
  typeof createFloorConnectionController
>;
