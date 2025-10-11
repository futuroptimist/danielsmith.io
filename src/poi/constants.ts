export const POI_SCALE = 2;

// Vertical offset (unscaled) applied above the orb radius to ensure
// the bespoke 3D model beneath remains visible from the camera.
export const POI_ORB_VERTICAL_OFFSET = 0.3;

export const scalePoiValue = (value: number): number => value * POI_SCALE;
