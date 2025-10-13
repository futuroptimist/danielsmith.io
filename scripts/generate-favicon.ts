import { promises as fs } from 'node:fs';
import path from 'node:path';

type Rgba = { r: number; g: number; b: number; a?: number };

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v | 0));
}

function createImage(size: number): Uint8Array {
  return new Uint8Array(size * size * 4);
}

function setPixel(img: Uint8Array, size: number, x: number, y: number, color: Rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const i = (y * size + x) * 4;
  const srcA = clampByte(color.a ?? 255) / 255;
  const dstA = img[i + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);

  if (outA <= 0) {
    img[i + 0] = 0;
    img[i + 1] = 0;
    img[i + 2] = 0;
    img[i + 3] = 0;
    return;
  }

  const srcR = clampByte(color.r);
  const srcG = clampByte(color.g);
  const srcB = clampByte(color.b);
  const dstR = img[i + 0];
  const dstG = img[i + 1];
  const dstB = img[i + 2];

  const outR = (srcR * srcA + dstR * dstA * (1 - srcA)) / outA;
  const outG = (srcG * srcA + dstG * dstA * (1 - srcA)) / outA;
  const outB = (srcB * srcA + dstB * dstA * (1 - srcA)) / outA;

  img[i + 0] = clampByte(outR);
  img[i + 1] = clampByte(outG);
  img[i + 2] = clampByte(outB);
  img[i + 3] = clampByte(outA * 255);
}

function fillEllipse(
  img: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: Rgba
) {
  const minY = Math.max(0, Math.floor(cy - ry));
  const maxY = Math.min(size - 1, Math.ceil(cy + ry));
  const minX = Math.max(0, Math.floor(cx - rx));
  const maxX = Math.min(size - 1, Math.ceil(cx + rx));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(img, size, x, y, color);
      }
    }
  }
}

function fillRect(
  img: Uint8Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: Rgba
) {
  const minX = Math.max(0, Math.min(x0, x1) | 0);
  const maxX = Math.min(size - 1, Math.max(x0, x1) | 0);
  const minY = Math.max(0, Math.min(y0, y1) | 0);
  const maxY = Math.min(size - 1, Math.max(y0, y1) | 0);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      setPixel(img, size, x, y, color);
    }
  }
}

function drawEye(
  img: Uint8Array,
  size: number,
  xc: number,
  yc: number,
  scleraColor: Rgba,
  irisColor: Rgba,
  pupilColor: Rgba,
  highlightColor: Rgba
) {
  const scleraRx = size * 0.07;
  const scleraRy = size * 0.055;
  fillEllipse(img, size, xc, yc, scleraRx, scleraRy, scleraColor);
  fillEllipse(img, size, xc, yc, size * 0.035, size * 0.035, irisColor);
  fillEllipse(img, size, xc, yc, size * 0.02, size * 0.02, pupilColor);
  fillEllipse(
    img,
    size,
    xc + size * 0.018,
    yc - size * 0.018,
    size * 0.01,
    size * 0.01,
    highlightColor
  );
}

