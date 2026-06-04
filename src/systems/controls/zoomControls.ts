export type CameraZoomDirection = 1 | -1;

export type CameraZoomSource = 'keyboard' | 'wheel' | 'pinch';

export interface CameraZoomBounds {
  minZoom: number;
  maxZoom: number;
}

export interface CameraZoomStepOptions extends CameraZoomBounds {
  currentTarget: number;
  direction: CameraZoomDirection;
  source: CameraZoomSource;
  magnitude?: number;
}

export interface WheelZoomDeltaOptions extends CameraZoomBounds {
  currentTarget: number;
  deltaY: number;
  deltaMode: number;
}

export const CAMERA_ZOOM_KEYBOARD_STEP = 0.12;
const DOM_DELTA_PIXEL = 0;
const DOM_DELTA_LINE = 1;
const DOM_DELTA_PAGE = 2;
const WHEEL_LINE_HEIGHT_PX = 16;
const WHEEL_PAGE_HEIGHT_PX = 800;
const WHEEL_TRACKPAD_SENSITIVITY = 0.0045;
const WHEEL_MOUSE_SENSITIVITY = 0.0026;
const WHEEL_DELTA_CLAMP_PX = 900;
const MOUSE_WHEEL_DELTA_THRESHOLD_PX = 80;

export function clampCameraZoom(
  next: number,
  { minZoom, maxZoom }: CameraZoomBounds
): number {
  const fallback = Number.isFinite(minZoom) ? minZoom : 1;
  return Math.min(
    Math.max(Number.isFinite(next) ? next : fallback, minZoom),
    maxZoom
  );
}

export function applyCameraZoomStep({
  currentTarget,
  direction,
  source,
  magnitude = 1,
  minZoom,
  maxZoom,
}: CameraZoomStepOptions): number {
  const safeMagnitude = Number.isFinite(magnitude) ? Math.max(0, magnitude) : 0;
  if (safeMagnitude === 0) {
    return clampCameraZoom(currentTarget, { minZoom, maxZoom });
  }

  const baseStep = source === 'keyboard' ? CAMERA_ZOOM_KEYBOARD_STEP : 1;
  const scale = Math.exp(direction * baseStep * safeMagnitude);
  return clampCameraZoom(currentTarget * scale, { minZoom, maxZoom });
}

export function normalizeWheelDeltaY(
  deltaY: number,
  deltaMode: number
): number {
  if (!Number.isFinite(deltaY)) {
    return 0;
  }
  switch (deltaMode) {
    case DOM_DELTA_LINE:
      return deltaY * WHEEL_LINE_HEIGHT_PX;
    case DOM_DELTA_PAGE:
      return deltaY * WHEEL_PAGE_HEIGHT_PX;
    case DOM_DELTA_PIXEL:
    default:
      return deltaY;
  }
}

export function applyWheelCameraZoom({
  currentTarget,
  deltaY,
  deltaMode,
  minZoom,
  maxZoom,
}: WheelZoomDeltaOptions): number {
  const normalizedDeltaY = normalizeWheelDeltaY(deltaY, deltaMode);
  const clampedDeltaY = Math.max(
    -WHEEL_DELTA_CLAMP_PX,
    Math.min(WHEEL_DELTA_CLAMP_PX, normalizedDeltaY)
  );
  const sensitivity =
    Math.abs(clampedDeltaY) >= MOUSE_WHEEL_DELTA_THRESHOLD_PX
      ? WHEEL_MOUSE_SENSITIVITY
      : WHEEL_TRACKPAD_SENSITIVITY;
  return applyCameraZoomStep({
    currentTarget,
    direction: clampedDeltaY <= 0 ? 1 : -1,
    source: 'wheel',
    magnitude: Math.abs(clampedDeltaY) * sensitivity,
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

export function isKeyboardZoomShortcut(
  event: KeyboardEvent
): CameraZoomDirection | null {
  if (
    event.defaultPrevented ||
    event.metaKey ||
    event.ctrlKey ||
    event.altKey ||
    !event.shiftKey ||
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
