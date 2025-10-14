import type { PortfolioMannequinPalette } from './mannequin';
import {
  AVATAR_VARIANTS,
  DEFAULT_AVATAR_VARIANT_ID,
  type AvatarVariantDefinition,
  type AvatarVariantId,
  getAvatarVariantById,
  isAvatarVariantId,
} from './variants';

export interface AvatarVariantTarget {
  applyPalette(palette: PortfolioMannequinPalette): void;
}

export interface AvatarVariantManagerOptions {
  target: AvatarVariantTarget;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  storageKey?: string;
  initialVariantId?: AvatarVariantId;
}

export interface AvatarVariantManager {
  getVariant(): AvatarVariantId;
  setVariant(variant: AvatarVariantId): void;
  refresh(): void;
  onChange(listener: (variant: AvatarVariantId) => void): () => void;
}

const DEFAULT_STORAGE_KEY = 'danielsmith:avatar-variant';

const VARIANT_MAP = new Map<AvatarVariantId, AvatarVariantDefinition>(
  AVATAR_VARIANTS.map((variant) => [variant.id, variant])
);

function getVariantOrFallback(id: AvatarVariantId): AvatarVariantDefinition {
  const variant = VARIANT_MAP.get(id);
  if (variant) {
    return variant;
  }
  return getAvatarVariantById(DEFAULT_AVATAR_VARIANT_ID);
}

export function createAvatarVariantManager({
  target,
  storage,
  storageKey = DEFAULT_STORAGE_KEY,
  initialVariantId,
}: AvatarVariantManagerOptions): AvatarVariantManager {
  const listeners = new Set<(variant: AvatarVariantId) => void>();

  let currentVariant: AvatarVariantId = DEFAULT_AVATAR_VARIANT_ID;
  if (initialVariantId && isAvatarVariantId(initialVariantId)) {
    currentVariant = initialVariantId;
  }

  if (storage?.getItem) {
    try {
      const stored = storage.getItem(storageKey);
      if (isAvatarVariantId(stored)) {
        currentVariant = stored;
      }
    } catch (error) {
      console.warn('Failed to read persisted avatar variant:', error);
    }
  }

  applyVariant(currentVariant);

  function applyVariant(variantId: AvatarVariantId) {
    const definition = getVariantOrFallback(variantId);
    target.applyPalette(definition.palette);
  }

  function persist(variantId: AvatarVariantId) {
    if (!storage?.setItem) {
      return;
    }
    try {
      storage.setItem(storageKey, variantId);
    } catch (error) {
      console.warn('Failed to persist avatar variant:', error);
    }
  }

  return {
    getVariant() {
      return currentVariant;
    },
    setVariant(next) {
      if (!isAvatarVariantId(next)) {
        throw new Error(`Unknown avatar variant: ${String(next)}`);
      }
      if (currentVariant === next) {
        applyVariant(next);
        return;
      }
      currentVariant = next;
      applyVariant(currentVariant);
      persist(currentVariant);
      listeners.forEach((listener) => listener(currentVariant));
    },
    refresh() {
      applyVariant(currentVariant);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
