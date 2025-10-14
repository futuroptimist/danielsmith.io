import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  LinearFilter,
  MathUtils,
  RGBAFormat,
  SRGBColorSpace,
  Vector2,
} from 'three';

export interface InteriorLightmapTextures {
  readonly floor: DataTexture;
  readonly wall: DataTexture;
}

export interface InteriorLightmapOptions {
  readonly floorSize: { width: number; depth: number };
  readonly floorResolution?: number;
  readonly wallResolution?: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

const FLOOR_BASE_COLOR = new Color(0.46, 0.5, 0.58);
const FLOOR_DUSK_COLOR = new Color(0.7, 0.66, 0.62);
const FLOOR_WALKWAY_COLOR = new Color(0.9, 0.82, 0.68);
const FLOOR_PERIMETER_COLOR = new Color(0.34, 0.36, 0.42);

const WALL_BASE_COLOR = new Color(0.3, 0.33, 0.4);
const WALL_MID_COLOR = new Color(0.46, 0.5, 0.58);
const WALL_CROWN_COLOR = new Color(0.92, 0.86, 0.72);
const WALL_ACCENT_COLOR = new Color(0.64, 0.6, 0.54);

function createGradientTexture(
  resolution: Vector2,
  sample: (uv: Vector2, output: Color) => void
): DataTexture {
  const { x: width, y: height } = resolution;
  const pixels = new Uint8Array(width * height * 4);
  const color = new Color();
  const uv = new Vector2();
  let offset = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      uv.set(
        width <= 1 ? 0.5 : x / (width - 1),
        height <= 1 ? 0.5 : y / (height - 1)
      );
      sample(uv, color);
      const r = MathUtils.clamp(color.r, 0, 1);
      const g = MathUtils.clamp(color.g, 0, 1);
      const b = MathUtils.clamp(color.b, 0, 1);
      pixels[offset] = Math.round(r * 255);
      pixels[offset + 1] = Math.round(g * 255);
      pixels[offset + 2] = Math.round(b * 255);
      pixels[offset + 3] = 255;
      offset += 4;
    }
  }

  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function sampleFloorLightmap(uv: Vector2, output: Color, aspect: number): void {
  const offsetX = uv.x - 0.48;
  const offsetY = (uv.y - 0.42) * aspect;
  const radialDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const radialInfluence = smoothstep(0.65, 0.05, radialDistance);

  const edgeDistance = Math.min(
    Math.min(uv.x, 1 - uv.x),
    Math.min(uv.y, 1 - uv.y)
  );
  const edgeBlend = smoothstep(0.08, 0.25, edgeDistance);

  const walkwayWarmth = smoothstep(0.55, 0.98, uv.y);
  const easternGlow = smoothstep(0.45, 1, uv.x);
  const walkwayInfluence = walkwayWarmth * easternGlow;

  output.copy(FLOOR_PERIMETER_COLOR);
  output.lerp(FLOOR_BASE_COLOR, edgeBlend);
  output.lerp(FLOOR_DUSK_COLOR, radialInfluence * 0.85);
  output.lerp(FLOOR_WALKWAY_COLOR, walkwayInfluence * 0.9);
}

function sampleWallLightmap(uv: Vector2, output: Color): void {
  const vertical = uv.y;
  const horizontal = 1 - Math.abs(uv.x - 0.5) * 2;
  const midBlend = smoothstep(0.1, 0.75, vertical);
  const crownBlend = smoothstep(0.55, 1, vertical);
  const accentBlend =
    smoothstep(0.35, 0.95, vertical) * smoothstep(0.2, 1, horizontal);

  output.copy(WALL_BASE_COLOR);
  output.lerp(WALL_MID_COLOR, midBlend);
  output.lerp(WALL_ACCENT_COLOR, accentBlend * 0.6);
  output.lerp(WALL_CROWN_COLOR, crownBlend);
}

export function createInteriorLightmapTextures(
  options: InteriorLightmapOptions
): InteriorLightmapTextures {
  const floorResolution = Math.max(32, options.floorResolution ?? 256);
  const wallResolution = Math.max(32, options.wallResolution ?? 128);
  const aspect = Math.max(
    0.5,
    Math.min(options.floorSize.depth / options.floorSize.width || 1, 2.5)
  );

  const floor = createGradientTexture(
    new Vector2(floorResolution, floorResolution),
    (uv, color) => sampleFloorLightmap(uv, color, aspect)
  );
  floor.name = 'InteriorFloorLightmap';

  const wall = createGradientTexture(
    new Vector2(wallResolution, wallResolution),
    (uv, color) => sampleWallLightmap(uv, color)
  );
  wall.name = 'InteriorWallLightmap';

  return { floor, wall };
}

export function applyLightmapUv2(geometry: BufferGeometry): void {
  const uv = geometry.getAttribute('uv');
  if (!uv) {
    return;
  }
  if (geometry.getAttribute('uv2')) {
    return;
  }
  const source = uv as BufferAttribute;
  const cloneArray = new Float32Array(source.array as ArrayLike<number>);
  const clone = new BufferAttribute(
    cloneArray,
    source.itemSize,
    source.normalized
  );
  geometry.setAttribute('uv2', clone);
}
