import { describe, expect, it, vi } from 'vitest';

import { createExteriorDoorDefinitions } from '../../../scene/level/exteriorLayout';
import { createDoorController } from '../controller';
import { bindDoorInteraction } from '../input';

describe('door keyboard interaction', () => {
  it('captures a complete short press without needing a rendered frame and prevents duplicate POI activation', () => {
    const door = createDoorController(createExteriorDoorDefinitions(2)[0]);
    const poi = vi.fn();
    window.addEventListener('keydown', poi);
    let bindings = ['f'];
    const dispose = bindDoorInteraction({
      target: window,
      getBindings: () => bindings,
      getDoor: () => door,
      getOccupant: () => ({ x: 29, z: -15, radius: 0.75, floorId: 'ground' }),
      canInteract: () => true,
    });
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', cancelable: true })
    );
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'f' }));
    expect(door.snapshot().target).toBe(1);
    expect(poi).not.toHaveBeenCalled();
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', repeat: true, cancelable: true })
    );
    expect(door.snapshot().target).toBe(1);
    bindings = ['g'];
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', cancelable: true })
    );
    expect(door.snapshot().target).toBe(1);
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'G', cancelable: true })
    );
    expect(door.snapshot().target).toBe(0);
    dispose();
    window.removeEventListener('keydown', poi);
  });
  it('does not operate an inactive floor, out-of-range door, or blocked UI', () => {
    const door = createDoorController(createExteriorDoorDefinitions(2)[0]);
    let floorId = 'basement';
    let allowed = true;
    const dispose = bindDoorInteraction({
      target: window,
      getBindings: () => ['f'],
      getDoor: () => door,
      getOccupant: () => ({ x: 29, z: -15, radius: 0.75, floorId }),
      canInteract: () => allowed,
    });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    expect(door.snapshot().target).toBe(0);
    floorId = 'ground';
    allowed = false;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f' }));
    expect(door.snapshot().target).toBe(0);
    dispose();
  });
});
