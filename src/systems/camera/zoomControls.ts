import { MathUtils } from 'three';

export type CameraZoomStepSource = 'keyboard' | 'wheel' | 'pinch' | 'test';

export const WHEEL_DELTA_PIXEL = 0;
export const WHEEL_DELTA_LINE = 1;
export const WHEEL_DELTA_PAGE = 2;
export const WHEEL_DELTA_LINE_HEIGHT_PX = 16;
export const WHEEL_DELTA_PAGE_HEIGHT_PX = 800;
export const CAMERA_ZOOM_WHEEL_PIXEL_SENSITIVITY = 0.0022;
export const CAMERA_ZOOM_TRACKPAD_MULTIPLIER = 3;
export const CAMERA_ZOOM_KEYBOARD_FACTOR = 1.12;

export interface CameraZoomBounds {
  minZoom: number;
  maxZoom: number;
}

export interface CameraZoomStepOptions extends CameraZoomBounds {
  currentZoomTarget: number;
  direction: 1 | -1;
  source: CameraZoomStepSource;
  factor?: number;
}

export interface WheelZoomStepOptions extends CameraZoomBounds {
  currentZoomTarget: number;
  deltaY: number;
  deltaMode?: number;
  viewportHeight?: number;
}

export interface PinchZoomOptions extends CameraZoomBounds {
  startZoomTarget: number;
  startDistance: number;
  currentDistance: number;
}

export function clampCameraZoom(
  value: number,
  bounds: CameraZoomBounds
): number {
  const fallback = bounds.minZoom;
  const finiteValue = Number.isFinite(value) ? value : fallback;
  return MathUtils.clamp(finiteValue, bounds.minZoom, bounds.maxZoom);
}

export function applyCameraZoomStep({
  currentZoomTarget,
  direction,
  minZoom,
  maxZoom,
  factor = CAMERA_ZOOM_KEYBOARD_FACTOR,
}: CameraZoomStepOptions): number {
  const boundedCurrent = clampCameraZoom(currentZoomTarget, {
    minZoom,
    maxZoom,
  });
  const multiplier = direction > 0 ? factor : 1 / factor;
  return clampCameraZoom(boundedCurrent * multiplier, { minZoom, maxZoom });
}

export function normalizeWheelDeltaY(
  deltaY: number,
  deltaMode = WHEEL_DELTA_PIXEL,
  viewportHeight = WHEEL_DELTA_PAGE_HEIGHT_PX
): number {
  if (!Number.isFinite(deltaY)) {
    return 0;
  }
  if (deltaMode === WHEEL_DELTA_LINE) {
    return deltaY * WHEEL_DELTA_LINE_HEIGHT_PX;
  }
  if (deltaMode === WHEEL_DELTA_PAGE) {
    const pageHeight =
      Number.isFinite(viewportHeight) && viewportHeight > 0
        ? viewportHeight
        : WHEEL_DELTA_PAGE_HEIGHT_PX;
    return deltaY * pageHeight;
  }
  return deltaY;
}

export function applyWheelCameraZoomStep({
  currentZoomTarget,
  deltaY,
  deltaMode = WHEEL_DELTA_PIXEL,
  viewportHeight,
  minZoom,
  maxZoom,
}: WheelZoomStepOptions): number {
  const normalizedDeltaY = normalizeWheelDeltaY(
    deltaY,
    deltaMode,
    viewportHeight
  );
  if (normalizedDeltaY === 0) {
    return clampCameraZoom(currentZoomTarget, { minZoom, maxZoom });
  }
  const isHighResolutionTrackpadDelta =
    deltaMode === WHEEL_DELTA_PIXEL && Math.abs(normalizedDeltaY) < 40;
  const multiplier = isHighResolutionTrackpadDelta
    ? CAMERA_ZOOM_TRACKPAD_MULTIPLIER
    : 1;
  const next =
    currentZoomTarget *
    Math.exp(
      -normalizedDeltaY * CAMERA_ZOOM_WHEEL_PIXEL_SENSITIVITY * multiplier
    );
  return clampCameraZoom(next, { minZoom, maxZoom });
}

export function applyPinchCameraZoom({
  startZoomTarget,
  startDistance,
  currentDistance,
  minZoom,
  maxZoom,
}: PinchZoomOptions): number {
  if (
    !Number.isFinite(startDistance) ||
    !Number.isFinite(currentDistance) ||
    startDistance <= 0 ||
    currentDistance <= 0
  ) {
    return clampCameraZoom(startZoomTarget, { minZoom, maxZoom });
  }
  return clampCameraZoom(startZoomTarget * (currentDistance / startDistance), {
    minZoom,
    maxZoom,
  });
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  return (
    target.isContentEditable ||
    target.hasAttribute('contenteditable') ||
    target.closest('[contenteditable]') !== null ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select'
  );
}

export function getKeyboardZoomDirection(event: KeyboardEvent): 1 | -1 | null {
  if (
    event.defaultPrevented ||
    !event.shiftKey ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    isTextEntryTarget(event.target)
  ) {
    return null;
  }
  if (event.code === 'Equal') {
    return 1;
  }
  if (event.code === 'Minus') {
    return -1;
  }
  return null;
}
