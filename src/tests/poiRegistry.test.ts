import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../floorPlan';
import { getPoiDefinitions, isPoiInsideRoom } from '../poi/registry';

describe('POI registry', () => {
  const pois = getPoiDefinitions();

  it('uses unique identifiers', () => {
    const ids = pois.map((poi) => poi.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('places each POI within its target room bounds', () => {
    const outOfBounds = pois.filter((poi) => !isPoiInsideRoom(poi));
    expect(outOfBounds).toHaveLength(0);
  });

  it('references rooms that exist in the floor plan', () => {
    const roomIds = new Set(FLOOR_PLAN.rooms.map((room) => room.id));
    pois.forEach((poi) => {
      expect(roomIds.has(poi.roomId)).toBe(true);
    });
  });

  it('defines interaction radii and footprints greater than zero', () => {
    pois.forEach((poi) => {
      expect(poi.interactionRadius).toBeGreaterThan(0);
      expect(poi.footprint.width).toBeGreaterThan(0);
      expect(poi.footprint.depth).toBeGreaterThan(0);
    });
  });

  it('supplies basic metadata for tooltips', () => {
    pois.forEach((poi) => {
      expect(poi.title.trim()).not.toHaveLength(0);
      expect(poi.summary.trim().length).toBeGreaterThan(20);
    });
  });

  it('registers the backyard rocket POI with outdoor placement metadata', () => {
    const rocket = pois.find((poi) => poi.id === 'dspace-backyard-rocket');
    expect(rocket).toBeDefined();
    expect(rocket?.roomId).toBe('backyard');
    expect(rocket?.interaction).toBe('inspect');
    expect(rocket?.interactionRadius).toBeGreaterThan(2);
    expect(rocket?.footprint.width).toBeGreaterThan(3);
    expect(rocket?.links?.[0]?.href).toContain('dspace');
    expect(rocket?.metrics?.some((metric) => metric.label === 'Countdown')).toBe(true);
  });
});
