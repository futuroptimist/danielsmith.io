import {
  CAREER_EXHIBIT_FOOTPRINT,
  CAREER_INTERACTION_ANCHOR,
} from '../../../level/careerMuseumLayout';
import { getFloorTopElevation } from '../../../level/floorElevations';
import {
  createCareerPoiDefinitions,
  type CareerPoiPlacement,
} from '../../careers';
import type { CareerPoiId } from '../../types';

const placement = (x: number, z: number): CareerPoiPlacement => ({
  roomId: 'careerMuseum',
  position: { x, y: getFloorTopElevation('basement'), z },
  interactionAnchorPosition: {
    x,
    y: getFloorTopElevation('basement') + CAREER_INTERACTION_ANCHOR.height,
    z: z + CAREER_INTERACTION_ANCHOR.frontOffset,
  },
  footprint: CAREER_EXHIBIT_FOOTPRINT,
  interactionRadius: 3.6,
  headingRadians: 0,
});

export const CAREER_TEST_PLACEMENTS: Record<CareerPoiId, CareerPoiPlacement> = {
  'career-southern-mississippi': placement(-18, -18),
  'career-naval-research': placement(-18, 2),
  'career-youtube': placement(20, 2),
  'career-muon-space': placement(20, -20),
};

export const getTestCareerPois = (locale = 'en') =>
  createCareerPoiDefinitions(CAREER_TEST_PLACEMENTS, locale);
