/** Keep projected controls clear of the HUD without forcing layout every frame. */
export function createProjectedControlLayout(element: HTMLElement) {
  const hud = document.getElementById('control-overlay');
  let dirty = true;
  let width = 0;
  let height = 0;
  let hudBottom = 0;
  const invalidate = () => {
    dirty = true;
  };
  const sizes =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(invalidate);
  sizes?.observe(element);
  if (hud) sizes?.observe(hud);
  // Switching between mouse and touch can move the HUD without a viewport resize.
  const layout = new MutationObserver(invalidate);
  layout.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-hud-layout'],
  });
  window.addEventListener('resize', invalidate);
  return {
    invalidate,
    update(position: { x: number; y: number }) {
      if (dirty) {
        const bounds = element.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        hudBottom = hud?.getBoundingClientRect().bottom ?? 0;
        dirty = false;
      }
      const halfWidth = width / 2;
      const x = Math.max(
        halfWidth + 16,
        Math.min(window.innerWidth - halfWidth - 16, position.x)
      );
      const minimumBottom = Math.max(height + 16, hudBottom + height + 12);
      const y = Math.max(
        minimumBottom,
        Math.min(window.innerHeight - 100, position.y)
      );
      const left = `${Math.round(x)}px`;
      const top = `${Math.round(y)}px`;
      if (element.style.left !== left) element.style.left = left;
      if (element.style.top !== top) element.style.top = top;
    },
    dispose() {
      sizes?.disconnect();
      layout.disconnect();
      window.removeEventListener('resize', invalidate);
    },
  };
}
