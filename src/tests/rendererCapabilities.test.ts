import { describe, expect, it, vi } from 'vitest';

import {
  classifyRendererInfo,
  readRendererInfo,
} from '../scene/graphics/rendererCapabilities';

const DEBUG_VENDOR = 0x9245;
const DEBUG_RENDERER = 0x9246;

describe('renderer capability classification', () => {
  it('detects known software renderers from masked and unmasked strings', () => {
    expect(
      classifyRendererInfo({ unmaskedRenderer: 'Google SwiftShader' })
    ).toBe('software');
    expect(classifyRendererInfo({ renderer: 'llvmpipe (LLVM 17.0.0)' })).toBe(
      'software'
    );
    expect(classifyRendererInfo({ renderer: 'ANGLE (NVIDIA RTX 4090)' })).toBe(
      'hardware'
    );
    expect(classifyRendererInfo({})).toBe('unknown');
  });

  it('reads debug renderer info when browsers expose it', () => {
    const gl = {
      getExtension: vi.fn().mockReturnValue({
        UNMASKED_VENDOR_WEBGL: DEBUG_VENDOR,
        UNMASKED_RENDERER_WEBGL: DEBUG_RENDERER,
      }),
      getParameter: vi.fn((parameter: number) => {
        if (parameter === DEBUG_VENDOR) {
          return 'Google Inc.';
        }
        if (parameter === DEBUG_RENDERER) {
          return 'Google SwiftShader';
        }
        return '';
      }),
    };

    expect(readRendererInfo(gl)).toMatchObject({
      unmaskedRenderer: 'Google SwiftShader',
      capabilityClass: 'software',
      softwareRenderer: true,
    });
  });
});
