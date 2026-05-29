import type { GraphicsQualityLevel } from '../../scene/graphics/qualityManager';

export interface RendererInfoSnapshot {
  vendor: string | null;
  renderer: string | null;
  unmaskedVendor: string | null;
  unmaskedRenderer: string | null;
  isSoftwareRenderer: boolean;
  isRiskyRenderer: boolean;
  reason: string | null;
}

export interface PixelRatioPolicy {
  hardwareCap: number;
  riskyCap: number;
  softwareCap: number;
  minimum: number;
}

export const DEFAULT_PIXEL_RATIO_POLICY: PixelRatioPolicy = {
  hardwareCap: 1.25,
  riskyCap: 1,
  softwareCap: 0.75,
  minimum: 0.5,
};

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /software/i,
  /llvmpipe/i,
  /mesa offscreen/i,
  /softpipe/i,
  /lavapipe/i,
  /warp/i,
  /microsoft basic render/i,
];

const RISKY_RENDERER_PATTERNS = [
  /angle.*d3d11on12/i,
  /google inc\. \(google\)/i,
];

export function classifyRendererInfo(
  info: Pick<
    RendererInfoSnapshot,
    'vendor' | 'renderer' | 'unmaskedVendor' | 'unmaskedRenderer'
  >
): RendererInfoSnapshot {
  const haystack = [
    info.vendor,
    info.renderer,
    info.unmaskedVendor,
    info.unmaskedRenderer,
  ]
    .filter(Boolean)
    .join(' ');
  const softwarePattern = SOFTWARE_RENDERER_PATTERNS.find((pattern) =>
    pattern.test(haystack)
  );
  const riskyPattern = RISKY_RENDERER_PATTERNS.find((pattern) =>
    pattern.test(haystack)
  );

  return {
    vendor: info.vendor ?? null,
    renderer: info.renderer ?? null,
    unmaskedVendor: info.unmaskedVendor ?? null,
    unmaskedRenderer: info.unmaskedRenderer ?? null,
    isSoftwareRenderer: Boolean(softwarePattern),
    isRiskyRenderer: Boolean(softwarePattern ?? riskyPattern),
    reason: softwarePattern?.source ?? riskyPattern?.source ?? null,
  };
}

export function readWebGLRendererInfo(
  gl: WebGLRenderingContext
): RendererInfoSnapshot {
  let unmaskedVendor: string | null = null;
  let unmaskedRenderer: string | null = null;
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    unmaskedVendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
    unmaskedRenderer = String(
      gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    );
  }

  return classifyRendererInfo({
    vendor: String(gl.getParameter(gl.VENDOR)),
    renderer: String(gl.getParameter(gl.RENDERER)),
    unmaskedVendor,
    unmaskedRenderer,
  });
}

export function clampDevicePixelRatio(
  value: number,
  rendererInfo: Pick<
    RendererInfoSnapshot,
    'isSoftwareRenderer' | 'isRiskyRenderer'
  >,
  policy: PixelRatioPolicy = DEFAULT_PIXEL_RATIO_POLICY
): number {
  const finiteValue = Number.isFinite(value) && value > 0 ? value : 1;
  const cap = rendererInfo.isSoftwareRenderer
    ? policy.softwareCap
    : rendererInfo.isRiskyRenderer
      ? policy.riskyCap
      : policy.hardwareCap;
  return Math.max(policy.minimum, Math.min(finiteValue, cap));
}

export function chooseInitialGraphicsQuality(
  rendererInfo: Pick<
    RendererInfoSnapshot,
    'isSoftwareRenderer' | 'isRiskyRenderer'
  >,
  persistedLevel?: GraphicsQualityLevel | null
): GraphicsQualityLevel {
  if (rendererInfo.isSoftwareRenderer) {
    return 'performance';
  }
  if (persistedLevel) {
    return persistedLevel;
  }
  if (rendererInfo.isRiskyRenderer) {
    return 'performance';
  }
  return 'balanced';
}
