import { describe, expect, it, vi } from 'vitest';

import { createDisposalScope } from '../disposalScope';

describe('initialization resource ownership', () => {
  it('releases acquired resources in reverse order after failure, exactly once', () => {
    const scope = createDisposalScope();
    const order: string[] = [];
    const releaseModel = vi.fn(() => order.push('model'));
    const releaseControl = vi.fn(() => order.push('control'));
    try {
      scope.add(releaseModel);
      scope.add(releaseControl);
      throw new Error('Later initialization failed');
    } catch {
      scope.dispose();
    }
    scope.dispose();
    expect(order).toEqual(['control', 'model']);
    expect(releaseModel).toHaveBeenCalledOnce();
    expect(releaseControl).toHaveBeenCalledOnce();
  });

  it('immediately releases allocations registered after the scope was closed', () => {
    const scope = createDisposalScope();
    scope.dispose();
    const release = vi.fn();
    scope.add(release);
    scope.dispose();
    expect(release).toHaveBeenCalledOnce();
  });

  it('releases remaining resources even when one cleanup throws', () => {
    const scope = createDisposalScope();
    const release = vi.fn();
    const failure = new Error('Cleanup failed');
    scope.add(release);
    scope.add(() => {
      throw failure;
    });
    expect(() => scope.dispose()).toThrow(failure);
    expect(release).toHaveBeenCalledOnce();
    expect(() => scope.dispose()).not.toThrow();
  });
});
