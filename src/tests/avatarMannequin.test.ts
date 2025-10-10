import { Color, DoubleSide, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createPortfolioMannequin } from '../avatar/mannequin';

describe('createPortfolioMannequin', () => {
  it('creates a mannequin with a hidden collision proxy aligned to the controller radius', () => {
    const build = createPortfolioMannequin();

    expect(build.collisionRadius).toBeCloseTo(0.75);
    expect(build.height).toBeGreaterThan(1.5);
    expect(build.group.name).toBe('PortfolioMannequin');
    expect(build.group.userData.boundingRadius).toBeCloseTo(build.collisionRadius);
    expect(build.group.userData.visualHeight).toBeCloseTo(build.height);

    const collisionProxy = build.group.getObjectByName('PortfolioMannequinCollisionProxy');
    expect(collisionProxy).toBeInstanceOf(Mesh);
    if (!(collisionProxy instanceof Mesh)) {
      throw new Error('Collision proxy mesh missing.');
    }
    expect(collisionProxy.visible).toBe(false);

    const visualRoot = build.group.getObjectByName('PortfolioMannequinVisual');
    expect(visualRoot).toBeInstanceOf(Group);
    if (!(visualRoot instanceof Group)) {
      throw new Error('Visual root missing.');
    }
    expect(visualRoot.position.y).toBeCloseTo(-build.collisionRadius);

    const crest = build.group.getObjectByName('PortfolioMannequinCrest');
    expect(crest).toBeInstanceOf(Mesh);
    if (crest instanceof Mesh) {
      expect(crest.position.y).toBeGreaterThan(1.6);
    }
  });

  it('honors palette and collision radius overrides for accent-driven materials', () => {
    const options = {
      collisionRadius: 0.6,
      baseColor: '#102030',
      accentColor: '#44ccff',
      trimColor: '#ffd7aa',
    } as const;

    const build = createPortfolioMannequin(options);

    expect(build.collisionRadius).toBeCloseTo(options.collisionRadius);
    const visualRoot = build.group.getObjectByName('PortfolioMannequinVisual');
    expect(visualRoot).toBeInstanceOf(Group);
    if (!(visualRoot instanceof Group)) {
      throw new Error('Visual root missing.');
    }
    expect(visualRoot.position.y).toBeCloseTo(-options.collisionRadius);

    const visor = build.group.getObjectByName('PortfolioMannequinVisor');
    expect(visor).toBeInstanceOf(Mesh);
    if (!(visor instanceof Mesh)) {
      throw new Error('Visor mesh missing.');
    }
    const visorMaterial = visor.material as MeshStandardMaterial;
    const accentHex = new Color(options.accentColor).getHexString();
    expect(visorMaterial.color.getHexString()).toBe(accentHex);
    expect(visorMaterial.transparent).toBe(true);
    expect(visorMaterial.opacity).toBeCloseTo(0.72);
    expect(visorMaterial.side).toBe(DoubleSide);

    const head = build.group.getObjectByName('PortfolioMannequinHead');
    expect(head).toBeInstanceOf(Mesh);
    if (head instanceof Mesh) {
      const headMaterial = head.material as MeshStandardMaterial;
      const trim = new Color(options.trimColor);
      const headHsl = { h: 0, s: 0, l: 0 };
      const trimHsl = { h: 0, s: 0, l: 0 };
      headMaterial.color.getHSL(headHsl);
      trim.getHSL(trimHsl);
      expect(headHsl.h).toBeCloseTo(trimHsl.h, 1);
      expect(headHsl.l).toBeGreaterThan(trimHsl.l);
    }
  });
});
