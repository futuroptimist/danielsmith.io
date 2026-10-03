import type { ExteriorStrings } from '../../assets/i18n/exterior';
import type { DoorSnapshot } from '../../systems/doors/controller';

import { createProjectedControlLayout } from './projectedControlLayout';

const format = (template: string, door: string, state = '') =>
  template.replace('{door}', door).replace('{state}', state);

export function createDoorControl(options: {
  parent: HTMLElement;
  onActivate(): void;
  restoreFocus(): void;
}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'exterior-door-control';
  button.dataset.exteriorDoorControl = '';
  button.hidden = true;
  const live = document.createElement('span');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  options.parent.append(button, live);
  const layout = createProjectedControlLayout(button);
  const setAttribute = (name: string, value: string) => {
    if (button.getAttribute(name) !== value) button.setAttribute(name, value);
  };
  const activate = () => options.onActivate();
  const stopKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      options.restoreFocus();
    } else if (['Enter', ' ', 'Spacebar'].includes(event.key)) {
      if (event.repeat) event.preventDefault();
      event.stopPropagation();
    }
  };
  button.addEventListener('click', activate);
  button.addEventListener('keydown', stopKey);
  let lastAnnouncement = '';
  return {
    button,
    update(
      snapshot: DoorSnapshot | null,
      strings: ExteriorStrings,
      position?: { x: number; y: number }
    ) {
      const hidden = !snapshot;
      if (hidden && document.activeElement === button) options.restoreFocus();
      if (button.hidden !== hidden) {
        button.hidden = hidden;
        layout.invalidate();
      }
      if (!snapshot) {
        lastAnnouncement = '';
        return;
      }
      const name = strings.frontDoor;
      const state = snapshot.occupied
        ? strings.occupied
        : strings[snapshot.state === 'open' ? 'opened' : snapshot.state];
      const label = format(
        snapshot.target ? strings.close : strings.open,
        name
      );
      if (button.textContent !== label) {
        button.textContent = label;
        layout.invalidate();
      }
      setAttribute('aria-label', label);
      setAttribute('aria-pressed', String(snapshot.target === 1));
      setAttribute('data-door-id', snapshot.id);
      setAttribute('data-state', snapshot.state);
      if (position) layout.update(position);
      const announcement = format(strings.status, name, state);
      if (announcement !== lastAnnouncement) {
        live.textContent = announcement;
        lastAnnouncement = announcement;
      }
    },
    dispose() {
      layout.dispose();
      button.removeEventListener('click', activate);
      button.removeEventListener('keydown', stopKey);
      button.remove();
      live.remove();
    },
  };
}
