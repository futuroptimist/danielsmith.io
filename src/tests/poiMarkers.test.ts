import { CylinderGeometry, MeshStandardMaterial, Color } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { scalePoiValue } from '../scene/poi/constants';
import { createPoiInstances } from '../scene/poi/markers';
import type { PoiDefinition } from '../scene/poi/types';

describe('createPoiInstances', () => {
  const baseSummary = 'Automation-ready showcase artifact.';

  let originalGetContext:
    | ((
        this: HTMLCanvasElement,
        contextId: string,
        ...args: unknown[]
      ) => CanvasRenderingContext2D | null)
    | undefined;

  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContextShim(
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ): CanvasRenderingContext2D | null {
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
          fillText: () => {
            /* noop */
          },
          measureText: (text: string) => ({ width: text.length * 10 }),
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
      return originalGetContext
        ? originalGetContext.call(this, contextId, ...args)
        : null;
    };
  });

  afterAll(() => {
    if (originalGetContext) {
      HTMLCanvasElement.prototype.getContext = originalGetContext;
    } else {
      delete (
        HTMLCanvasElement.prototype as {
          getContext?: typeof originalGetContext;
        }
      ).getContext;
    }
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
    expect(instance.labelBaseHeight).toBeGreaterThan(instance.orbBaseHeight);
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
});
