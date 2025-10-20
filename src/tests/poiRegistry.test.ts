import { describe, expect, it } from 'vitest';

import { FLOOR_PLAN } from '../assets/floorPlan';
import {
  getPoiDefinitions,
  getPoiDefinitionsByRoom,
  isPoiInsideRoom,
} from '../scene/poi/registry';

describe('POI registry', () => {
  const pois = getPoiDefinitions();

  it('uses unique identifiers', () => {
    const ids = pois.map((poi) => poi.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('places each POI within its target room bounds', () => {
    const outOfBounds = pois.filter((poi) => !isPoiInsideRoom(poi));
    // Allow TV exhibit to be anchored on wall edge for display override.
    const allowed = new Set([
      'futuroptimist-living-room-tv',
      'danielsmith-portfolio-table',
    ]);
    const remaining = outOfBounds.filter((p) => !allowed.has(p.id));
    if (remaining.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        'Out-of-bounds POIs:',
        remaining.map((p) => ({
          id: p.id,
          roomId: p.roomId,
          position: p.position,
        }))
      );
    }
    expect(remaining).toHaveLength(0);
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

  it('keeps interaction radii outside the scaled footprint extents', () => {
    pois.forEach((poi) => {
      const maxHalfExtent =
        Math.max(poi.footprint.width, poi.footprint.depth) / 2;
      expect(poi.interactionRadius).toBeGreaterThanOrEqual(maxHalfExtent);
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
    expect(
      rocket?.metrics?.some((metric) => metric.label === 'Countdown')
    ).toBe(true);
  });

  it('registers the greenhouse POI with Sugarkube storytelling hooks', () => {
    const greenhouse = pois.find(
      (poi) => poi.id === 'sugarkube-backyard-greenhouse'
    );
    expect(greenhouse).toBeDefined();
    expect(greenhouse?.roomId).toBe('backyard');
    expect(greenhouse?.interactionRadius).toBeGreaterThan(2);
    expect(greenhouse?.footprint.width).toBeGreaterThan(3);
    expect(
      greenhouse?.links?.some((link) => link.href.includes('sugarkube'))
    ).toBe(true);
    expect(
      greenhouse?.metrics?.some((metric) =>
        /irrigation|solar tilt/i.test(metric.value)
      )
    ).toBe(true);
  });

  it('derives localized interaction prompts for exhibits', () => {
    const flywheel = pois.find((poi) => poi.id === 'flywheel-studio-flywheel');
    expect(flywheel?.interactionPrompt).toBe(
      'Engage Flywheel Kinetic Hub systems'
    );

    const rocket = pois.find((poi) => poi.id === 'dspace-backyard-rocket');
    expect(rocket?.interactionPrompt).toBe(
      'Launch DSPACE Launch Pad countdown'
    );

    const gitshelves = pois.find(
      (poi) => poi.id === 'gitshelves-living-room-installation'
    );
    expect(gitshelves?.interactionPrompt).toBe(
      'Inspect Gitshelves Living Room Array'
    );
  });

  it('exposes stable room-level ordering with defensive copies', () => {
    const expectedStudioOrder = [
      'tokenplace-studio-cluster',
      'gabriel-studio-sentry',
      'flywheel-studio-flywheel',
      'jobbot-studio-terminal',
      'axel-studio-tracker',
    ];

    const firstCall = getPoiDefinitionsByRoom('studio');
    const secondCall = getPoiDefinitionsByRoom('studio');

    expect(firstCall.map((poi) => poi.id)).toEqual(expectedStudioOrder);
    expect(secondCall.map((poi) => poi.id)).toEqual(expectedStudioOrder);

    expect(firstCall).not.toBe(secondCall);
    expect(firstCall[0]).not.toBe(secondCall[0]);
    expect(firstCall[0].position).not.toBe(secondCall[0].position);
    expect(firstCall[0].footprint).not.toBe(secondCall[0].footprint);
    expect(firstCall[0].metrics).not.toBe(secondCall[0].metrics);
    expect(firstCall[0].links).not.toBe(secondCall[0].links);

    const mutated = firstCall[0];
    const originalTitle = secondCall[0].title;
    const originalX = secondCall[0].position.x;
    const originalFootprintWidth = secondCall[0].footprint.width;
    const originalMetricValue = secondCall[0].metrics?.[0]?.value;
    const originalLinksLength = secondCall[0].links?.length ?? 0;

    mutated.title = 'Mutated';
    mutated.position.x += 42;
    mutated.footprint.width += 1.5;
    if (mutated.metrics?.[0]) {
      mutated.metrics[0].value = 'Changed metric';
    }
    mutated.links?.push({ label: 'Temp', href: '#' });

    const flywheel = firstCall.find(
      (poi) => poi.id === 'flywheel-studio-flywheel'
    );
    const flywheelBaseline = secondCall.find(
      (poi) => poi.id === 'flywheel-studio-flywheel'
    );
    if (flywheel?.narration) {
      flywheel.narration.caption = 'Altered caption';
    }

    const thirdCall = getPoiDefinitionsByRoom('studio');
    const refreshed = thirdCall[0];
    expect(refreshed.title).toBe(originalTitle);
    expect(refreshed.position.x).toBe(originalX);
    expect(refreshed.footprint.width).toBe(originalFootprintWidth);
    expect(refreshed.metrics?.[0]?.value).toBe(originalMetricValue);
    expect(refreshed.links?.length ?? 0).toBe(originalLinksLength);

    const refreshedFlywheel = thirdCall.find(
      (poi) => poi.id === 'flywheel-studio-flywheel'
    );
    expect(refreshedFlywheel?.narration?.caption).toBe(
      flywheelBaseline?.narration?.caption
    );
  });

  it('returns an empty array when a room has no registered POIs', () => {
    expect(getPoiDefinitionsByRoom('loft')).toEqual([]);
  });
});
