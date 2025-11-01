import type { LivingRoomMediaWallController } from './mediaWall';

const sanitizeStarCount = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
};

export interface MediaWallStarBridge {
  attach(controller: LivingRoomMediaWallController): void;
  detach(): void;
  updateStarCount(stars: number | null | undefined): void;
  getStarCount(): number;
}

export const createMediaWallStarBridge = (
  initialStars = 1280
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
