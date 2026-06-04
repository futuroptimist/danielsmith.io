export type CameraZoomDirection = 'in' | 'out';
export type CameraZoomSource = 'keyboard' | 'wheel' | 'pinch';

export const CAMERA_ZOOM_KEYBOARD_STEP = 1.12;
export const CAMERA_ZOOM_WHEEL_PIXEL_SENSITIVITY = 0.0035;
export const CAMERA_ZOOM_TRACKPAD_PIXEL_SENSITIVITY = 0.014;
export const CAMERA_ZOOM_WHEEL_LINE_HEIGHT = 16;
export const CAMERA_ZOOM_WHEEL_PAGE_HEIGHT = 800;
export const CAMERA_ZOOM_TRACKPAD_DELTA_THRESHOLD = 50;

export function clampCameraZoomTarget(
  next: number,
  minZoom: number,
  maxZoom: number
): number {
  if (!Number.isFinite(next)) {
    return minZoom;
  }
  return Math.min(Math.max(next, minZoom), maxZoom);
}

export function normalizeWheelDeltaY(event: WheelEvent): number {
  const deltaY = Number.isFinite(event.deltaY) ? event.deltaY : 0;
  switch (event.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return deltaY * CAMERA_ZOOM_WHEEL_LINE_HEIGHT;
    case WheelEvent.DOM_DELTA_PAGE:
      return deltaY * CAMERA_ZOOM_WHEEL_PAGE_HEIGHT;
    case WheelEvent.DOM_DELTA_PIXEL:
    default:
      return deltaY;
  }
}

export function computeWheelZoomTarget(
  currentZoom: number,
  event: WheelEvent,
  minZoom: number,
  maxZoom: number
): number {
  const normalizedDeltaY = normalizeWheelDeltaY(event);
  const sensitivity =
    event.deltaMode === WheelEvent.DOM_DELTA_PIXEL &&
    Math.abs(normalizedDeltaY) < CAMERA_ZOOM_TRACKPAD_DELTA_THRESHOLD
      ? CAMERA_ZOOM_TRACKPAD_PIXEL_SENSITIVITY
      : CAMERA_ZOOM_WHEEL_PIXEL_SENSITIVITY;
  const nextZoom = currentZoom * Math.exp(-normalizedDeltaY * sensitivity);
  return clampCameraZoomTarget(nextZoom, minZoom, maxZoom);
}

export function applyCameraZoomStep(
  currentZoom: number,
  direction: CameraZoomDirection,
  minZoom: number,
  maxZoom: number,
  step = CAMERA_ZOOM_KEYBOARD_STEP
): number {
  const multiplier = direction === 'in' ? step : 1 / step;
  return clampCameraZoomTarget(currentZoom * multiplier, minZoom, maxZoom);
}

export function isKeyboardZoomShortcut(
  event: KeyboardEvent
): CameraZoomDirection | null {
  if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
    return null;
  }
  if (event.code === 'Equal') {
    return 'in';
  }
  if (event.code === 'Minus') {
    return 'out';
  }
  return null;
}
