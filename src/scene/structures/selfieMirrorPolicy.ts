import type { GraphicsQualityLevel } from '../graphics/qualityManager';
import type { RendererCapabilityClass } from '../graphics/rendererCapabilities';

export interface SelfieMirrorPolicyInput {
  qualityLevel: GraphicsQualityLevel;
  capabilityClass: RendererCapabilityClass;
  distanceToMirror: number;
  visible?: boolean;
}

export interface SelfieMirrorPolicy {
  enabled: boolean;
  targetSize: number;
  updateRate: number;
}

export function getSelfieMirrorPolicy(
  input: SelfieMirrorPolicyInput
): SelfieMirrorPolicy {
  if (input.visible === false || input.capabilityClass === 'software') {
    return { enabled: false, targetSize: 128, updateRate: 0 };
  }

  if (input.qualityLevel === 'performance') {
    return { enabled: false, targetSize: 128, updateRate: 0 };
  }

  if (input.distanceToMirror > 18) {
    return { enabled: false, targetSize: 128, updateRate: 0 };
  }

  if (input.qualityLevel === 'balanced') {
    return { enabled: true, targetSize: 256, updateRate: 8 };
  }

  return {
    enabled: true,
    targetSize: 512,
    updateRate: input.distanceToMirror > 9 ? 10 : 15,
  };
}
