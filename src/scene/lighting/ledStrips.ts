import { MathUtils } from 'three';

export const LED_STRIP_THICKNESS = 0.12;
export const LED_STRIP_DEPTH = 0.22;
export const LED_STRIP_EDGE_BUFFER = 0.3;

export type CornerDirection = -1 | 1;

export interface CornerSegmentPlacement {
  readonly offsetX: number;
  readonly offsetZ: number;
  readonly direction: CornerDirection;
  readonly end: 'start' | 'end';
}

export interface CornerPlacementData {
  readonly position: { x: number; z: number };
  horizontal?: CornerSegmentPlacement;
  vertical?: CornerSegmentPlacement;
}

export interface CornerConnectorPlacement {
  readonly center: { x: number; z: number };
  readonly size: { width: number; depth: number };
}

const MIN_DIMENSION = 1e-5;

export function toCornerDirection(value: number): CornerDirection {
  if (!Number.isFinite(value) || Math.abs(value) <= MIN_DIMENSION) {
    return 1;
  }
  return value >= 0 ? 1 : -1;
}

export function computeCornerConnectorPlacement(
  corner: CornerPlacementData
): CornerConnectorPlacement | null {
  const { horizontal, vertical } = corner;
  if (!horizontal || !vertical) {
    return null;
  }

  const horizontalEdgeSign = horizontal.end === 'start' ? 1 : -1;
  const verticalEdgeSign = vertical.end === 'start' ? 1 : -1;

  const interiorX = corner.position.x + vertical.offsetX;
  const interiorZ = corner.position.z + horizontal.offsetZ;

  const horizontalTrimmedX =
    corner.position.x +
    horizontal.offsetX +
    horizontal.direction * horizontalEdgeSign * LED_STRIP_EDGE_BUFFER;

  const verticalTrimmedZ =
    corner.position.z +
    vertical.offsetZ +
    vertical.direction * verticalEdgeSign * LED_STRIP_EDGE_BUFFER;

  const width = LED_STRIP_DEPTH + Math.abs(interiorX - horizontalTrimmedX);
  const depth = LED_STRIP_DEPTH + Math.abs(interiorZ - verticalTrimmedZ);

  if (width <= MIN_DIMENSION || depth <= MIN_DIMENSION) {
    return null;
  }

  return {
    center: {
      x: MathUtils.lerp(interiorX, horizontalTrimmedX, 0.5),
      z: MathUtils.lerp(interiorZ, verticalTrimmedZ, 0.5),
    },
    size: { width, depth },
  };
}
