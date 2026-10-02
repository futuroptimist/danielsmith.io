import { vi } from 'vitest';

export function mockCareerCanvas() {
  return vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () =>
      ({
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        fillText: vi.fn(),
        measureText: (text: string) => ({ width: text.length * 28 }),
        createLinearGradient: () => ({ addColorStop: vi.fn() }),
      }) as unknown as CanvasRenderingContext2D
  );
}
