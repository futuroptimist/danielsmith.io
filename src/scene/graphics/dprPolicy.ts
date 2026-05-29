import type { RendererCapabilityClass } from './rendererCapabilities';

export interface DprPolicyInput {
  devicePixelRatio: number;
  capabilityClass: RendererCapabilityClass;
  userRequestedCinematic?: boolean;
  adaptiveLimit?: number;
}

export function clampDprForQuality(input: DprPolicyInput): number {
  const raw = Number.isFinite(input.devicePixelRatio)
    ? Math.max(0.5, input.devicePixelRatio)
    : 1;
  const capabilityCap = input.capabilityClass === 'software' ? 1 : 1.5;
  const preferenceCap = input.userRequestedCinematic ? 2 : capabilityCap;
  const adaptiveCap = Number.isFinite(input.adaptiveLimit)
    ? Math.max(0.5, input.adaptiveLimit ?? preferenceCap)
    : preferenceCap;

  return Math.max(0.5, Math.min(raw, preferenceCap, adaptiveCap));
}
