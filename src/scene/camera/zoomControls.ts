import { MathUtils } from 'three';

export const CAMERA_ZOOM_KEYBOARD_STEP = 0.12;
export const CAMERA_ZOOM_WHEEL_PIXEL_SENSITIVITY = 0.00125;
export const CAMERA_ZOOM_TRACKPAD_MULTIPLIER = 3.5;
export const CAMERA_ZOOM_LINE_HEIGHT_PX = 16;
export const CAMERA_ZOOM_PAGE_HEIGHT_PX = 800;
export const WHEEL_DELTA_PIXEL = 0;
export const WHEEL_DELTA_LINE = 1;
export const WHEEL_DELTA_PAGE = 2;

export type CameraZoomStepDirection = 1 | -1;
export type CameraZoomSource = 'keyboard' | 'wheel' | 'pinch';

export interface CameraZoomBounds {
  minZoom: number;
  maxZoom: number;
}

export interface WheelZoomInput {
  deltaY: number;
  deltaMode?: number;
}

export function clampCameraZoomTarget(
  next: number,
  { minZoom, maxZoom }: CameraZoomBounds
): number {
  return MathUtils.clamp(next, minZoom, maxZoom);
}

export function applyCameraZoomStep(
  currentTarget: number,
  direction: CameraZoomStepDirection,
  bounds: CameraZoomBounds,
  step = CAMERA_ZOOM_KEYBOARD_STEP
): number {
  const factor = 1 + Math.max(0, step);
  const next = direction > 0 ? currentTarget * factor : currentTarget / factor;
  return clampCameraZoomTarget(next, bounds);
}

export function normalizeWheelDeltaY(event: WheelZoomInput): number {
  if (!Number.isFinite(event.deltaY)) {
    return 0;
  }
  switch (event.deltaMode) {
    case WHEEL_DELTA_LINE:
      return event.deltaY * CAMERA_ZOOM_LINE_HEIGHT_PX;
    case WHEEL_DELTA_PAGE:
      return event.deltaY * CAMERA_ZOOM_PAGE_HEIGHT_PX;
    case WHEEL_DELTA_PIXEL:
    default:
      return event.deltaY;
  }
}

function getWheelDeltaMultiplier(deltaY: number): number {
  return Math.abs(deltaY) > 0 && Math.abs(deltaY) < 40
    ? CAMERA_ZOOM_TRACKPAD_MULTIPLIER
    : 1;
}

export function applyCameraWheelZoom(
  currentTarget: number,
  event: WheelZoomInput,
  bounds: CameraZoomBounds
): number {
  const normalizedDeltaY = normalizeWheelDeltaY(event);
  if (normalizedDeltaY === 0) {
    return clampCameraZoomTarget(currentTarget, bounds);
  }
  const multiplier = getWheelDeltaMultiplier(normalizedDeltaY);
  const exponent =
    -normalizedDeltaY * CAMERA_ZOOM_WHEEL_PIXEL_SENSITIVITY * multiplier;
  return clampCameraZoomTarget(currentTarget * Math.exp(exponent), bounds);
}

export function applyCameraPinchZoom(
  pinchStartZoomTarget: number,
  pinchStartDistance: number,
  currentDistance: number,
  bounds: CameraZoomBounds
): number {
  if (
    !Number.isFinite(pinchStartZoomTarget) ||
    !Number.isFinite(pinchStartDistance) ||
    !Number.isFinite(currentDistance) ||
    pinchStartDistance <= 0 ||
    currentDistance <= 0
  ) {
    return clampCameraZoomTarget(pinchStartZoomTarget, bounds);
  }
  return clampCameraZoomTarget(
    pinchStartZoomTarget * (currentDistance / pinchStartDistance),
    bounds
  );
}