function drawPortraitHighRes(size: number): Uint8Array {
  const img = createImage(size);
  const cx = size / 2;
  const circleCy = size * 0.52;
  const faceCy = size * 0.6;

  const colors = {
    bgOuter: { r: 30, g: 18, b: 52, a: 255 },
    bgMid: { r: 58, g: 36, b: 92, a: 255 },
    bgInner: { r: 104, g: 74, b: 148, a: 240 },
    shirt: { r: 34, g: 42, b: 68, a: 255 },
    shirtHighlight: { r: 82, g: 96, b: 136, a: 140 },
    hairBase: { r: 56, g: 44, b: 38, a: 255 },
    hairShadow: { r: 24, g: 16, b: 14, a: 210 },
    hairHighlight: { r: 118, g: 96, b: 84, a: 140 },
    skinBase: { r: 242, g: 214, b: 200, a: 255 },
    skinHighlight: { r: 255, g: 232, b: 220, a: 170 },
    skinShadow: { r: 210, g: 182, b: 170, a: 170 },
    underEye: { r: 255, g: 234, b: 222, a: 140 },
    cheekWarm: { r: 255, g: 204, b: 196, a: 120 },
    brow: { r: 74, g: 58, b: 52, a: 255 },
    browHighlight: { r: 134, g: 108, b: 96, a: 120 },
    sclera: { r: 248, g: 246, b: 242, a: 255 },
    iris: { r: 128, g: 124, b: 160, a: 255 },
    pupil: { r: 42, g: 36, b: 52, a: 255 },
    eyeHighlight: { r: 255, g: 255, b: 255, a: 255 },
    nose: { r: 236, g: 204, b: 190, a: 230 },
    noseHighlight: { r: 255, g: 230, b: 216, a: 160 },
    noseShadow: { r: 198, g: 170, b: 160, a: 120 },
    lip: { r: 206, g: 154, b: 164, a: 210 },
    lipHighlight: { r: 228, g: 180, b: 186, a: 140 },
    beardBase: { r: 48, g: 36, b: 32, a: 255 },
    beardShadow: { r: 30, g: 22, b: 20, a: 220 },
    beardHighlight: { r: 106, g: 88, b: 78, a: 130 },
    moustache: { r: 66, g: 48, b: 44, a: 255 },
    moustacheHighlight: { r: 130, g: 108, b: 98, a: 120 },
  } satisfies Record<string, Rgba>;

  // Background gradient circle
  fillEllipse(img, size, cx, circleCy, size * 0.46, size * 0.46, colors.bgOuter);
  fillEllipse(
    img,
    size,
    cx,
    circleCy - size * 0.015,
    size * 0.43,
    size * 0.43,
    colors.bgMid
  );
  fillEllipse(
    img,
    size,
    cx,
    circleCy - size * 0.02,
    size * 0.38,
    size * 0.38,
    colors.bgInner
  );

  // Shirt / shoulders (subtle curve)
  fillEllipse(img, size, cx, size * 0.86, size * 0.36, size * 0.18, colors.shirt);
  fillEllipse(
    img,
    size,
    cx - size * 0.08,
    size * 0.83,
    size * 0.22,
    size * 0.12,
    colors.shirtHighlight
  );

  // Hair mass - drawn behind facial features
  fillEllipse(img, size, cx, faceCy - size * 0.3, size * 0.34, size * 0.32, colors.hairBase);
  fillEllipse(img, size, cx, faceCy - size * 0.05, size * 0.46, size * 0.44, colors.hairBase);
  fillEllipse(
    img,
    size,
    cx - size * 0.28,
    faceCy + size * 0.02,
    size * 0.18,
    size * 0.38,
    colors.hairBase
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.28,
    faceCy + size * 0.02,
    size * 0.18,
    size * 0.38,
    colors.hairBase
  );
  fillEllipse(img, size, cx, faceCy + size * 0.26, size * 0.38, size * 0.3, colors.hairBase);

  // Hair depth & highlight
  fillEllipse(
    img,
    size,
    cx + size * 0.18,
    faceCy + size * 0.08,
    size * 0.28,
    size * 0.34,
    colors.hairShadow
  );
  fillEllipse(img, size, cx, faceCy + size * 0.32, size * 0.32, size * 0.22, colors.hairShadow);
  fillEllipse(
    img,
    size,
    cx - size * 0.16,
    faceCy - size * 0.04,
    size * 0.26,
    size * 0.26,
    colors.hairHighlight
  );
  fillEllipse(
    img,
    size,
    cx - size * 0.1,
    faceCy + size * 0.2,
    size * 0.22,
    size * 0.18,
    colors.hairHighlight
  );

  // Face base
  fillEllipse(img, size, cx, faceCy, size * 0.26, size * 0.32, colors.skinBase);
  fillEllipse(
    img,
    size,
    cx - size * 0.08,
    faceCy - size * 0.02,
    size * 0.18,
    size * 0.24,
    colors.skinHighlight
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.09,
    faceCy + size * 0.02,
    size * 0.2,
    size * 0.28,
    colors.skinShadow
  );
  fillEllipse(
    img,
    size,
    cx - size * 0.14,
    faceCy + size * 0.05,
    size * 0.12,
    size * 0.1,
    colors.cheekWarm
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.05,
    faceCy + size * 0.12,
    size * 0.16,
    size * 0.12,
    colors.skinShadow
  );

  const eyeY = faceCy - size * 0.12;
  const eyeDx = size * 0.155;
  fillEllipse(
    img,
    size,
    cx - eyeDx,
    eyeY + size * 0.03,
    size * 0.12,
    size * 0.045,
    colors.underEye
  );
  fillEllipse(
    img,
    size,
    cx + eyeDx,
    eyeY + size * 0.03,
    size * 0.12,
    size * 0.045,
    colors.underEye
  );

  drawEye(
    img,
    size,
    cx - eyeDx,
    eyeY,
    colors.sclera,
    colors.iris,
    colors.pupil,
    colors.eyeHighlight
  );
  drawEye(
    img,
    size,
    cx + eyeDx,
    eyeY,
    colors.sclera,
    colors.iris,
    colors.pupil,
    colors.eyeHighlight
  );

  // Eyelids and brows
  fillEllipse(
    img,
    size,
    cx - eyeDx,
    eyeY - size * 0.032,
    size * 0.13,
    size * 0.05,
    colors.skinShadow
  );
  fillEllipse(
    img,
    size,
    cx + eyeDx,
    eyeY - size * 0.032,
    size * 0.13,
    size * 0.05,
    colors.skinShadow
  );
  fillEllipse(img, size, cx - eyeDx, eyeY - size * 0.085, size * 0.16, size * 0.045, colors.brow);
  fillEllipse(img, size, cx + eyeDx, eyeY - size * 0.085, size * 0.16, size * 0.045, colors.brow);
  fillEllipse(
    img,
    size,
    cx - eyeDx,
    eyeY - size * 0.095,
    size * 0.16,
    size * 0.03,
    colors.browHighlight
  );
  fillEllipse(
    img,
    size,
    cx + eyeDx,
    eyeY - size * 0.095,
    size * 0.16,
    size * 0.03,
    colors.browHighlight
  );

  // Nose structure
  fillRect(
    img,
    size,
    Math.round(cx - size * 0.015),
    Math.round(faceCy - size * 0.05),
    Math.round(cx + size * 0.015),
    Math.round(faceCy + size * 0.08),
    colors.nose
  );
  fillEllipse(img, size, cx, faceCy + size * 0.06, size * 0.04, size * 0.045, colors.noseHighlight);
  fillEllipse(
    img,
    size,
    cx + size * 0.035,
    faceCy + size * 0.04,
    size * 0.05,
    size * 0.06,
    colors.noseShadow
  );

  // Lips
  const lipY = faceCy + size * 0.1;
  fillEllipse(img, size, cx, lipY, size * 0.14, size * 0.028, colors.lip);
  fillEllipse(
    img,
    size,
    cx,
    lipY - size * 0.01,
    size * 0.14,
    size * 0.016,
    colors.lipHighlight
  );

  // Beard and moustache
  fillEllipse(img, size, cx, faceCy + size * 0.2, size * 0.3, size * 0.28, colors.beardBase);
  fillEllipse(img, size, cx, faceCy + size * 0.3, size * 0.26, size * 0.24, colors.beardBase);
  fillEllipse(
    img,
    size,
    cx - size * 0.18,
    faceCy + size * 0.2,
    size * 0.16,
    size * 0.22,
    colors.beardBase
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.18,
    faceCy + size * 0.2,
    size * 0.16,
    size * 0.22,
    colors.beardBase
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.12,
    faceCy + size * 0.28,
    size * 0.18,
    size * 0.2,
    colors.beardShadow
  );
  fillEllipse(
    img,
    size,
    cx - size * 0.12,
    faceCy + size * 0.22,
    size * 0.18,
    size * 0.16,
    colors.beardHighlight
  );

  fillEllipse(
    img,
    size,
    cx - size * 0.11,
    faceCy + size * 0.07,
    size * 0.14,
    size * 0.06,
    colors.moustache
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.11,
    faceCy + size * 0.07,
    size * 0.14,
    size * 0.06,
    colors.moustache
  );
  fillEllipse(
    img,
    size,
    cx,
    faceCy + size * 0.065,
    size * 0.18,
    size * 0.04,
    colors.moustacheHighlight
  );
  fillEllipse(img, size, cx, faceCy + size * 0.15, size * 0.24, size * 0.1, colors.beardShadow);

  // Blend beard softly into the cheeks to keep features gentle
  fillEllipse(
    img,
    size,
    cx - size * 0.12,
    faceCy + size * 0.12,
    size * 0.16,
    size * 0.12,
    colors.skinShadow
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.12,
    faceCy + size * 0.12,
    size * 0.16,
    size * 0.12,
    colors.skinShadow
  );

  return img;
}

