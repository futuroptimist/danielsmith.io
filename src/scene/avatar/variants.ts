import type { PortfolioMannequinPalette } from './mannequin';

export type AvatarVariantId = 'portfolio' | 'casual' | 'formal';

export interface AvatarVariantDefinition {
  id: AvatarVariantId;
  palette: PortfolioMannequinPalette;
}

export const AVATAR_VARIANTS: readonly AvatarVariantDefinition[] = [
  {
    id: 'portfolio',
    palette: {
      base: '#283347',
      accent: '#57d7ff',
      trim: '#f7c77d',
    },
  },
  {
    id: 'casual',
    palette: {
      base: '#2a343d',
      accent: '#36d1b5',
      trim: '#ffb88c',
    },
  },
  {
    id: 'formal',
    palette: {
      base: '#1f242b',
      accent: '#ffd166',
      trim: '#f2f4f8',
    },
  },
] as const;

export const DEFAULT_AVATAR_VARIANT_ID: AvatarVariantId = 'portfolio';

export function isAvatarVariantId(value: unknown): value is AvatarVariantId {
  return (
    typeof value === 'string' &&
    AVATAR_VARIANTS.some((variant) => variant.id === value)
  );
}

export function getAvatarVariantById(
  id: AvatarVariantId
): AvatarVariantDefinition {
  const variant = AVATAR_VARIANTS.find((entry) => entry.id === id);
  if (!variant) {
    throw new Error(`Unknown avatar variant: ${id}`);
  }
  return variant;
}
