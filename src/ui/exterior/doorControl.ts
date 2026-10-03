import type { ExteriorStrings } from '../../assets/i18n/exterior';
import type { DoorSnapshot } from '../../systems/doors/controller';

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
      button.hidden = hidden;
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
      if (button.textContent !== label) button.textContent = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(snapshot.target === 1));
      button.dataset.doorId = snapshot.id;
      button.dataset.state = snapshot.state;
      if (position) {
        const bounds = button.getBoundingClientRect();
        const hudBottom =
          document.querySelector('#control-overlay')?.getBoundingClientRect()
            .bottom ?? 0;
        const halfWidth = bounds.width / 2;
        const x = Math.max(
          halfWidth + 16,
          Math.min(window.innerWidth - halfWidth - 16, position.x)
        );
        const minimumBottom = Math.max(
          bounds.height + 16,
          hudBottom + bounds.height + 12
        );
        const y = Math.max(
          minimumBottom,
          Math.min(window.innerHeight - 100, position.y)
        );
        button.style.left = `${Math.round(x)}px`;
        button.style.top = `${Math.round(y)}px`;
      }
      const announcement = format(strings.status, name, state);
      if (announcement !== lastAnnouncement) {
        live.textContent = announcement;
        lastAnnouncement = announcement;
      }
    },
    dispose() {
      button.removeEventListener('click', activate);
      button.removeEventListener('keydown', stopKey);
      button.remove();
      live.remove();
    },
  };
}