function downscaleBox(src: Uint8Array, srcSize: number, dstSize: number): Uint8Array {
  const factor = srcSize / dstSize;
  if (!Number.isInteger(factor)) {
    throw new Error(`downscaleBox requires integer factor (got ${factor})`);
  }

  const dst = new Uint8Array(dstSize * dstSize * 4);
  const area = factor * factor;

  for (let y = 0; y < dstSize; y += 1) {
    for (let x = 0; x < dstSize; x += 1) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      const sy0 = y * factor;
      const sx0 = x * factor;

      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const si = ((sy0 + dy) * srcSize + (sx0 + dx)) * 4;
          bSum += src[si + 0];
          gSum += src[si + 1];
          rSum += src[si + 2];
          aSum += src[si + 3];
        }
      }

      const di = (y * dstSize + x) * 4;
      dst[di + 0] = clampByte(bSum / area);
      dst[di + 1] = clampByte(gSum / area);
      dst[di + 2] = clampByte(rSum / area);
      dst[di + 3] = clampByte(aSum / area);
    }
  }

  return dst;
}

function encodeIco(images: Array<{ size: number; rgba: Uint8Array }>): Uint8Array {
  const dibs = images.map(({ size, rgba }) => encodeDib32WithMask(size, rgba));
  const imageDataSizes = dibs.map((b) => b.length);

  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const totalSize = headerSize + imageDataSizes.reduce((a, b) => a + b, 0);
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);

  let dirPos = 6;
  for (let i = 0; i < images.length; i += 1) {
    const { size } = images[i];
    const dib = dibs[i];
    out[dirPos + 0] = size === 256 ? 0 : size;
    out[dirPos + 1] = size === 256 ? 0 : size;
    out[dirPos + 2] = 0;
    out[dirPos + 3] = 0;
    view.setUint16(dirPos + 4, 1, true);
    view.setUint16(dirPos + 6, 32, true);
    view.setUint32(dirPos + 8, dib.length, true);
    view.setUint32(dirPos + 12, offset, true);
    dirPos += 16;

    out.set(dib, offset);
    offset += dib.length;
  }

  return out;
}

