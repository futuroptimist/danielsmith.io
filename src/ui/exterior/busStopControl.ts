import type { ExteriorStrings } from '../../assets/i18n/exterior';
import { BUS_STOP } from '../../scene/level/streetLayout';

/** A local disclosure, never a navigation action or a destination loader. */
export function createBusStopControl(options: {
  parent: HTMLElement;
  restoreFocus(): void;
}) {
  const container = document.createElement('section');
  container.className = 'exterior-bus-stop-control';
  container.dataset.busStopId = BUS_STOP.id;
  container.dataset.availability = BUS_STOP.availability;
  container.hidden = true;
  const button = document.createElement('button');
  button.type = 'button';
  const message = document.createElement('p');
  message.id = 'residential-bus-stop-message';
  message.hidden = true;
  button.setAttribute('aria-controls', message.id);
  button.setAttribute('aria-expanded', 'false');
  message.setAttribute('aria-live', 'polite');
  container.append(button, message);
  options.parent.append(container);
  const collapse = () => {
    message.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  const activate = () => {
    if (container.hidden) return;
    message.hidden = !message.hidden;
    button.setAttribute('aria-expanded', String(!message.hidden));
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      collapse();
      options.restoreFocus();
    } else if (['Enter', ' ', 'Spacebar'].includes(event.key)) {
      if (event.repeat) event.preventDefault();
      event.stopPropagation();
    }
  };
  button.addEventListener('click', activate);
  container.addEventListener('keydown', keydown);
  return {
    container,
    button,
    activate,
    update(
      visible: boolean,
      strings: ExteriorStrings,
      position?: { x: number; y: number }
    ) {
      if (!visible) {
        collapse();
        if (container.contains(document.activeElement)) options.restoreFocus();
      }
      container.hidden = !visible;
      const label = `${strings.busStop}: ${strings.comingSoon}`;
      if (button.textContent !== label) button.textContent = label;
      if (message.textContent !== strings.busStopMessage)
        message.textContent = strings.busStopMessage;
      if (position && visible) {
        const bounds = container.getBoundingClientRect();
        const hudBottom =
          document.querySelector('#control-overlay')?.getBoundingClientRect()
            .bottom ?? 0;
        const x = Math.max(
          bounds.width / 2 + 12,
          Math.min(window.innerWidth - bounds.width / 2 - 12, position.x)
        );
        const y = Math.max(
          hudBottom + 12,
          Math.min(window.innerHeight - bounds.height - 90, position.y)
        );
        container.style.left = `${Math.round(x)}px`;
        container.style.top = `${Math.round(y)}px`;
      }
    },
    dispose() {
      button.removeEventListener('click', activate);
      container.removeEventListener('keydown', keydown);
      container.remove();
    },
  };
}
