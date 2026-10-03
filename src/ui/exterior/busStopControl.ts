import type { ExteriorStrings } from '../../assets/i18n/exterior';
import { BUS_STOP } from '../../scene/level/streetLayout';

import { createProjectedControlLayout } from './projectedControlLayout';

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
  const layout = createProjectedControlLayout(container, {
    anchor: 'top',
    margin: 12,
    bottomInset: 90,
  });
  const collapse = () => {
    if (message.hidden) return;
    message.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    layout.invalidate();
  };
  const activate = () => {
    if (container.hidden) return;
    message.hidden = !message.hidden;
    button.setAttribute('aria-expanded', String(!message.hidden));
    layout.invalidate();
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
      if (container.hidden !== !visible) {
        container.hidden = !visible;
        layout.invalidate();
      }
      const label = `${strings.busStop}: ${strings.comingSoon}`;
      if (button.textContent !== label) {
        button.textContent = label;
        layout.invalidate();
      }
      if (message.textContent !== strings.busStopMessage) {
        message.textContent = strings.busStopMessage;
        layout.invalidate();
      }
      if (position && visible) layout.update(position);
    },
    dispose() {
      button.removeEventListener('click', activate);
      container.removeEventListener('keydown', keydown);
      layout.dispose();
      container.remove();
    },
  };
}
