import { Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createAvatarAccessorySuite,
  type AvatarAccessoryId,
} from '../scene/avatar/accessories';
import { createPortfolioMannequin } from '../scene/avatar/mannequin';

const ALT_PALETTE = {
  base: '#1f242b',
  accent: '#ffd166',
  trim: '#9cf7c7',
};

describe('createAvatarAccessorySuite', () => {
  it('attaches accessories and toggles their visibility state', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });

    const wrist = mannequin.group.getObjectByName(
      'MannequinAccessoryWristConsole'
    );
    const drone = mannequin.group.getObjectByName(
      'MannequinAccessoryHoloDrone'
    );

    expect(wrist).toBeTruthy();
    expect(drone).toBeTruthy();
    expect(wrist?.visible).toBe(false);
    expect(drone?.visible).toBe(false);

    suite.setEnabled('wrist-console', true);
    expect(wrist?.visible).toBe(true);
    expect(suite.isEnabled('wrist-console')).toBe(true);

    suite.toggle('wrist-console');
    expect(wrist?.visible).toBe(false);
    expect(suite.isEnabled('wrist-console')).toBe(false);

    suite.setEnabled('holo-drone', true);
    expect(drone?.visible).toBe(true);
  });

  it('updates palette driven materials and animation state', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    suite.setEnabled('wrist-console', true);
    suite.setEnabled('holo-drone', true);

    const screen = mannequin.group.getObjectByName(
      'MannequinAccessoryWristConsoleScreen'
    ) as Mesh | null;
    const halo = mannequin.group.getObjectByName(
      'MannequinAccessoryHoloDroneHalo'
    ) as Mesh | null;
    const orbit = mannequin.group.getObjectByName(
      'MannequinAccessoryHoloDroneOrbit'
    ) as Group | null;
    const anchor = mannequin.group.getObjectByName(
      'MannequinAccessoryHoloDrone'
    ) as Group | null;

    expect(screen).toBeInstanceOf(Mesh);
    expect(halo).toBeInstanceOf(Mesh);
    expect(orbit).toBeInstanceOf(Group);
    expect(anchor).toBeInstanceOf(Group);

    suite.applyPalette(ALT_PALETTE);

    const screenMaterial = screen?.material as MeshStandardMaterial;
    const haloMaterial = halo?.material as MeshStandardMaterial;
    expect(screenMaterial.emissive?.getHexString()).toBe('ffd166');
    expect(screenMaterial.emissiveIntensity).toBeCloseTo(0.85, 5);
    expect(haloMaterial.emissiveIntensity).toBeGreaterThan(0.7);

    const initialRotation = orbit?.rotation.y ?? 0;
    const initialHeight = anchor?.position.y ?? 0;
    suite.update({ elapsed: 1.2, delta: 0.016 });
    expect(orbit?.rotation.y ?? 0).not.toBeCloseTo(initialRotation);
    expect(anchor?.position.y ?? 0).not.toBeCloseTo(initialHeight);
  });

  it('reports accessory state and disposes geometry cleanly', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    suite.setEnabled('wrist-console', true);
    suite.setEnabled('holo-drone', false);

    expect(suite.getState()).toEqual([
      { id: 'wrist-console', enabled: true },
      { id: 'holo-drone', enabled: false },
    ]);

    suite.dispose();
    expect(
      mannequin.group.getObjectByName('MannequinAccessoryWristConsole')
    ).toBeUndefined();
    expect(
      mannequin.group.getObjectByName('MannequinAccessoryHoloDrone')
    ).toBeUndefined();
  });

  it('throws when required mannequin anchors are missing', () => {
    const mannequin = createPortfolioMannequin();
    const glove = mannequin.group.getObjectByName(
      'PortfolioMannequinGloveLeft'
    );
    glove?.parent?.remove(glove);
    expect(() => createAvatarAccessorySuite({ mannequin })).toThrow(
      'Portfolio mannequin glove target missing for wrist console accessory.'
    );
  });

  it('rejects unknown accessory identifiers', () => {
    const mannequin = createPortfolioMannequin();
    const suite = createAvatarAccessorySuite({ mannequin });
    expect(() =>
      suite.setEnabled('unknown-accessory' as AvatarAccessoryId, true)
    ).toThrow('Unknown avatar accessory: unknown-accessory');
  });
});
