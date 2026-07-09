export interface SettingsControlOrderOptions {
  readonly first?: HTMLElement | null;
  readonly last?: HTMLElement | null;
}

function moveToStart(container: HTMLElement, element: HTMLElement): void {
  if (
    element.parentElement !== container ||
    container.firstElementChild === element
  ) {
    return;
  }
  container.insertBefore(element, container.firstElementChild);
}

function moveToEnd(container: HTMLElement, element: HTMLElement): void {
  if (
    element.parentElement !== container ||
    container.lastElementChild === element
  ) {
    return;
  }
  container.appendChild(element);
}

export function orderSettingsControls(
  container: HTMLElement,
  { first, last }: SettingsControlOrderOptions
): void {
  if (first) {
    moveToStart(container, first);
  }
  if (last && last !== first) {
    moveToEnd(container, last);
  }
}
