import type { WebGLRenderer } from 'three';

export type RendererRiskLevel =
  | 'normal'
  | 'software'
  | 'dangerous-software'
  | 'unknown';

export interface RendererInfoSnapshot {
  vendor: string | null;
  renderer: string | null;
  unmaskedVendor: string | null;
  unmaskedRenderer: string | null;
  isSoftwareRenderer: boolean;
  isDangerousSoftwareRenderer: boolean;
  riskLevel: RendererRiskLevel;
  reason: string;
}

const DANGEROUS_SOFTWARE_RENDERER_PATTERNS = [
  /microsoft basic render(?:er| driver)?/i,
  /swiftshader/i,
  /\bwarp\b/i,
  /llvmpipe/i,
  /softpipe/i,
  /mesa offscreen/i,
  /angle.*(swiftshader|software|warp|microsoft basic render)/i,
] as const;

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /software/i,
  /llvmpipe/i,
  /softpipe/i,
  /mesa offscreen/i,
  /warp/i,
  /microsoft basic render/i,
  /angle.*(swiftshader|software|warp)/i,
] as const;

export function classifyRendererInfo(input: {
  vendor?: string | null;
  renderer?: string | null;
  unmaskedVendor?: string | null;
  unmaskedRenderer?: string | null;
}): RendererInfoSnapshot {
  const vendor = input.vendor ?? null;
  const renderer = input.renderer ?? null;
  const unmaskedVendor = input.unmaskedVendor ?? null;
  const unmaskedRenderer = input.unmaskedRenderer ?? null;
  const haystack = [vendor, renderer, unmaskedVendor, unmaskedRenderer]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  const dangerousPattern = DANGEROUS_SOFTWARE_RENDERER_PATTERNS.find(
    (pattern) => pattern.test(haystack)
  );
  const matchedPattern =
    dangerousPattern ??
    SOFTWARE_RENDERER_PATTERNS.find((pattern) => pattern.test(haystack));

  if (matchedPattern) {
    return {
      vendor,
      renderer,
      unmaskedVendor,
      unmaskedRenderer,
      isSoftwareRenderer: true,
      isDangerousSoftwareRenderer: dangerousPattern !== undefined,
      riskLevel: dangerousPattern ? 'dangerous-software' : 'software',
      reason: `matched ${matchedPattern.source}`,
    };
  }

  return {
    vendor,
    renderer,
    unmaskedVendor,
    unmaskedRenderer,
    isSoftwareRenderer: false,
    isDangerousSoftwareRenderer: false,
    riskLevel: haystack.length > 0 ? 'normal' : 'unknown',
    reason:
      haystack.length > 0
        ? 'no software renderer pattern matched'
        : 'renderer strings unavailable',
  };
}

export function getRendererInfo(renderer: WebGLRenderer): RendererInfoSnapshot {
  const gl = renderer.getContext();
  const vendor = gl.getParameter(gl.VENDOR) as string | null;
  const rendererString = gl.getParameter(gl.RENDERER) as string | null;
  let unmaskedVendor: string | null = null;
  let unmaskedRenderer: string | null = null;

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as
      | string
      | null;
    unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as
      | string
      | null;
  }

  return classifyRendererInfo({
    vendor,
    renderer: rendererString,
    unmaskedVendor,
    unmaskedRenderer,
  });
}
