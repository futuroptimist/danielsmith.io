export type RendererCapabilityClass = 'hardware' | 'software' | 'unknown';

export interface RendererInfoSnapshot {
  vendor: string;
  renderer: string;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
  capabilityClass: RendererCapabilityClass;
  softwareRenderer: boolean;
}

export interface WebGlDebugRendererInfoLike {
  UNMASKED_VENDOR_WEBGL: number;
  UNMASKED_RENDERER_WEBGL: number;
}

export interface WebGlCapabilitiesContextLike {
  getExtension(
    name: 'WEBGL_debug_renderer_info'
  ): WebGlDebugRendererInfoLike | null;
  getExtension(name: string): unknown;
  getParameter(parameter: number): unknown;
}

const VENDOR = 0x1f00;
const RENDERER = 0x1f01;

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /llvmpipe/i,
  /software/i,
  /softpipe/i,
  /mesa offscreen/i,
  /google inc\. \(google\)/i,
  /angle.*warp/i,
  /warp/i,
] as const;

function readStringParameter(
  gl: WebGlCapabilitiesContextLike,
  parameter: number
): string {
  try {
    const value = gl.getParameter(parameter);
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
}

export function classifyRendererInfo(input: {
  vendor?: string;
  renderer?: string;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
}): RendererCapabilityClass {
  const combined = [
    input.vendor,
    input.renderer,
    input.unmaskedVendor,
    input.unmaskedRenderer,
  ]
    .filter(Boolean)
    .join(' ');

  if (!combined.trim()) {
    return 'unknown';
  }

  return SOFTWARE_RENDERER_PATTERNS.some((pattern) => pattern.test(combined))
    ? 'software'
    : 'hardware';
}

export function readRendererInfo(
  gl: WebGlCapabilitiesContextLike | null | undefined
): RendererInfoSnapshot {
  if (!gl) {
    return {
      vendor: '',
      renderer: '',
      capabilityClass: 'unknown',
      softwareRenderer: false,
    };
  }

  const vendor = readStringParameter(gl, VENDOR);
  const renderer = readStringParameter(gl, RENDERER);
  let unmaskedVendor: string | undefined;
  let unmaskedRenderer: string | undefined;

  try {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      unmaskedVendor = readStringParameter(gl, debugInfo.UNMASKED_VENDOR_WEBGL);
      unmaskedRenderer = readStringParameter(
        gl,
        debugInfo.UNMASKED_RENDERER_WEBGL
      );
    }
  } catch {
    // Browsers may intentionally hide this extension; masked strings remain useful.
  }

  const capabilityClass = classifyRendererInfo({
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
    capabilityClass,
    softwareRenderer: capabilityClass === 'software',
  };
}
