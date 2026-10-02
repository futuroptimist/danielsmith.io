import { CAREER_HISTORY } from '../../assets/careers';
import { FLOOR_PLAN_SCALE } from '../../assets/floorPlan';
import {
  formatMessage,
  getCareerCopy,
  getControlOverlayStrings,
  type LocaleInput,
} from '../../assets/i18n';
import {
  CAREER_EXHIBIT_FOOTPRINT,
  CAREER_INTERACTION_ANCHOR,
} from '../level/careerMuseumLayout';
import { PORTFOLIO_LEVEL } from '../level/portfolioLevel';

import type { CareerContent, CareerPoiDefinition, CareerPoiId } from './types';

export interface CareerPoiPlacement {
  roomId: string;
  position: { x: number; y: number; z: number };
  interactionAnchorPosition: { x: number; y: number; z: number };
  headingRadians?: number;
  footprint: { width: number; depth: number };
  interactionRadius: number;
}

export function getCareerContent(input?: LocaleInput): CareerContent[] {
  const copy = getCareerCopy(input);
  return CAREER_HISTORY.map((entry) => ({
    id: entry.id,
    organization: copy[entry.id].organization,
    role: copy[entry.id].role,
    team: copy[entry.id].team,
    period: copy[entry.id].period,
    location: copy[entry.id].location,
    startDate: entry.startDate,
    endDate: entry.endDate,
    responsibility: copy[entry.id].summary,
    illustrationNote: copy[entry.id].illustrationNote,
    disclaimer: copy[entry.id].disclaimer,
    provenance: entry.provenance.map((source) => ({ ...source })),
  }));
}

/** Placement is supplied by the declarative level, never inferred from model height. */
export function createCareerPoiDefinitions(
  placements: Readonly<Record<CareerPoiId, CareerPoiPlacement>>,
  input?: LocaleInput
): CareerPoiDefinition[] {
  const copy = getCareerCopy(input);
  const content = getCareerContent(input);
  const template =
    getControlOverlayStrings(input).interact.promptTemplates.inspect;
  return CAREER_HISTORY.map((entry, index) => ({
    ...placements[entry.poiId],
    position: { ...placements[entry.poiId].position },
    interactionAnchorPosition: {
      ...placements[entry.poiId].interactionAnchorPosition,
    },
    footprint: { ...placements[entry.poiId].footprint },
    id: entry.poiId,
    category: 'career',
    interaction: 'inspect',
    title: copy[entry.id].title,
    summary: copy[entry.id].summary,
    career: content[index],
    links: entry.provenance.flatMap((source) =>
      source.href
        ? [
            {
              label: copy[entry.id].sourceLabel,
              href: source.href,
            },
          ]
        : []
    ),
    interactionPrompt: formatMessage(template, { title: copy[entry.id].title }),
  }));
}

export function getCareerPoiPlacements(): Record<
  CareerPoiId,
  CareerPoiPlacement
> {
  const objects = PORTFOLIO_LEVEL.floors.flatMap(
    (floor) => floor.sceneObjects ?? []
  );
  return Object.fromEntries(
    CAREER_HISTORY.map(({ poiId }) => {
      const object = objects.find((entry) => entry.id === poiId);
      if (!object || object.floorId !== 'basement' || !object.roomId) {
        throw new Error(`Missing declarative career placement: ${poiId}`);
      }
      const position = {
        x: object.position.x * FLOOR_PLAN_SCALE,
        y: object.position.y ?? -5,
        z: object.position.z * FLOOR_PLAN_SCALE,
      };
      return [
        poiId,
        {
          roomId: object.roomId,
          position,
          interactionAnchorPosition: {
            x: position.x,
            y: position.y + CAREER_INTERACTION_ANCHOR.height,
            z: position.z + CAREER_INTERACTION_ANCHOR.frontOffset,
          },
          headingRadians: object.orientation,
          footprint: { ...CAREER_EXHIBIT_FOOTPRINT },
          interactionRadius: CAREER_INTERACTION_ANCHOR.radius,
        },
      ];
    })
  ) as Record<CareerPoiId, CareerPoiPlacement>;
}
