import { describe, expect, it } from 'vitest';

import {
  LED_STRIP_DEPTH,
  LED_STRIP_EDGE_BUFFER,
  computeCornerConnectorPlacement,
  toCornerDirection,
  type CornerPlacementData,
} from '../scene/lighting/ledStrips';

describe('computeCornerConnectorPlacement', () => {
  it('produces connector placement blending horizontal and vertical strips', () => {
    const corner: CornerPlacementData = {
      position: { x: -16, z: -4 },
      horizontal: {
        offsetX: 0,
        offsetZ: -LED_STRIP_DEPTH / 2,
        direction: toCornerDirection(1),
        end: 'start',
      },
      vertical: {
        offsetX: LED_STRIP_DEPTH / 2,
        offsetZ: 0,
        direction: toCornerDirection(1),
        end: 'end',
      },
    };

    const placement = computeCornerConnectorPlacement(corner);
    expect(placement).not.toBeNull();

    const interiorX = corner.position.x + (corner.vertical?.offsetX ?? 0);
    const interiorZ = corner.position.z + (corner.horizontal?.offsetZ ?? 0);
    const horizontalEdgeSign = corner.horizontal?.end === 'start' ? 1 : -1;
    const verticalEdgeSign = corner.vertical?.end === 'start' ? 1 : -1;
    const trimmedX =
      corner.position.x +
      (corner.horizontal?.offsetX ?? 0) +
      (corner.horizontal?.direction ?? 1) *
        horizontalEdgeSign *
        LED_STRIP_EDGE_BUFFER;
    const trimmedZ =
      corner.position.z +
      (corner.vertical?.offsetZ ?? 0) +
      (corner.vertical?.direction ?? 1) *
        verticalEdgeSign *
        LED_STRIP_EDGE_BUFFER;
    const expectedWidth = LED_STRIP_DEPTH + Math.abs(interiorX - trimmedX);
    const expectedDepth = LED_STRIP_DEPTH + Math.abs(interiorZ - trimmedZ);

    expect(placement?.center.x).toBeCloseTo((interiorX + trimmedX) / 2, 6);
    expect(placement?.center.z).toBeCloseTo((interiorZ + trimmedZ) / 2, 6);
    expect(placement?.size.width).toBeCloseTo(expectedWidth, 6);
    expect(placement?.size.depth).toBeCloseTo(expectedDepth, 6);
  });

  it('respects negative directions when trimming edges', () => {
    const corner: CornerPlacementData = {
      position: { x: -2, z: -4 },
      horizontal: {
        offsetX: 0,
        offsetZ: -(LED_STRIP_DEPTH + LED_STRIP_EDGE_BUFFER) / 2,
        direction: toCornerDirection(-1),
        end: 'start',
      },
      vertical: {
        offsetX: LED_STRIP_DEPTH / 2 + LED_STRIP_EDGE_BUFFER / 2,
        offsetZ: 0,
        direction: toCornerDirection(-1),
        end: 'end',
      },
    };

    const placement = computeCornerConnectorPlacement(corner);
    expect(placement).not.toBeNull();

    const horizontalEdgeSign =
      corner.horizontal?.end === 'start' ? 1 : -1;
    const verticalEdgeSign = corner.vertical?.end === 'start' ? 1 : -1;
    const interiorX = corner.position.x + (corner.vertical?.offsetX ?? 0);
    const interiorZ = corner.position.z + (corner.horizontal?.offsetZ ?? 0);
    const trimmedX =
      corner.position.x +
      (corner.horizontal?.offsetX ?? 0) +
      (corner.horizontal?.direction ?? 1) *
        horizontalEdgeSign *
        LED_STRIP_EDGE_BUFFER;
    const trimmedZ =
      corner.position.z +
      (corner.vertical?.offsetZ ?? 0) +
      (corner.vertical?.direction ?? 1) *
        verticalEdgeSign *
        LED_STRIP_EDGE_BUFFER;

    expect(placement?.center.x).toBeCloseTo((interiorX + trimmedX) / 2, 6);
    expect(placement?.center.z).toBeCloseTo((interiorZ + trimmedZ) / 2, 6);
    expect(placement?.size.width).toBeGreaterThan(LED_STRIP_DEPTH);
    expect(placement?.size.depth).toBeGreaterThan(LED_STRIP_DEPTH);
  });

  it('returns null when a corner lacks a companion segment', () => {
    const corner: CornerPlacementData = {
      position: { x: 0, z: 0 },
      horizontal: {
        offsetX: 0,
        offsetZ: 0,
        direction: toCornerDirection(1),
        end: 'start',
      },
    };

    expect(computeCornerConnectorPlacement(corner)).toBeNull();
  });
});
