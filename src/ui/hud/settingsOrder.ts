export interface SettingsControlOrderOptions {
  readonly container: HTMLElement;
  readonly graphicsQuality?: HTMLElement | null;
  readonly customization?: HTMLElement | null;
}

export function applySettingsControlOrder({
  container,
  graphicsQuality,
  customization,
}: SettingsControlOrderOptions): void {
  warnIfAnchorIsDetached(container, graphicsQuality, 'Graphics Quality');
  warnIfAnchorIsDetached(container, customization, 'Customization');

  const currentChildren = Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement
  );
  const ordered = [
    graphicsQuality ?? null,
    ...currentChildren.filter(
      (child) => child !== graphicsQuality && child !== customization
    ),
    customization ?? null,
  ].filter((child): child is HTMLElement => Boolean(child));

  ordered.forEach((child) => {
    if (child.parentElement === container) {
      container.appendChild(child);
    }
  });
}

function warnIfAnchorIsDetached(
  container: HTMLElement,
  anchor: HTMLElement | null | undefined,
  label: string
): void {
  if (anchor && anchor.parentElement !== container) {
    console.warn(
      `${label} settings control must be registered before applying Settings ordering.`
    );
  }
}
