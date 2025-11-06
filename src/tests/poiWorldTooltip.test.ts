import { OrthographicCamera, Scene, Vector3 } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PoiDefinition } from '../scene/poi/types';
import {
  PoiWorldTooltip,
  type PoiWorldTooltipTarget,
} from '../scene/poi/worldTooltip';
import { GuidedTourPreference } from '../systems/guidedTour/preference';

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;

beforeAll(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function () {
    return createMockCanvasContext();
  };
});

afterAll(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function createMockCanvasContext(): CanvasRenderingContext2D {
  const fillTextLog: string[] = [];
  const context = {
    canvas: document.createElement('canvas'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    save: () => {},
    restore: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    measureText: (text: string) => ({ width: text.length * 12 }),
    fillText: (text: string) => {
      fillTextLog.push(text);
    },
  };
  (context as { __fillTextLog?: string[] }).__fillTextLog = fillTextLog;
  return context as unknown as CanvasRenderingContext2D;
}

function createPoiDefinition(
  overrides: Partial<PoiDefinition> = {}
): PoiDefinition {
  return {
    id: overrides.id ?? 'flywheel-studio-flywheel',
    title: overrides.title ?? 'Flywheel',
    summary:
      overrides.summary ??
      'A kinetic centerpiece with analytics overlays and automation callouts that guide every visitor.',
    interactionPrompt:
      overrides.interactionPrompt ?? `Inspect ${overrides.title ?? 'Flywheel'}`,
    category: overrides.category ?? 'project',
    interaction: overrides.interaction ?? 'inspect',
    roomId: overrides.roomId ?? 'studio',
    position: overrides.position ?? { x: 0, y: 0, z: 0 },
    headingRadians: overrides.headingRadians ?? 0,
    interactionRadius: overrides.interactionRadius ?? 3,
    footprint: overrides.footprint ?? { width: 2, depth: 2 },
    outcome: overrides.outcome ?? {
      label: 'Outcome',
      value: 'Accelerated deploys 24%',
    },
    metrics: overrides.metrics ?? [
      { label: 'Impact', value: 'Launch-ready' },
      { label: 'Tech', value: 'Three.js' },
    ],
    links: overrides.links ?? [{ label: 'Read more', href: '#' }],
    status: overrides.status,
    narration: overrides.narration,
  } as PoiDefinition;
}

function createTooltip() {
  const scene = new Scene();
  const camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(12, 14, 16);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  const preference = new GuidedTourPreference({
    storage: {
      getItem: () => null,
      setItem: () => {
        /* noop */
      },
    },
    windowTarget: window,
    defaultEnabled: true,
  });
  const tooltip = new PoiWorldTooltip({
    parent: scene,
    camera,
    guidedTourPreference: preference,
  });
  return { tooltip, camera, scene, preference };
}

function createTarget(
  poi: PoiDefinition,
  position: Vector3 | (() => Vector3)
): PoiWorldTooltipTarget {
  if (position instanceof Vector3) {
    return {
      poi,
      getAnchorPosition: (out: Vector3) => out.copy(position),
    };
  }
  return {
    poi,
    getAnchorPosition: (out: Vector3) => out.copy(position()),
  };
}

describe('PoiWorldTooltip', () => {
  it('shows hovered tooltip anchored to the provided world position', () => {
    const { tooltip, camera, preference } = createTooltip();
    const poi = createPoiDefinition({ status: 'prototype' });
    const anchor = new Vector3(1, 2, 3);
    const target = createTarget(poi, anchor);

    tooltip.setHovered(target);
    tooltip.update(0.016);

    const state = tooltip.getState();
    expect(state.mode).toBe('hovered');
    expect(state.poiId).toBe(poi.id);
    expect(state.visible).toBe(true);
    expect(state.opacity).toBeCloseTo(0.85, 1e-3);
    expect(tooltip.group.position.x).toBeCloseTo(anchor.x, 1e-4);
    expect(tooltip.group.position.y).toBeCloseTo(anchor.y + 0.6, 1e-4);
    expect(tooltip.group.position.z).toBeCloseTo(anchor.z, 1e-4);

    const forward = new Vector3(0, 0, 1).applyQuaternion(
      tooltip.group.quaternion
    );
    const toCamera = camera.position
      .clone()
      .sub(tooltip.group.position)
      .normalize();
    expect(forward.dot(toCamera)).toBeCloseTo(1, 1e-3);
    expect(tooltip.group.scale.x).toBeGreaterThan(0.74);

    tooltip.dispose();
    preference.dispose();
  });

  it('prefers the selected state over hover when both are set', () => {
    const { tooltip, preference } = createTooltip();
    const hoveredPoi = createPoiDefinition({ id: 'flywheel-studio-flywheel' });
    const selectedPoi = createPoiDefinition({
      id: 'jobbot-studio-terminal',
      title: 'Automation Flywheel Showcase with Extended Label',
    });

    tooltip.setHovered(createTarget(hoveredPoi, new Vector3(0, 1, 0)));
    tooltip.update(0.016);
    expect(tooltip.getState().mode).toBe('hovered');

    tooltip.setSelected(createTarget(selectedPoi, new Vector3(2, 3, -1)));
    tooltip.update(0.016);
    const state = tooltip.getState();
    expect(state.mode).toBe('selected');
    expect(state.poiId).toBe(selectedPoi.id);
    expect(state.opacity).toBeCloseTo(1, 1e-3);

    tooltip.dispose();
    preference.dispose();
  });

  it('re-renders the active card when metrics change', () => {
    const { tooltip, preference } = createTooltip();
    const poi = createPoiDefinition({
      id: 'flywheel-studio-flywheel',
      metrics: [
        { label: 'Stars', value: 'Fallback' },
        { label: 'Impact', value: 'Launch-ready' },
      ],
    });
    const target = createTarget(poi, new Vector3(0, 1, 0));

    tooltip.setSelected(target);
    tooltip.update(0.016);

    const context = (
      tooltip as unknown as {
        context: CanvasRenderingContext2D & { __fillTextLog: string[] };
      }
    ).context;
    const initialLength = context.__fillTextLog.length;

    if (poi.metrics?.[0]) {
      poi.metrics[0].value = 'Live 2,000';
    }

    tooltip.notifyPoiUpdated(poi.id);

    expect(context.__fillTextLog.length).toBeGreaterThan(initialLength);
    const newEntries = context.__fillTextLog.slice(initialLength);
    const metricEntry = newEntries.find((entry) =>
      entry.includes('Live 2,000')
    );
    expect(metricEntry).toBeDefined();
    expect(metricEntry).toContain('Impact');

    tooltip.dispose();
    preference.dispose();
  });

  it('falls back to the recommendation when no hover or selection is active', () => {
    const { tooltip, preference } = createTooltip();
    const recommendedPoi = createPoiDefinition({
      id: 'sugarkube-backyard-greenhouse',
    });
    tooltip.setIdleState(true);
    tooltip.setRecommendation(
      createTarget(recommendedPoi, new Vector3(-1, 0.5, 2))
    );
    tooltip.update(0.016);

    const state = tooltip.getState();
    expect(state.mode).toBe('recommended');
    expect(state.poiId).toBe(recommendedPoi.id);
    expect(state.opacity).toBeCloseTo(0.72, 1e-3);

    tooltip.dispose();
    preference.dispose();
  });

  it('suppresses recommendation rendering when guided tour is disabled', () => {
    const { tooltip, preference } = createTooltip();
    const recommendedPoi = createPoiDefinition({
      id: 'pr-reaper-backyard-console',
    });
    tooltip.setIdleState(true);
    preference.setEnabled(false, 'test');
    tooltip.setRecommendation(
      createTarget(recommendedPoi, new Vector3(-1, 0.5, 2))
    );
    tooltip.update(0.016);

    const disabledState = tooltip.getState();
    expect(disabledState.mode).toBeNull();
    expect(disabledState.visible).toBe(false);

    preference.setEnabled(true, 'test');
    tooltip.update(0.016);
    const enabledState = tooltip.getState();
    expect(enabledState.mode).toBe('recommended');

    tooltip.dispose();
    preference.dispose();
  });

  it('hides recommendation visuals until idle mode is reached', () => {
    const { tooltip, preference } = createTooltip();
    const recommendedPoi = createPoiDefinition({
      id: 'dspace-backyard-rocket',
    });
    tooltip.setRecommendation(
      createTarget(recommendedPoi, new Vector3(-1, 0.5, 2))
    );
    tooltip.update(0.016);

    const activeState = tooltip.getState();
    expect(activeState.mode).toBeNull();
    expect(activeState.visible).toBe(false);

    tooltip.setIdleState(true);
    tooltip.update(0.016);

    const idleState = tooltip.getState();
    expect(idleState.mode).toBe('recommended');
    expect(idleState.poiId).toBe(recommendedPoi.id);

    tooltip.dispose();
    preference.dispose();
  });

  it('skips outcome rendering when the value is blank', () => {
    const { tooltip, preference } = createTooltip();
    const poi = createPoiDefinition({
      id: 'danielsmith-portfolio-table',
      outcome: { label: 'Outcome', value: '   ' },
    });

    tooltip.setHovered(createTarget(poi, new Vector3(0, 0.4, 0)));
    tooltip.update(0.016);

    expect(tooltip.getState().poiId).toBe(poi.id);

    tooltip.dispose();
    preference.dispose();
  });

  it('fades out once all targets clear', () => {
    const { tooltip, preference } = createTooltip();
    const poi = createPoiDefinition();
    tooltip.setHovered(createTarget(poi, new Vector3(0, 0, 0)));
    tooltip.update(0.016);
    expect(tooltip.getState().visible).toBe(true);

    tooltip.setHovered(null);
    tooltip.setSelected(null);
    tooltip.setRecommendation(null);
    tooltip.update(0.3);
    tooltip.update(0.3);

    const state = tooltip.getState();
    expect(state.visible).toBe(false);
    expect(state.opacity).toBe(0);
    expect(state.poiId).toBeNull();

    tooltip.dispose();
    preference.dispose();
  });

  it('updates the anchor position each frame using the provided callback', () => {
    const { tooltip, preference } = createTooltip();
    const poi = createPoiDefinition({ id: 'dspace-backyard-rocket' });
    let currentY = 0;
    const target = createTarget(poi, () => {
      currentY += 0.5;
      return new Vector3(0, currentY, 0);
    });

    tooltip.setHovered(target);
    tooltip.update(0.016);
    const firstY = tooltip.group.position.y;
    tooltip.update(0.016);
    const secondY = tooltip.group.position.y;
    expect(secondY).toBeGreaterThan(firstY);

    tooltip.dispose();
    preference.dispose();
  });

  it('disposes resources without leaking scene children', () => {
    const { tooltip, scene } = createTooltip();
    const poi = createPoiDefinition({ id: 'pr-reaper-backyard-console' });
    tooltip.setHovered(createTarget(poi, new Vector3(0, 1, 0)));
    tooltip.update(0.016);
    expect(scene.children).toContain(tooltip.group);

    tooltip.dispose();
    expect(scene.children).not.toContain(tooltip.group);
    expect(() => tooltip.dispose()).not.toThrow();
  });
});
