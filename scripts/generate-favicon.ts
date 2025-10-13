import { promises as fs } from 'node:fs';
import path from 'node:path';

// Minimal ICO encoder for 32-bit BGRA DIB images with AND mask.
// Draws a simple pixel-art head: long dark hair, beard, pale skin,
// tiny shirt at the bottom, transparent background.

type Rgba = { r: number; g: number; b: number; a: number };

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v | 0));
}

function createImage(size: number): Uint8Array {
  return new Uint8Array(size * size * 4); // RGBA, top-down in our buffer
}

function setPixel(
  img: Uint8Array,
  size: number,
  x: number,
  y: number,
  color: Rgba
) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }
  const i = (y * size + x) * 4;
  img[i + 0] = clampByte(color.r);
  img[i + 1] = clampByte(color.g);
  img[i + 2] = clampByte(color.b);
  img[i + 3] = clampByte(color.a);
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
  for (
    let y = Math.max(0, Math.floor(cy - ry));
    y <= Math.min(size - 1, Math.ceil(cy + ry));
    y += 1
  ) {
    for (
      let x = Math.max(0, Math.floor(cx - rx));
      x <= Math.min(size - 1, Math.ceil(cy + rx));
      x += 1
    ) {
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

function drawPortrait(size: number): Uint8Array {
  const img = createImage(size);
  // Background is transparent by default (no fill needed)
  const hair: Rgba = { r: 40, g: 32, b: 26, a: 255 }; // deep brown/black
  // Single-tone hair keeps edges clean at small sizes
  const skin: Rgba = { r: 242, g: 214, b: 200, a: 255 }; // pale skin
  const skinShadow: Rgba = { r: 226, g: 190, b: 176, a: 255 };
  const beard: Rgba = { r: 34, g: 28, b: 24, a: 255 };
  const shirt: Rgba = { r: 30, g: 35, b: 43, a: 255 };
  const eye: Rgba = { r: 56, g: 60, b: 64, a: 255 };
  const eyeHighlight: Rgba = { r: 230, g: 240, b: 255, a: 255 };
  const mouth: Rgba = { r: 172, g: 120, b: 118, a: 255 };
  const nose: Rgba = { r: 210, g: 178, b: 166, a: 255 };
  const drawEye = (xc: number, yc: number) => {
    const sclera: Rgba = { r: 245, g: 248, b: 255, a: 255 };
    const scleraRx = size * 0.06;
    const scleraRy = size * 0.05;
    fillEllipse(img, size, xc, yc, scleraRx, scleraRy, sclera);
    fillEllipse(img, size, xc, yc, size * 0.035, size * 0.035, eye);
    fillEllipse(
      img,
      size,
      xc + size * 0.01,
      yc - size * 0.01,
      size * 0.015,
      size * 0.015,
      eyeHighlight
    );
  };

  // Pixel-crisp eye that guarantees visible pupils at favicon scale
  const drawEyeBox = (xc: number, yc: number) => {
    const sx = Math.round(xc);
    const sy = Math.round(yc);
    // Sclera 4x3
    fillRect(img, size, sx - 2, sy - 1, sx + 1, sy + 1, {
      r: 245,
      g: 248,
      b: 255,
      a: 255,
    });
    // Pupil 1x1 centered
    setPixel(img, size, sx, sy, { r: 45, g: 48, b: 52, a: 255 });
  };

  // Background transparent by default (already zeroed)
  // Long hair halo – reduced poof, more vertical/long than round
  const cx = size / 2;
  const cy = size / 2 - 1;
  fillEllipse(img, size, cx, cy - size * 0.18, size * 0.46, size * 0.6, hair);
  // Flatten the top to avoid an afro shape
  fillRect(
    img,
    size,
    Math.floor(size * 0.18),
    Math.floor(size * 0.06),
    Math.floor(size * 0.82),
    Math.floor(size * 0.22),
    hair
  );
  // Side curtains to imply longer hair (symmetrical, slim)
  fillRect(
    img,
    size,
    Math.floor(size * 0.1),
    Math.floor(size * 0.3),
    Math.floor(size * 0.18),
    Math.floor(size * 0.88),
    hair
  );
  fillRect(
    img,
    size,
    Math.floor(size * 0.82),
    Math.floor(size * 0.3),
    Math.floor(size * 0.9),
    Math.floor(size * 0.88),
    hair
  );

  // Remove highlight band to keep hair uniform at favicon scale

  // Face oval (smaller so hair frames naturally)
  fillEllipse(img, size, cx, cy + size * 0.02, size * 0.34, size * 0.42, skin);
  // Cheek/jaw shadows
  fillEllipse(
    img,
    size,
    cx - size * 0.12,
    cy + size * 0.06,
    size * 0.2,
    size * 0.26,
    skinShadow
  );
  fillEllipse(
    img,
    size,
    cx + size * 0.12,
    cy + size * 0.06,
    size * 0.2,
    size * 0.26,
    skinShadow
  );

  // Eyes (higher so beard cannot intersect) with white sclera
  const eyeY = cy - size * 0.1;
  const eyeDx = size * 0.14;
  drawEye(cx - eyeDx, eyeY);
  drawEye(cx + eyeDx, eyeY);

  // Nose
  const noseTop = Math.floor(cy - size * 0.03);
  const noseBottom = Math.floor(cy + size * 0.05);
  fillRect(
    img,
    size,
    Math.floor(cx - 0.5),
    noseTop,
    Math.floor(cx + 0.5),
    noseBottom,
    nose
  );

  // Mouth
  const mouthW = Math.max(6, Math.floor(size * 0.26));
  const mouthH = Math.max(1, Math.round(size * 0.04));
  const mouthY = Math.floor(cy + size * 0.08 - mouthH / 2);
  fillRect(
    img,
    size,
    Math.floor(cx - mouthW / 2),
    mouthY,
    Math.floor(cx + mouthW / 2),
    mouthY + mouthH,
    mouth
  );

  // Redraw eyes after nose/mouth to ensure nothing overwrites them
  {
    // Ensure eyes render on top of all features, using crisp boxes
    const eyeY2 = cy - size * 0.1;
    const eyeDx2 = size * 0.14;
    drawEyeBox(cx - eyeDx2, eyeY2);
    drawEyeBox(cx + eyeDx2, eyeY2);
  }

  // Beard – starts under mouth and overlaps shirt (smooth, no rectangular tails)
  fillEllipse(img, size, cx, cy + size * 0.3, size * 0.32, size * 0.3, beard);
  // Slight chin extension
  fillEllipse(img, size, cx, cy + size * 0.4, size * 0.28, size * 0.2, beard);

  // Tiny shirt at bottom (behind beard overlap visually it will be under)
  fillRect(
    img,
    size,
    Math.floor(size * 0.18),
    Math.floor(size * 0.84),
    Math.floor(size * 0.82),
    size - 1,
    shirt
  );

  // Clean up edges: make pixels transparent where hair/face never painted
  // (already transparent by default).
  return img;
}

function downscaleNearest(
  src: Uint8Array,
  srcSize: number,
  dstSize: number
): Uint8Array {
  const dst = new Uint8Array(dstSize * dstSize * 4);
  for (let y = 0; y < dstSize; y += 1) {
    for (let x = 0; x < dstSize; x += 1) {
      const sx = Math.min(srcSize - 1, Math.floor((x / dstSize) * srcSize));
      const sy = Math.min(srcSize - 1, Math.floor((y / dstSize) * srcSize));
      const si = (sy * srcSize + sx) * 4;
      const di = (y * dstSize + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }
  return dst;
}

function encodeIco(
  images: Array<{ size: number; rgba: Uint8Array }>
): Uint8Array {
  // Prepare DIB sections for each image
  const dibs = images.map(({ size, rgba }) => encodeDib32WithMask(size, rgba));
  const imageDataSizes = dibs.map((b) => b.length);

  // ICONDIR (6 bytes) + n * ICONDIRENTRY (16 bytes)
  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const totalSize = headerSize + imageDataSizes.reduce((a, b) => a + b, 0);
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  // ICONDIR
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type
  view.setUint16(4, images.length, true); // count

  let dirPos = 6;
  for (let i = 0; i < images.length; i += 1) {
    const { size } = images[i];
    const dib = dibs[i];
    out[dirPos + 0] = size === 256 ? 0 : size; // width
    out[dirPos + 1] = size === 256 ? 0 : size; // height
    out[dirPos + 2] = 0; // color count
    out[dirPos + 3] = 0; // reserved
    view.setUint16(dirPos + 4, 1, true); // planes
    view.setUint16(dirPos + 6, 32, true); // bit count
    view.setUint32(dirPos + 8, dib.length, true); // bytes in res
    view.setUint32(dirPos + 12, offset, true); // image offset
    dirPos += 16;

    out.set(dib, offset);
    offset += dib.length;
  }

  return out;
}

function encodeDib32WithMask(
  size: number,
  rgbaTopDown: Uint8Array
): Uint8Array {
  const width = size;
  const height = size;
  const headerSize = 40; // BITMAPINFOHEADER

  // XOR bitmap (BGRA, bottom-up rows)
  const rowSize = width * 4;
  const xorSize = rowSize * height;

  // AND mask: 1 bit per pixel, rows padded to 32 bits
  const andRowBytes = Math.ceil(width / 32) * 4;
  const andSize = andRowBytes * height;

  const total = headerSize + xorSize + andSize;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);

  // BITMAPINFOHEADER
  view.setUint32(0, headerSize, true);
  view.setInt32(4, width, true);
  view.setInt32(8, height * 2, true); // includes AND mask
  view.setUint16(12, 1, true); // planes
  view.setUint16(14, 32, true); // bit count
  view.setUint32(16, 0, true); // BI_RGB
  view.setUint32(20, xorSize, true);
  view.setInt32(24, 0, true); // ppm X
  view.setInt32(28, 0, true); // ppm Y
  view.setUint32(32, 0, true); // colors used
  view.setUint32(36, 0, true); // important colors

  // XOR: convert RGBA top-down to BGRA bottom-up
  let dst = headerSize;
  for (let y = 0; y < height; y += 1) {
    const sy = height - 1 - y; // bottom-up
    for (let x = 0; x < width; x += 1) {
      const si = (sy * width + x) * 4;
      out[dst + 0] = rgbaTopDown[si + 2]; // B
      out[dst + 1] = rgbaTopDown[si + 1]; // G
      out[dst + 2] = rgbaTopDown[si + 0]; // R
      out[dst + 3] = rgbaTopDown[si + 3]; // A
      dst += 4;
    }
  }

  // AND mask: 1 = transparent, 0 = opaque
  for (let y = 0; y < height; y += 1) {
    const sy = height - 1 - y; // bottom-up
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
    // Row padding to 32-bit boundary
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

  const img32 = drawPortrait(32);
  const img16 = downscaleNearest(img32, 32, 16);
  const leftEyeX = Math.round(32 / 2 - 32 * 0.14);
  const rightEyeX = Math.round(32 / 2 + 32 * 0.14);
  const eyeY = Math.round(32 / 2 - 1 - 32 * 0.1);

  if (debug) {
    const idx = (y: number, x: number) => (y * 32 + x) * 4;
    const li = idx(eyeY, leftEyeX);
    const ri = idx(eyeY, rightEyeX);
    // eslint-disable-next-line no-console
    console.log('Left eye RGBA@32:', img32.slice(li, li + 4));
    // eslint-disable-next-line no-console
    console.log('Right eye RGBA@32:', img32.slice(ri, ri + 4));
  }

  const ico = encodeIco([
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
