import {
  Box3,
  Color,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Vector3,
} from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { FLOOR_PLAN_LEVELS } from '../assets/floorPlan';
import {
  createFloorVisibilityController,
  createPoiFloorResolver,
} from '../scene/floors/visibilityController';
import { getSceneDetailPolicy } from '../scene/graphics/sceneDetailPolicy';
import { scalePoiValue } from '../scene/poi/constants';
import {
  createPoiInstances,
  createPoiLabelTexture,
  updatePoiInstanceDefinition,
} from '../scene/poi/markers';
import { poiRegistry } from '../scene/poi/registry';
import type { PoiDefinition } from '../scene/poi/types';
import { createFlywheelShowpiece } from '../scene/structures/flywheel';

describe('createPoiInstances', () => {
  const baseSummary = 'Automation-ready showcase artifact.';
  let fillTextLog: string[] = [];

  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContextShim(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ) {
      if (contextId === '2d') {
        const gradient = {
          addColorStop: () => {
            /* noop */
          },
        };
        const context: Partial<CanvasRenderingContext2D> = {
          canvas: this,
          clearRect: () => {
            /* noop */
          },
          fillRect: () => {
            /* noop */
          },
          beginPath: () => {
            /* noop */
          },
          arc: () => {
            /* noop */
          },
          closePath: () => {
            /* noop */
          },
          moveTo: () => {
            /* noop */
          },
          lineTo: () => {
            /* noop */
          },
          quadraticCurveTo: () => {
            /* noop */
          },
          fill: () => {
            /* noop */
          },
          stroke: () => {
            /* noop */
          },
          fillText: (text: string) => {
            fillTextLog.push(text);
          },
          measureText: (text: string) =>
            ({ width: text.length * 10 }) as TextMetrics,
          createLinearGradient: () => gradient as CanvasGradient,
          set lineWidth(_value: number) {
            /* noop */
          },
          set font(_value: string) {
            /* noop */
          },
          set textAlign(_value: CanvasTextAlign) {
            /* noop */
          },
          set textBaseline(_value: CanvasTextBaseline) {
            /* noop */
          },
          set fillStyle(_value: string | CanvasGradient | CanvasPattern) {
            /* noop */
          },
          set strokeStyle(_value: string | CanvasGradient | CanvasPattern) {
            /* noop */
          },
        };
        return context as CanvasRenderingContext2D;
      }
      return originalGetContext.call(
        this,
        contextId as Parameters<typeof originalGetContext>[0],
        ...(args as [])
      );
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  const createDefinition = (
    definition: Partial<PoiDefinition>
  ): PoiDefinition => ({
    id: 'gitshelves-living-room-installation',
    title: 'Gitshelves Installation',
    summary: baseSummary,
    interactionPrompt: `Inspect ${
      definition.title ?? 'Gitshelves Installation'
    }`,
    category: 'project',
    interaction: 'inspect',
    roomId: 'livingRoom',
    position: { x: 0, y: 0, z: 0 },
    headingRadians: 0,
    interactionRadius: 2.4,
    footprint: { width: 2.8, depth: 2.2 },
    ...definition,
  });

  it('draws marker label textures as title-only in-world cues', () => {
    fillTextLog = [];
    const definition = createDefinition({
      title: 'Gitshelves',
      summary: 'Dense implementation notes remain in the 2D overlay.',
      status: 'prototype',
      outcome: { label: 'Outcome', value: 'Reduced shelf drift 42%' },
      metrics: [{ label: 'Impact', value: 'Cataloged 200 repos' }],
    });

    createPoiLabelTexture(definition);
    expect(fillTextLog).toEqual(['Gitshelves']);
    const renderedText = fillTextLog.join(' ');
    expect(renderedText).not.toContain(definition.summary);
    expect(renderedText).not.toContain('Reduced shelf drift');
    expect(renderedText).not.toContain('Cataloged 200 repos');
    expect(renderedText).not.toContain('Prototype');
  });

  it('updates existing marker label textures when localized definitions change', () => {
    fillTextLog = [];
    const [instance] = createPoiInstances([
      createDefinition({ title: 'Gitshelves' }),
    ]);
    expect(fillTextLog.join(' ')).toBe('Gitshelves');

    fillTextLog = [];
    updatePoiInstanceDefinition(
      instance,
      createDefinition({ title: '⟦Gitshelves⟧' })
    );

    expect(instance.definition.title).toBe('⟦Gitshelves⟧');
    expect(fillTextLog.join(' ')).toBe('⟦Gitshelves⟧');
  });

  it('seeds display POI model roots from the highlighted model mesh', () => {
    const hitArea = new Mesh(
      new PlaneGeometry(2, 1),
      new MeshBasicMaterial({ transparent: true, opacity: 0 })
    );
    const highlightMesh = new Mesh(
      new PlaneGeometry(2, 1),
      new MeshBasicMaterial()
    );
    const [instance] = createPoiInstances(
      [createDefinition({ id: 'futuroptimist-living-room-tv' })],
      {
        'futuroptimist-living-room-tv': {
          mode: 'display',
          hitArea,
          highlight: {
            mesh: highlightMesh,
            material: highlightMesh.material,
            baseOpacity: 0.1,
            focusOpacity: 0.55,
          },
        },
      }
    );

    expect(instance.visualMode).toBe('display');
    expect(instance.modelRoots).toEqual([highlightMesh]);
  });

  it('preserves existing title-only marker labels without ellipsizing them', () => {
    for (const title of ['Gitshelves', 'danielsmith.io']) {
      fillTextLog = [];
      createPoiLabelTexture(createDefinition({ title }));

      expect(fillTextLog.join(' ')).toBe(title);
      expect(fillTextLog.join(' ')).not.toContain('…');
    }
  });

  it('adds an ellipsis when long marker titles exceed the two-line cap', () => {
    fillTextLog = [];
    const definition = createDefinition({
      title:
        'Extremely Detailed Portfolio Installation With Localization Friendly Title Copy That Keeps Going Beyond Two Lines',
    });

    createPoiLabelTexture(definition);

    expect(fillTextLog).toHaveLength(2);
    expect(fillTextLog.at(-1)).toMatch(/…$/);
  });

  it('applies hologram pedestal styling when configured', () => {
    const pedestalHeight = 1.6;
    const orbColorHex = 0x1355aa;
    const orbEmissiveHex = 0x1be3ff;
    const orbHighlightHex = 0xa7fbff;
    const accentColorHex = 0x44f3c7;

    const hologramDefinition = createDefinition({
      id: 'flywheel-studio-flywheel',
      roomId: 'studio',
      footprint: { width: 2.6, depth: 2.2 },
      pedestal: {
        type: 'hologram',
        height: pedestalHeight,
        radiusScale: 0.88,
        bodyColor: 0x0f1a2a,
        bodyOpacity: 0.6,
        emissiveColor: 0x17b8ff,
        emissiveIntensity: 0.86,
        accentColor: accentColorHex,
        accentEmissiveColor: 0x8efff0,
        accentEmissiveIntensity: 1.1,
        accentOpacity: 0.9,
        ringColor: 0x6df4ff,
        ringOpacity: 0.64,
        orbColor: orbColorHex,
        orbEmissiveColor: orbEmissiveHex,
        orbHighlightColor: orbHighlightHex,
        orbEmissiveIntensity: 1.18,
      },
    });

    const [instance] = createPoiInstances([hologramDefinition]);

    expect(instance.accentMaterial).toBeInstanceOf(MeshStandardMaterial);
    expect(instance.accentBaseColor?.getHex()).toBe(accentColorHex);
    const expectedFocus = new Color(accentColorHex)
      .lerp(new Color(0xffffff), 0.35)
      .getHex();
    expect(instance.accentFocusColor?.getHex()).toBe(expectedFocus);

    expect(instance.orbMaterial).toBeInstanceOf(MeshStandardMaterial);
    expect(instance.orbMaterial?.color.getHex()).toBe(orbColorHex);
    expect(instance.orbMaterial?.emissive.getHex()).toBe(orbEmissiveHex);
    expect(instance.orbMaterial?.emissiveIntensity).toBeCloseTo(1.18, 5);
    expect(instance.orbEmissiveBase?.getHex()).toBe(orbEmissiveHex);
    expect(instance.orbEmissiveHighlight?.getHex()).toBe(orbHighlightHex);

    const hitGeometry = instance.hitArea.geometry as CylinderGeometry;
    expect(hitGeometry.parameters.height).toBeCloseTo(
      scalePoiValue(0.32) + pedestalHeight + scalePoiValue(0.24),
      5
    );
    expect(instance.orbBaseHeight).toBeGreaterThan(pedestalHeight);
    expect(instance.labelBaseHeight ?? 0).toBeGreaterThan(
      instance.orbBaseHeight ?? 0
    );
  });

  it('keeps the Flywheel registry marker from rendering an occluding hologram pedestal', () => {
    const definition = poiRegistry.getById('flywheel-studio-flywheel');
    if (!definition) {
      throw new Error('Expected Flywheel POI definition to be registered.');
    }
    const [instance] = createPoiInstances([definition]);

    expect(definition.pedestal).toBeUndefined();
    expect(
      instance.group.getObjectByName(
        'POI_PedestalBody:flywheel-studio-flywheel'
      )
    ).toBeUndefined();
    expect(
      instance.group.getObjectByName(
        'POI_PedestalAccent:flywheel-studio-flywheel'
      )
    ).toBeUndefined();
    expect(
      instance.group.getObjectByName(
        'POI_PedestalRing:flywheel-studio-flywheel'
      )
    ).toBeUndefined();

    const showpiece = createFlywheelShowpiece({
      position: { x: 0, z: 0 },
      roomBounds: { minX: -6, maxX: 6, minZ: -6, maxZ: 6 },
    });
    const rim = showpiece.group.getObjectByName('FlywheelHeavyRim') as Object3D;
    showpiece.group.updateWorldMatrix(true, true);
    instance.group.updateWorldMatrix(true, true);
    const rimSize = new Box3().setFromObject(rim).getSize(new Vector3());
    const rimFaceArea = rimSize.x * rimSize.y;

    instance.group.traverse((object) => {
      if (
        !(object instanceof Mesh) ||
        object === instance.orb ||
        object === instance.label
      ) {
        return;
      }
      if (object.name === `POI_HIT:${definition.id}`) {
        return;
      }
      const material = Array.isArray(object.material)
        ? object.material[0]
        : object.material;
      if (!material.transparent || material.opacity <= 0) {
        return;
      }
      const size = new Box3().setFromObject(object).getSize(new Vector3());
      const projectedFaceArea = size.x * size.y;
      expect(projectedFaceArea).toBeLessThan(rimFaceArea * 0.2);
    });

    expect(instance.orb).toBeInstanceOf(Mesh);
    expect(instance.label).toBeInstanceOf(Mesh);
    expect(instance.orbBaseHeight ?? 0).toBeGreaterThan(2.2);
    expect(instance.labelBaseHeight ?? 0).toBeGreaterThan(
      instance.orbBaseHeight ?? 0
    );
    showpiece.dispose();
  });

  it('keeps default pedestal styling when no hologram config is provided', () => {
    const defaultDefinition = createDefinition({
      id: 'gitshelves-living-room-installation',
    });

    const [instance] = createPoiInstances([defaultDefinition]);
    expect(instance.accentMaterial).toBeUndefined();
    expect(instance.accentBaseColor).toBeUndefined();
    expect(instance.accentFocusColor).toBeUndefined();

    const hitGeometry = instance.hitArea.geometry as CylinderGeometry;
    expect(hitGeometry.parameters.height).toBeCloseTo(
      scalePoiValue(0.32) + scalePoiValue(0.24),
      5
    );
  });

  it('uses low-poly performance marker geometry without changing hit collider bounds', () => {
    const definition = createDefinition({
      id: 'flywheel-studio-flywheel',
      footprint: { width: 2.6, depth: 2.2 },
      pedestal: {
        type: 'hologram',
        height: 1.6,
        radiusScale: 0.88,
      },
    });
    const [balanced] = createPoiInstances([definition]);
    const [performance] = createPoiInstances(
      [definition],
      {},
      {
        detailPolicy: getSceneDetailPolicy('performance'),
      }
    );

    const balancedHitGeometry = balanced.hitArea.geometry as CylinderGeometry;
    const performanceHitGeometry = performance.hitArea
      .geometry as CylinderGeometry;
    const balancedOrbGeometry = balanced.orb?.geometry as SphereGeometry;
    const performanceOrbGeometry = performance.orb?.geometry as SphereGeometry;

    expect(performanceHitGeometry.parameters.radialSegments).toBeLessThan(
      balancedHitGeometry.parameters.radialSegments / 3
    );
    expect(performanceOrbGeometry.parameters.widthSegments).toBeLessThan(
      balancedOrbGeometry.parameters.widthSegments / 3
    );
    expect(performance.collider).toEqual(balanced.collider);
    expect(performance.hitArea.name).toBe(`POI_HIT:${definition.id}`);
  });

  it('hides ground-floor marker labels and checkmarks when the upper floor is active', () => {
    const [instance] = createPoiInstances([
      createDefinition({ id: 'flywheel-studio-flywheel', roomId: 'studio' }),
    ]);
    if (
      !instance.label ||
      !instance.labelMaterial ||
      !instance.visitedHighlight
    ) {
      throw new Error(
        'Expected default POI to include floor-hideable visuals.'
      );
    }
    instance.label.visible = true;
    instance.labelMaterial.opacity = 0.72;
    instance.visitedHighlight.mesh.visible = true;
    instance.visitedHighlight.material.opacity = 0.55;

    createFloorVisibilityController({
      initialFloorId: 'upper',
      poiInstances: [instance],
      getPoiFloorId: createPoiFloorResolver(FLOOR_PLAN_LEVELS),
    });

    expect(instance.group.visible).toBe(false);
    expect(instance.label.visible).toBe(false);
    expect(instance.labelMaterial.opacity).toBe(0);
    expect(instance.visitedHighlight.mesh.visible).toBe(false);
    expect(instance.visitedHighlight.material.opacity).toBe(0);
  });
});
