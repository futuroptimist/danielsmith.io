import type { LivingRoomMediaWallController } from './mediaWall';

const sanitizeStarCount = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value);
};

export interface MediaWallStarBridge {
  attach(controller: LivingRoomMediaWallController): void;
  detach(): void;
  updateStarCount(stars: number | null | undefined): void;
  getStarCount(): number | null;
}

export const createMediaWallStarBridge = (
  initialStars: number | null = null
): MediaWallStarBridge => {
  let starCount = sanitizeStarCount(initialStars);
  let controller: LivingRoomMediaWallController | null = null;

  const apply = () => {
    if (!controller) {
      return;
    }
    controller.setStarCount(starCount);
  };

  return {
    attach(nextController) {
      controller = nextController;
      apply();
    },
    detach() {
      controller = null;
    },
    updateStarCount(nextStars) {
      starCount = sanitizeStarCount(nextStars);
      apply();
    },
    getStarCount() {
      return starCount;
    },
  };
};
