export const INITIAL_AVATAR_VIEWPORT_HEIGHT_RATIO = 0.5;

export interface InitialCameraFramingInput {
  avatarHeight: number;
  baseCameraSize: number;
  cameraWorldUpY: number;
  minZoom: number;
  maxZoom: number;
  targetViewportHeightRatio?: number;
}

export interface InitialCameraFraming {
  avatarHeight: number;
  baseCameraSize: number;
  cameraWorldUpY: number;
  targetViewportHeightRatio: number;
  unclampedZoom: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  effectiveViewportHeightRatio: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function resolveInitialAvatarCameraFraming({
  avatarHeight,
  baseCameraSize,
  cameraWorldUpY,
  minZoom,
  maxZoom,
  targetViewportHeightRatio = INITIAL_AVATAR_VIEWPORT_HEIGHT_RATIO,
}: InitialCameraFramingInput): InitialCameraFraming {
  const safeAvatarHeight =
    Number.isFinite(avatarHeight) && avatarHeight > 0 ? avatarHeight : 1;
  const safeBaseCameraSize =
    Number.isFinite(baseCameraSize) && baseCameraSize > 0 ? baseCameraSize : 1;
  const safeCameraWorldUpY =
    Number.isFinite(cameraWorldUpY) && Math.abs(cameraWorldUpY) > 1e-6
      ? Math.abs(cameraWorldUpY)
      : 1;
  const safeMinZoom = Number.isFinite(minZoom) && minZoom > 0 ? minZoom : 1;
  const safeMaxZoom =
    Number.isFinite(maxZoom) && maxZoom >= safeMinZoom ? maxZoom : safeMinZoom;
  const safeTargetViewportHeightRatio =
    Number.isFinite(targetViewportHeightRatio) && targetViewportHeightRatio > 0
      ? targetViewportHeightRatio
      : INITIAL_AVATAR_VIEWPORT_HEIGHT_RATIO;
  const projectedAvatarHeight = safeAvatarHeight * safeCameraWorldUpY;
  const unclampedZoom =
    (safeTargetViewportHeightRatio * 2 * safeBaseCameraSize) /
    projectedAvatarHeight;
  const zoom = clamp(unclampedZoom, safeMinZoom, safeMaxZoom);

  return {
    avatarHeight: safeAvatarHeight,
    baseCameraSize: safeBaseCameraSize,
    cameraWorldUpY: safeCameraWorldUpY,
    targetViewportHeightRatio: safeTargetViewportHeightRatio,
    unclampedZoom,
    zoom,
    minZoom: safeMinZoom,
    maxZoom: safeMaxZoom,
    effectiveViewportHeightRatio:
      (projectedAvatarHeight * zoom) / (2 * safeBaseCameraSize),
  };
}
