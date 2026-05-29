export type RendererTier = 'hardware' | 'software' | 'unknown';

export interface RendererInfoSnapshot {
  vendor: string | null;
  renderer: string | null;
  unmaskedVendor: string | null;
  unmaskedRenderer: string | null;
  tier: RendererTier;
  reason: string;
}

export interface WebGLDebugRendererInfoLike {
  UNMASKED_VENDOR_WEBGL: number;
  UNMASKED_RENDERER_WEBGL: number;
}

export interface WebGLContextLike {
  getParameter(parameter: number): unknown;
  getExtension(
    name: 'WEBGL_debug_renderer_info'
  ): WebGLDebugRendererInfoLike | null;
  VENDOR?: number;
  RENDERER?: number;
}

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /software/i,
  /llvmpipe/i,
  /softpipe/i,
  /mesa offscreen/i,
  /google inc\. \(google\)/i,
  /angle.*warp/i,
  /microsoft basic render/i,
];

const HARDWARE_RENDERER_PATTERNS = [
  /nvidia/i,
  /amd/i,
  /radeon/i,
  /intel/i,
  /apple/i,
  /adreno/i,
  /mali/i,
  /powervr/i,
];

function normalizeParameter(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

export function classifyRendererInfo(input: {
  vendor?: string | null;
  renderer?: string | null;
  unmaskedVendor?: string | null;
  unmaskedRenderer?: string | null;
}): Pick<RendererInfoSnapshot, 'tier' | 'reason'> {
  const haystack = [
    input.vendor,
    input.renderer,
    input.unmaskedVendor,
    input.unmaskedRenderer,
  ]
    .filter((value): value is string => typeof value === 'string')
    .join(' | ');

  const softwareMatch = SOFTWARE_RENDERER_PATTERNS.find((pattern) =>
    pattern.test(haystack)
  );
  if (softwareMatch) {
    return {
      tier: 'software',
      reason: `matched software renderer pattern ${softwareMatch}`,
    };
  }

  const hardwareMatch = HARDWARE_RENDERER_PATTERNS.find((pattern) =>
    pattern.test(haystack)
  );
  if (hardwareMatch) {
    return {
      tier: 'hardware',
      reason: `matched hardware renderer pattern ${hardwareMatch}`,
    };
  }

  return {
    tier: 'unknown',
    reason:
      haystack.length > 0
        ? 'no renderer pattern matched'
        : 'renderer unavailable',
  };
}

export function readRendererInfo(gl: WebGLContextLike): RendererInfoSnapshot {
  let vendor: string | null = null;
  let renderer: string | null = null;
  let unmaskedVendor: string | null = null;
  let unmaskedRenderer: string | null = null;

  try {
    if (typeof gl.VENDOR === 'number') {
      vendor = normalizeParameter(gl.getParameter(gl.VENDOR));
    }
    if (typeof gl.RENDERER === 'number') {
      renderer = normalizeParameter(gl.getParameter(gl.RENDERER));
    }
  } catch {
    vendor = null;
    renderer = null;
  }

  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      unmaskedVendor = normalizeParameter(
        gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      );
      unmaskedRenderer = normalizeParameter(
        gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      );
    }
  } catch {
    unmaskedVendor = null;
    unmaskedRenderer = null;
  }

  const classification = classifyRendererInfo({
    vendor,
    renderer,
    unmaskedVendor,
    unmaskedRenderer,
  });

  return {
    vendor,
    renderer,
    unmaskedVendor,
    unmaskedRenderer,
    ...classification,
  };
}
