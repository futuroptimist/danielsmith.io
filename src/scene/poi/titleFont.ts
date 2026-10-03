/** Keep complete career names within the existing two-line canvas labels. */
export function fitPoiTitleFont(
  context: CanvasRenderingContext2D,
  title: string,
  maxWidth: number,
  maximumSize: number,
  minimumSize: number,
  maxHeight = Number.POSITIVE_INFINITY
): number {
  const words = title.trim().split(/\s+/).filter(Boolean);
  for (let size = maximumSize; size >= minimumSize; size -= 2) {
    context.font = `bold ${size}px "Inter", "Segoe UI", sans-serif`;
    let lines = 1;
    let line = '';
    let wordsFit = true;
    for (const word of words) {
      wordsFit &&= context.measureText(word).width <= maxWidth;
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > maxWidth) {
        lines += 1;
        line = word;
      } else {
        line = next;
      }
    }
    if (lines <= 2 && wordsFit && lines * (size + 4) - 4 <= maxHeight) {
      return size;
    }
  }
  return minimumSize;
}
