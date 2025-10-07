function resolveRoot(root?: HTMLElement | null): HTMLElement | undefined {
  if (root) {
    return root;
  }

  if (typeof document !== 'undefined' && document.documentElement) {
    return document.documentElement;
  }

  return undefined;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function parseScale(value: string | undefined, fallback: number): number {
  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return clamp01(parsed);
}

function readScale(
  root: HTMLElement | undefined,
  key: 'accessibilityPulseScale' | 'accessibilityFlickerScale'
): number {
  if (!root) {
    return 1;
  }

  return parseScale(root.dataset?.[key], 1);
}

export function getPulseScale(root?: HTMLElement | null): number {
  return readScale(resolveRoot(root), 'accessibilityPulseScale');
}

export function getFlickerScale(root?: HTMLElement | null): number {
  return readScale(resolveRoot(root), 'accessibilityFlickerScale');
}
