import { CanvasTexture, Color, SRGBColorSpace } from 'three';

export const IMMERSIVE_GRADIENT_STOPS = {
  top: '#0a111c',
  bottom: '#020408',
} as const;

export const IMMERSIVE_GRADIENT_CSS_BACKGROUND = `linear-gradient(180deg, ${IMMERSIVE_GRADIENT_STOPS.top} 0%, ${IMMERSIVE_GRADIENT_STOPS.bottom} 100%)`;

export const IMMERSIVE_GRADIENT_SOLID_FALLBACK = '#020408';

const HEX_STOPS = {
  top: 0x0a111c,
  bottom: 0x020408,
} as const;

export function createImmersiveGradientTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create gradient canvas context.');
  }

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, new Color(HEX_STOPS.top).getStyle());
  gradient.addColorStop(1, new Color(HEX_STOPS.bottom).getStyle());

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
