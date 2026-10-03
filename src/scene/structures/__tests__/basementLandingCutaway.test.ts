import { MeshStandardMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';

import { createBasementLandingCutaway } from '../basementLandingCutaway';

describe('basement landing wall cutaway', () => {
  it('keeps the wall readable at 80% opacity and restores its full normal state on exit', () => {
    const source = new MeshStandardMaterial({ lightMapIntensity: 0.68 });
    const cutaway = createBasementLandingCutaway(source);
    expect(cutaway.material).not.toBe(source);
    for (let visit = 0; visit < 2; visit += 1) {
      cutaway.setActive(true);
      expect(cutaway.material.opacity).toBe(0.8);
      expect(cutaway.material.transparent).toBe(true);
      expect(cutaway.material.depthWrite).toBe(false);
      const activeVersion = cutaway.material.version;
      cutaway.setActive(true);
      expect(cutaway.material.version).toBe(activeVersion);
      expect(source.opacity).toBe(1);
      expect(source.transparent).toBe(false);
      expect(source.depthWrite).toBe(true);
      cutaway.setActive(false);
      expect(cutaway.material.opacity).toBe(1);
      expect(cutaway.material.transparent).toBe(false);
      expect(cutaway.material.depthWrite).toBe(true);
    }
  });

  it('restores the cloned material settings rather than imposing different defaults', () => {
    const source = new MeshStandardMaterial({
      opacity: 0.95,
      transparent: true,
      depthWrite: false,
    });
    const cutaway = createBasementLandingCutaway(source);
    cutaway.setActive(true);
    cutaway.setActive(false);
    expect(cutaway.material.opacity).toBe(0.95);
    expect(cutaway.material.transparent).toBe(true);
    expect(cutaway.material.depthWrite).toBe(false);
  });

  it('disposes only its own material once and ignores later activation', () => {
    const source = new MeshStandardMaterial();
    const cutaway = createBasementLandingCutaway(source);
    const cloneDisposed = vi.fn();
    const sourceDisposed = vi.fn();
    cutaway.material.addEventListener('dispose', cloneDisposed);
    source.addEventListener('dispose', sourceDisposed);
    cutaway.dispose();
    cutaway.dispose();
    cutaway.setActive(true);
    expect(cloneDisposed).toHaveBeenCalledTimes(1);
    expect(sourceDisposed).not.toHaveBeenCalled();
    expect(cutaway.material.opacity).toBe(1);
  });
});
