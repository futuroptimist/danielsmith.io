import {
  createCareerPoiDefinitions,
  type CareerPoiPlacement,
} from '../../careers';
import type { CareerPoiId } from '../../types';

const placement = (x: number, z: number): CareerPoiPlacement => ({
  roomId: 'careerMuseum',
  position: { x, y: -5, z },
  interactionAnchorPosition: { x, y: -4.25, z: z + 2.5 },
  footprint: { width: 4.8, depth: 3 },
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
