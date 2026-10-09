import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createChairController,
  collectChairAnchors,
  type ChairAnchor,
} from '../scene/avatar/chairController';
import { createLowerFloorFurnishings } from '../scene/structures/lowerFloorFurnishings';

function fixture() {
  const player = new Group();
  player.position.set(0, 0, -1.8);
  const chair: ChairAnchor = {
    id: 'chair',
    floorId: 'ground',
    colliderName: 'chair',
    seat: new Vector3(0, 0.47, 0),
    floorY: 0,
    forward: new Vector3(0, 0, -1),
    approach: new Vector3(0, 0, -1.55),
  };
  let blocked = false;
  const controller = createChairController({
    player,
    chairs: [chair],
    duration: () => 1.5,
    canOccupy: (p, _chair, ignore) => !blocked && (ignore || p.z <= -1.5),
  });
  const tick = (n = 40, reduced = false, move = false) => {
    for (let i = 0; i < n; i++) controller.update(0.1, reduced, move);
  };
  return {
    player,
    controller,
    tick,
    block: () => {
      blocked = true;
    },
  };
}

describe('chair transitions', () => {
  it('uses real rotated cushion anchors for the lounge and reading chairs', () => {
    const build = createLowerFloorFurnishings();
    const anchors = collectChairAnchors(build.group);
    expect(anchors.length).toBe(3);
    expect(
      anchors.filter((a) => a.id.includes('lounge')).map((a) => a.seat.y)
    ).toEqual([0.47, 0.47]);
    expect(anchors.find((a) => !a.id.includes('lounge'))?.seat.y).toBe(0.62);
    expect(anchors[0].forward.x).toBeCloseTo(-1);
  });
  it('approaches, seats at the authored hip offset, and exits only to a clear standing location', () => {
    const f = fixture();
    expect(f.controller.interact('upper')).toBe(false);
    expect(f.controller.interact('ground')).toBe(true);
    f.tick();
    expect(f.controller.getSnapshot().phase).toBe('seated');
    expect(f.player.position.z).toBeCloseTo(-0.395);
    expect(f.controller.getAnimation()?.offsetY).toBeCloseTo(0.07);
    expect(f.controller.interact('ground')).toBe(true);
    f.tick();
    expect(f.controller.getSnapshot().phase).toBe('free');
    expect(f.player.position.z).toBeCloseTo(-1.55);
  });
  it('does not move through a new obstruction or eject a seated player into it', () => {
    const f = fixture();
    f.controller.interact('ground');
    f.tick();
    f.block();
    const before = f.player.position.clone();
    expect(f.controller.interact('ground')).toBe(false);
    f.tick();
    expect(f.player.position.equals(before)).toBe(true);
    expect(f.controller.getSnapshot().phase).toBe('seated');
  });
  it('cancels approach on movement, supports movement to stand, and skips transitions for reduced motion', () => {
    const f = fixture();
    f.controller.interact('ground');
    f.tick(1, false, true);
    expect(f.controller.getSnapshot().phase).toBe('free');
    f.controller.interact('ground');
    f.tick(2, true);
    expect(f.controller.getSnapshot().phase).toBe('seated');
    f.tick(1, true, true);
    expect(f.controller.getSnapshot().phase).toBe('free');
  });
});
