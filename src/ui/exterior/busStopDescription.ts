import type { ExteriorStrings } from '../../assets/i18n/exterior';
import { BUS_STOP } from '../../scene/level/streetLayout';

/** The physical sign's passive text equivalent, with no input or travel affordance. */
export function createBusStopDescription(parent: HTMLElement) {
  const description = document.createElement('p');
  description.className = 'visually-hidden';
  description.dataset.busStopDescription = '';
  description.dataset.busStopId = BUS_STOP.id;
  description.dataset.availability = BUS_STOP.availability;
  description.hidden = true;
  parent.append(description);
  return {
    update(visible: boolean, strings: ExteriorStrings) {
      if (description.hidden === visible) description.hidden = !visible;
      const text = `${strings.busStop}: ${strings.comingSoon}`;
      if (description.textContent !== text) description.textContent = text;
    },
    dispose() {
      description.remove();
    },
  };
}
