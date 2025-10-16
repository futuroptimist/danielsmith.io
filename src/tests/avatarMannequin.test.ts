import { Color, DoubleSide, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import { createPortfolioMannequin } from '../scene/avatar/mannequin';

describe('createPortfolioMannequin', () => {
  it('creates a mannequin with a hidden collision proxy aligned to the controller radius', () => {
    const build = createPortfolioMannequin();

    expect(build.collisionRadius).toBeCloseTo(0.75);
    expect(build.height).toBeGreaterThan(1.5);
    expect(build.group.name).toBe('PortfolioMannequin');
    expect(build.group.userData.boundingRadius).toBeCloseTo(
      build.collisionRadius
    );
    expect(build.group.userData.visualHeight).toBeCloseTo(build.height);
    expect(build.getPalette()).toEqual({
      base: '#283347',
      accent: '#57d7ff',
      trim: '#f7c77d',
    });

    const collisionProxy = build.group.getObjectByName(
      'PortfolioMannequinCollisionProxy'
    );
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

    const leftFoot = build.group.getObjectByName('PortfolioMannequinFootLeft');
    expect(leftFoot).toBeInstanceOf(Group);
    if (!(leftFoot instanceof Group)) {
      throw new Error('Left foot group missing.');
    }
    const leftFootMesh = leftFoot.getObjectByName(
      'PortfolioMannequinFootLeftMesh'
    );
    expect(leftFootMesh).toBeInstanceOf(Mesh);
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
    expect(build.getPalette()).toEqual({
      base: '#102030',
      accent: '#44ccff',
      trim: '#ffd7aa',
    });
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

  it('repaints active materials when applying a palette dynamically', () => {
    const build = createPortfolioMannequin();
    const nextPalette = {
      base: '#123456',
      accent: '#abcdef',
      trim: '#fedcba',
    } as const;

    const visor = build.group.getObjectByName('PortfolioMannequinVisor');
    const legs = build.group.getObjectByName('PortfolioMannequinLegs');
    const leftFoot = build.group.getObjectByName(
      'PortfolioMannequinFootLeftMesh'
    );
    const accentBand = build.group.getObjectByName(
      'PortfolioMannequinWaistBand'
    );
    const head = build.group.getObjectByName('PortfolioMannequinHead');

    expect(visor).toBeInstanceOf(Mesh);
    expect(legs).toBeInstanceOf(Mesh);
    expect(leftFoot).toBeInstanceOf(Mesh);
    expect(accentBand).toBeInstanceOf(Mesh);
    expect(head).toBeInstanceOf(Mesh);
    if (
      !(visor instanceof Mesh) ||
      !(legs instanceof Mesh) ||
      !(leftFoot instanceof Mesh) ||
      !(accentBand instanceof Mesh) ||
      !(head instanceof Mesh)
    ) {
      throw new Error('Expected mannequin meshes to exist.');
    }

    build.applyPalette(nextPalette);

    expect(build.getPalette()).toEqual(nextPalette);

    const baseColor = new Color(nextPalette.base);
    const expectedLegColor = baseColor.clone().multiplyScalar(0.9);
    const legMaterial = legs.material as MeshStandardMaterial;
    expect(legMaterial.color.getHexString()).toBe(
      expectedLegColor.getHexString()
    );
    const leftFootMaterial = leftFoot.material as MeshStandardMaterial;
    expect(leftFootMaterial.color.getHexString()).toBe(
      expectedLegColor.getHexString()
    );

    const accentColor = new Color(nextPalette.accent);
    const expectedEmissive = accentColor.clone().multiplyScalar(0.45);
    const visorMaterial = visor.material as MeshStandardMaterial;
    expect(visorMaterial.color.getHexString()).toBe(accentColor.getHexString());
    expect(visorMaterial.emissive.getHexString()).toBe(
      accentColor.getHexString()
    );
    const accentBandMaterial = accentBand.material as MeshStandardMaterial;
    expect(accentBandMaterial.emissive.getHexString()).toBe(
      expectedEmissive.getHexString()
    );

    const trimColor = new Color(nextPalette.trim);
    const expectedHeadColor = trimColor.clone().offsetHSL(0.04, -0.18, 0.18);
    const headMaterial = head.material as MeshStandardMaterial;
    expect(headMaterial.color.getHexString()).toBe(
      expectedHeadColor.getHexString()
    );
  });
});