function encodeDib32WithMask(size: number, rgbaTopDown: Uint8Array): Uint8Array {
  const width = size;
  const height = size;
  const headerSize = 40;
  const rowSize = width * 4;
  const xorSize = rowSize * height;
  const andRowBytes = Math.ceil(width / 32) * 4;
  const andSize = andRowBytes * height;
  const total = headerSize + xorSize + andSize;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  view.setUint32(0, headerSize, true);
  view.setInt32(4, width, true);
  view.setInt32(8, height * 2, true);
  view.setUint16(12, 1, true);
  view.setUint16(14, 32, true);
  view.setUint32(16, 0, true);
  view.setUint32(20, xorSize, true);
  view.setInt32(24, 0, true);
  view.setInt32(28, 0, true);
  view.setUint32(32, 0, true);
  view.setUint32(36, 0, true);

  let dst = headerSize;
  for (let y = 0; y < height; y += 1) {
    const sy = height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const si = (sy * width + x) * 4;
      out[dst + 0] = rgbaTopDown[si + 2];
      out[dst + 1] = rgbaTopDown[si + 1];
      out[dst + 2] = rgbaTopDown[si + 0];
      out[dst + 3] = rgbaTopDown[si + 3];
      dst += 4;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const sy = height - 1 - y;
    let byte = 0;
    let bit = 7;
    for (let x = 0; x < width; x += 1) {
      const si = (sy * width + x) * 4;
      const a = rgbaTopDown[si + 3];
      const isTransparent = a < 128 ? 1 : 0;
      byte |= isTransparent << bit;
      bit -= 1;
      if (bit < 0) {
        out[dst++] = byte;
        byte = 0;
        bit = 7;
      }
    }
    if (bit !== 7) {
      out[dst++] = byte;
    }
    const used = Math.ceil(width / 8);
    const padding = andRowBytes - used;
    for (let p = 0; p < padding; p += 1) {
      out[dst++] = 0;
    }
  }

  return out;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const root = process.cwd();
  const outDir = path.resolve(root, 'public');
  const outFile = path.resolve(outDir, 'favicon.ico');
  const debug = process.argv.includes('--debug');

  await ensureDir(outDir);

  const highResSize = 128;
  const highRes = drawPortraitHighRes(highResSize);
  const img64 = downscaleBox(highRes, highResSize, 64);
  const img32 = downscaleBox(highRes, highResSize, 32);
  const img16 = downscaleBox(highRes, highResSize, 16);

  if (debug) {
    // eslint-disable-next-line no-console
    console.log('Generated portrait layers at 128px resolution.');
  }

  const ico = encodeIco([
    { size: 64, rgba: img64 },
    { size: 32, rgba: img32 },
    { size: 16, rgba: img16 },
  ]);

  await fs.writeFile(outFile, ico);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${outFile} (${ico.length} bytes)`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
