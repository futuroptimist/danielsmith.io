import { Box3, Mesh, Object3D, PlaneGeometry, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import {
  getPoiPhysicalMetadata,
  type PoiPhysicalMetadata,
} from '../scene/poi/physicalMetadata';
import type { PoiId } from '../scene/poi/types';
import { createSugarkubeDeployment } from '../scene/structures/sugarkubeDeployment';
import {
  EXPECTED_27_INCH_MONITOR_TO_PI_WIDTH_RATIO,
  SUGARKUBE_PI_BOARD_SCENE_WIDTH,
  createTokenPlaceWorkstation,
} from '../scene/structures/tokenPlaceWorkstation';

const originalGetContext = HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    fillStyle: '',
  })) as unknown as HTMLCanvasElement['getContext'];
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

const PHYSICAL_POI_IDS = [
  'tokenplace-studio-cluster',
  'sugarkube-backyard-greenhouse',
  'danielsmith-portfolio-table',
] as const satisfies PoiId[];

const FIT_TOLERANCE = 0.05;

const expectPositiveFiniteBounds = (
  bounds: PoiPhysicalMetadata['intendedSceneBounds']
) => {
  expect(Number.isFinite(bounds.width)).toBe(true);
  expect(Number.isFinite(bounds.depth)).toBe(true);
  expect(Number.isFinite(bounds.height)).toBe(true);
  expect(bounds.width).toBeGreaterThan(0);
  expect(bounds.depth).toBeGreaterThan(0);
  expect(bounds.height).toBeGreaterThan(0);
};

const planeSize = (mesh: Mesh): { width: number; height: number } => {
  const geometry = mesh.geometry as PlaneGeometry;
  const { width, height } = geometry.parameters;
  return { width, height };
};

const visibleBounds = (root: Object3D) => {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const size = new Vector3();
  box.getSize(size);
  return size;
};

const expectFitsContract = (root: Object3D, metadata: PoiPhysicalMetadata) => {
  const size = visibleBounds(root);
  expect(size.x).toBeLessThanOrEqual(
    metadata.intendedSceneBounds.width + FIT_TOLERANCE
  );
  expect(size.z).toBeLessThanOrEqual(
    metadata.intendedSceneBounds.depth + FIT_TOLERANCE
  );
  expect(size.y).toBeLessThanOrEqual(
    metadata.intendedSceneBounds.height + FIT_TOLERANCE
  );
};

describe('POI physical metadata', () => {
  it('defines positive bottom-center size contracts for physical POIs', () => {
    PHYSICAL_POI_IDS.forEach((poiId) => {
      const metadata = getPoiPhysicalMetadata(poiId);
      expect(metadata).toBeDefined();
      expect(metadata?.anchor).toBe('bottom-center');
      expect(metadata?.realWorldReference.length).toBeGreaterThan(0);
      expectPositiveFiniteBounds(metadata!.intendedSceneBounds);
      expectPositiveFiniteBounds(metadata!.realWorldDimensionsMeters!);
    });
  });

  it('keeps token.place real-world width larger than the Raspberry Pi reference', () => {
    const tokenPlace = getPoiPhysicalMetadata('tokenplace-studio-cluster')!;
    const sugarkube = getPoiPhysicalMetadata('sugarkube-backyard-greenhouse')!;

    // Two 27-inch 16:9 monitor active areas plus bezels/gap are roughly
    // 1.25m to 1.35m wide, while a Raspberry Pi 5 board is about 0.085m wide.
    expect(tokenPlace.realWorldDimensionsMeters!.width).toBeGreaterThan(1.25);
    expect(tokenPlace.realWorldDimensionsMeters!.width).toBeLessThan(1.35);
    expect(tokenPlace.realWorldDimensionsMeters!.width).toBeGreaterThan(
      sugarkube.realWorldDimensionsMeters!.width * 14
    );
  });

  it('keeps token.place visible bounds within its intended scene bounds without root scaling', () => {
    const build = createTokenPlaceWorkstation({
      position: { x: 0, y: 0, z: 0 },
      orientationRadians: 0,
      detailPolicy: getSceneDetailPolicy('balanced'),
    });

    const screenWidths = [0, 1].map((index) =>
      planeSize(
        build.group.getObjectByName(`TokenPlaceMonitorScreen-${index}`) as Mesh
      )
    );

    screenWidths.forEach(({ width }) => {
      expect(width / SUGARKUBE_PI_BOARD_SCENE_WIDTH).toBeCloseTo(
        EXPECTED_27_INCH_MONITOR_TO_PI_WIDTH_RATIO,
        2
      );
    });
    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expectFitsContract(
      build.group,
      getPoiPhysicalMetadata('tokenplace-studio-cluster')!
    );
    build.dispose();
  });

  it('keeps Sugarkube visible bounds within its intended scene bounds without root scaling', () => {
    const build = createSugarkubeDeployment({
      position: { x: -8.74, y: 0, z: -22.92 },
      orientationRadians: 0,
      detailPolicy: getSceneDetailPolicy('balanced'),
      wallNetworkEndpoint: {
        x: -8.74,
        y: 0.48,
        z: -31.1,
        orientationRadians: 0,
      },
    });

    expect(build.group.scale.toArray()).toEqual([1, 1, 1]);
    expectFitsContract(
      build.group,
      getPoiPhysicalMetadata('sugarkube-backyard-greenhouse')!
    );
  });
});
