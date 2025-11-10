export type PressKitMediaType = 'screenshot' | 'diagram';

export interface PressKitMediaAsset {
  id: string;
  label: string;
  description: string;
  altText: string;
  type: PressKitMediaType;
  /**
   * Path to the asset relative to the repository root. Consumers can resolve
   * this to publish or bundle the media when assembling the press kit.
   */
  relativePath: string;
  credit?: string;
}

export const PRESS_KIT_MEDIA_ASSETS: readonly PressKitMediaAsset[] = [
  {
    id: 'immersive-launch-screenshot',
    label: 'Immersive launch capture',
    description:
      'Launch pose inside the living room highlighting the dusk lighting pass and holographic POIs.',
    altText:
      'Isometric view of the living room with the mannequin facing the holographic exhibits.',
    type: 'screenshot',
    relativePath: 'docs/assets/game-launch.png',
  },
  {
    id: 'floorplan-ground-diagram',
    label: 'Ground floor plan',
    description:
      'Ground floor diagram showing the living room, studio, kitchen, and backyard layout used for POI placement.',
    altText:
      'Top-down architectural diagram of the ground floor with labelled rooms.',
    type: 'diagram',
    relativePath: 'docs/assets/floorplan-ground.svg',
  },
  {
    id: 'floorplan-upper-diagram',
    label: 'Upper floor plan',
    description: 'Upper landing diagram for the loft library and focus pods.',
    altText:
      'Top-down architectural diagram of the upper floor landing and pods.',
    type: 'diagram',
    relativePath: 'docs/assets/floorplan-upper.svg',
  },
] as const;
