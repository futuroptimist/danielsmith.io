import {
  BoxGeometry,
  BufferGeometry,
  DataTexture,
  SRGBColorSpace,
} from 'three';
import { describe, expect, it } from 'vitest';

import {
  applyLightmapUv2,
  createInteriorLightmapTextures,
} from '../scene/lighting/bakedLightmaps';

function sampleLuminance(texture: DataTexture, u: number, v: number): number {
  const image = texture.image as {
    data: Uint8Array;
    width: number;
    height: number;
  };
  const width = image.width;
  const height = image.height;
  const x = Math.min(width - 1, Math.max(0, Math.round(u * (width - 1))));
  const y = Math.min(height - 1, Math.max(0, Math.round(v * (height - 1))));
  const index = (y * width + x) * 4;
  const data = image.data as Uint8Array;
  return data[index] + data[index + 1] + data[index + 2];
}

describe('createInteriorLightmapTextures', () => {
  it('creates warm gradients that favour the greenhouse walkway', () => {
    const textures = createInteriorLightmapTextures({
      floorSize: { width: 32, depth: 48 },
    });

    const center = sampleLuminance(textures.floor, 0.5, 0.5);
    const walkway = sampleLuminance(textures.floor, 0.88, 0.92);
    const corner = sampleLuminance(textures.floor, 0.08, 0.08);

    expect(textures.floor.colorSpace).toBe(SRGBColorSpace);
    expect(walkway).toBeGreaterThan(center);
    expect(center).toBeGreaterThan(corner);
  });

  it('produces wall lightmaps that brighten toward the ceiling', () => {
    const textures = createInteriorLightmapTextures({
      floorSize: { width: 24, depth: 30 },
    });

    const bottom = sampleLuminance(textures.wall, 0.5, 0.08);
    const top = sampleLuminance(textures.wall, 0.5, 0.92);

    expect(textures.wall.colorSpace).toBe(SRGBColorSpace);
    expect(top).toBeGreaterThan(bottom);
  });

  it('yields ceiling lightmaps with warm edges and greenhouse emphasis', () => {
    const textures = createInteriorLightmapTextures({
      floorSize: { width: 28, depth: 42 },
    });

    const center = sampleLuminance(textures.ceiling, 0.5, 0.5);
    const edge = sampleLuminance(textures.ceiling, 0.12, 0.5);
    const greenhouseSide = sampleLuminance(textures.ceiling, 0.82, 0.92);

    expect(textures.ceiling.colorSpace).toBe(SRGBColorSpace);
    expect(edge).toBeGreaterThan(center);
    expect(greenhouseSide).toBeGreaterThan(edge);
  });

  it('strengthens perimeter bounce when edge warmth is increased', () => {
    const baseline = createInteriorLightmapTextures({
      floorSize: { width: 24, depth: 30 },
      edgeWarmth: 0.2,
    });
    const boosted = createInteriorLightmapTextures({
      floorSize: { width: 24, depth: 30 },
      edgeWarmth: 0.9,
    });

    const edge = sampleLuminance(baseline.floor, 0.04, 0.5);
    const edgeBoosted = sampleLuminance(boosted.floor, 0.04, 0.5);
    const center = sampleLuminance(baseline.floor, 0.5, 0.5);
    const centerBoosted = sampleLuminance(boosted.floor, 0.5, 0.5);

    const edgeDelta = edgeBoosted - edge;
    const centerDelta = centerBoosted - center;

    expect(edgeBoosted).toBeGreaterThan(edge);
    expect(edgeDelta).toBeGreaterThan(centerDelta);

    const wallEdge = sampleLuminance(baseline.wall, 0.12, 0.86);
    const wallEdgeBoosted = sampleLuminance(boosted.wall, 0.12, 0.86);
    const wallCenter = sampleLuminance(baseline.wall, 0.5, 0.86);
    const wallCenterBoosted = sampleLuminance(boosted.wall, 0.5, 0.86);

    const wallEdgeDelta = wallEdgeBoosted - wallEdge;
    const wallCenterDelta = wallCenterBoosted - wallCenter;

    expect(wallEdgeBoosted).toBeGreaterThan(wallEdge);
    expect(wallEdgeDelta).toBeGreaterThan(wallCenterDelta);
  });
});

describe('applyLightmapUv2', () => {
  it('duplicates uv attributes into uv2 when missing', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    const originalUv = geometry.getAttribute('uv');
    expect(originalUv).toBeDefined();
    expect(geometry.getAttribute('uv2')).toBeUndefined();

    applyLightmapUv2(geometry);

    const uv2 = geometry.getAttribute('uv2');
    expect(uv2).toBeDefined();
    expect(uv2?.itemSize).toBe(originalUv?.itemSize);
    expect(uv2).not.toBe(originalUv);
  });

  it('leaves existing uv2 attributes untouched', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    applyLightmapUv2(geometry);
    const uv2Before = geometry.getAttribute('uv2');
    applyLightmapUv2(geometry);
    const uv2After = geometry.getAttribute('uv2');
    expect(uv2After).toBe(uv2Before);
  });

  it('does nothing when geometry lacks uv data', () => {
    const geometry = new BufferGeometry();
    expect(() => applyLightmapUv2(geometry)).not.toThrow();
    expect(geometry.getAttribute('uv2')).toBeUndefined();
  });
});
