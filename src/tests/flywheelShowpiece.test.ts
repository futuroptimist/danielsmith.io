import { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFlywheelShowpiece } from '../scene/structures/flywheel';

type CapturingContext = CanvasRenderingContext2D & {
  fillTextCalls: string[];
};

const contexts: CapturingContext[] = [];

const createMockContext = (canvas: HTMLCanvasElement): CapturingContext => {
  const fillTextCalls: string[] = [];
  const gradient = { addColorStop: vi.fn() };
  const context = {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    fillRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '',
    globalAlpha: 1,
    shadowBlur: 0,
    shadowColor: '',
    fillText: vi.fn((text: string) => {
      fillTextCalls.push(text);
    }),
    fillTextCalls,
  } as Partial<CapturingContext>;
  Object.defineProperty(context, 'canvas', { value: canvas });
  return context as CapturingContext;
};

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value(this: HTMLCanvasElement, type: string) {
      if (type !== '2d') {
        return null;
      }
      const context = createMockContext(this);
      contexts.push(context);
      return context;
    },
  });
});

beforeEach(() => {
  contexts.length = 0;
});

describe('createFlywheelShowpiece', () => {
  const roomBounds = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };

  it('builds kinetic hub geometry with docs callout signage', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    expect(build.group.name).toBe('FlywheelShowpiece');

    const rotorGroup = build.group.getObjectByName('FlywheelRotorGroup');
    expect(rotorGroup).toBeInstanceOf(Group);

    const panel = build.group.getObjectByName('FlywheelInfoPanel');
    expect(panel).toBeInstanceOf(Mesh);

    const callout = build.group.getObjectByName('FlywheelDocsCallout');
    expect(callout).toBeInstanceOf(Mesh);

    const capturedText = contexts.flatMap((ctx) => ctx.fillTextCalls);
    expect(capturedText).toContain('Flywheel Automation');
    expect(capturedText).toContain('Docs');
    expect(capturedText).toContain('flywheel.futuroptimist.dev');
    expect(capturedText).toContain('CI templates');
    expect(capturedText).toContain('Typed prompts');
    expect(capturedText).toContain('Scaffolds');
    expect(capturedText).toContain('lint · test · deploy');
    expect(capturedText).toContain('codex-driven flows');
    expect(capturedText).toContain('vite · playwright');
  });

  it('keeps the docs callout hidden when only emphasis is applied', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const callout = build.group.getObjectByName('FlywheelDocsCallout') as Mesh;
    const calloutMaterial = callout.material as MeshBasicMaterial;

    build.update({ elapsed: 0.5, delta: 0.5, emphasis: 1 });
    build.update({ elapsed: 1, delta: 0.5, emphasis: 1 });

    expect(calloutMaterial.opacity).toBeLessThan(0.05);
    expect(callout.visible).toBe(false);

    build.group.dispatchEvent({ type: 'removed' } as Event);
  });

  it('reveals docs callout when the flywheel POI is selected and hides when cleared', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const callout = build.group.getObjectByName('FlywheelDocsCallout') as Mesh;
    const calloutMaterial = callout.material as MeshBasicMaterial;
    const calloutGlow = build.group.getObjectByName(
      'FlywheelDocsCalloutGlow'
    ) as Mesh;
    const calloutGlowMaterial = calloutGlow.material as MeshBasicMaterial;
    const rotorGroup = build.group.getObjectByName(
      'FlywheelRotorGroup'
    ) as Group;

    const initialRotation = rotorGroup.rotation.y;

    window.dispatchEvent(
      new CustomEvent('poi:selected', {
        detail: { poi: { id: 'flywheel-studio-flywheel' } },
      })
    );

    build.update({ elapsed: 0.5, delta: 0.5, emphasis: 1 });
    build.update({ elapsed: 1.1, delta: 0.6, emphasis: 1 });

    expect(rotorGroup.rotation.y).toBeGreaterThan(initialRotation);
    expect(calloutMaterial.opacity).toBeGreaterThan(0.3);
    expect(calloutGlowMaterial.opacity).toBeGreaterThan(0.05);
    expect(callout.visible).toBe(true);

    window.dispatchEvent(
      new CustomEvent('poi:selection-cleared', {
        detail: { poi: { id: 'flywheel-studio-flywheel' } },
      })
    );

    let elapsed = 1.6;
    for (let i = 0; i < 6; i += 1) {
      build.update({ elapsed, delta: 0.3, emphasis: 0.8 });
      elapsed += 0.3;
    }

    expect(calloutMaterial.opacity).toBeLessThan(0.05);
    expect(callout.visible).toBe(false);

    build.group.dispatchEvent({ type: 'removed' } as Event);
  });

  it('keeps the docs callout hidden when emphasis stays at zero', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const callout = build.group.getObjectByName('FlywheelDocsCallout') as Mesh;
    const calloutMaterial = callout.material as MeshBasicMaterial;

    for (let i = 0; i < 5; i += 1) {
      build.update({ elapsed: i * 0.5, delta: 0.5, emphasis: 0 });
    }

    expect(calloutMaterial.opacity).toBe(0);
    expect(callout.visible).toBe(false);

    build.group.dispatchEvent({ type: 'removed' } as Event);
  });

  it('reveals tech stack chips and animates their orbit after selection', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const techStackGroup = build.group.getObjectByName(
      'FlywheelTechStackGroup'
    ) as Group;
    expect(techStackGroup).toBeInstanceOf(Group);

    const wrappers = techStackGroup.children as Group[];
    expect(wrappers).toHaveLength(3);

    const initialRotations = wrappers.map((wrapper) => wrapper.rotation.y);
    const materials = wrappers.map((wrapper) => {
      const chip = wrapper.children[0] as Mesh;
      return chip.material as MeshBasicMaterial;
    });

    build.update({ elapsed: 0.25, delta: 0.25, emphasis: 0.6 });
    materials.forEach((material) => {
      expect(material.opacity).toBeLessThan(0.1);
    });

    window.dispatchEvent(
      new CustomEvent('poi:selected:analytics', {
        detail: { poi: { id: 'flywheel-studio-flywheel' } },
      })
    );

    build.update({ elapsed: 0.9, delta: 0.65, emphasis: 1 });
    build.update({ elapsed: 1.6, delta: 0.7, emphasis: 1 });

    wrappers.forEach((wrapper, index) => {
      expect(wrapper.rotation.y).not.toBeCloseTo(initialRotations[index]);
      const chip = wrapper.children[0] as Mesh;
      expect(chip.visible).toBe(true);
    });

    materials.forEach((material) => {
      expect(material.opacity).toBeGreaterThan(0.3);
    });

    build.group.dispatchEvent({ type: 'removed' } as Event);
  });

  it('highlights automation pillars as emphasis and selection increase', () => {
    const build = createFlywheelShowpiece({
      centerX: 0,
      centerZ: 0,
      roomBounds,
    });

    const pillarGroup = build.group.getObjectByName(
      'FlywheelAutomationPillars'
    ) as Group;
    expect(pillarGroup).toBeInstanceOf(Group);

    const pillarMeshes = pillarGroup.children as Mesh[];
    expect(pillarMeshes.length).toBeGreaterThan(0);

    const initialHeights = pillarMeshes.map((mesh) => mesh.position.y);
    const materials = pillarMeshes.map(
      (mesh) => mesh.material as MeshStandardMaterial
    );

    build.update({ elapsed: 0.2, delta: 0.2, emphasis: 0.1 });

    materials.forEach((material) => {
      expect(material.opacity).toBeLessThan(0.3);
    });

    window.dispatchEvent(
      new CustomEvent('poi:selected', {
        detail: { poi: { id: 'flywheel-studio-flywheel' } },
      })
    );

    build.update({ elapsed: 0.9, delta: 0.7, emphasis: 1 });
    build.update({ elapsed: 1.6, delta: 0.7, emphasis: 1 });

    const finalHeights = pillarMeshes.map((mesh) => mesh.position.y);
    const heightChanged = finalHeights.some(
      (height, index) => Math.abs(height - initialHeights[index]) > 1e-4
    );
    expect(heightChanged).toBe(true);

    materials.forEach((material) => {
      expect(material.opacity).toBeGreaterThan(0.4);
      expect(material.emissiveIntensity).toBeGreaterThan(0.5);
    });

    expect(pillarMeshes.every((mesh) => mesh.visible)).toBe(true);

    window.dispatchEvent(
      new CustomEvent('poi:selection-cleared', {
        detail: { poi: { id: 'flywheel-studio-flywheel' } },
      })
    );

    build.group.dispatchEvent({ type: 'removed' } as Event);
  });
});
