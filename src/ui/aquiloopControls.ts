import { AQUILOOP_COPY } from '../assets/i18n/aquiloop';
import type { sampleAquiloopCycle } from '../scene/structures/aquiloopCycle';

export function createAquiloopControls(onPause: () => void) {
  const panel = document.createElement('section');
  panel.className = 'aquiloop-controls';
  panel.setAttribute('aria-label', AQUILOOP_COPY.heading);
  panel.style.cssText =
    'position:fixed;right:1rem;bottom:7rem;max-width:17rem;padding:0.8rem;background:#10232f;color:#fff;border:1px solid #85e4eb;border-radius:0.6rem;z-index:20;font:13px/1.4 sans-serif';
  const heading = document.createElement('strong');
  heading.textContent = AQUILOOP_COPY.heading;
  const phase = document.createElement('p');
  phase.setAttribute('aria-live', 'polite');
  const quantities = document.createElement('p');
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.textContent = AQUILOOP_COPY.pause;
  pause.setAttribute('aria-pressed', 'false');
  let paused = false;
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.textContent = paused ? AQUILOOP_COPY.resume : AQUILOOP_COPY.pause;
    pause.setAttribute('aria-pressed', String(paused));
    onPause();
  });
  panel.append(heading, phase, quantities, pause);
  panel.hidden = true;
  document.body.append(panel);
  let lastQuantities = '';
  return {
    get paused() {
      return paused;
    },
    update(state: ReturnType<typeof sampleAquiloopCycle>, visible: boolean) {
      panel.hidden = !visible;
      const nextPhase = AQUILOOP_COPY.phases[state.phase];
      if (phase.textContent !== nextPhase) phase.textContent = nextPhase;
      const next = AQUILOOP_COPY.quantities(
        state.tankGallons,
        state.receiverGallons,
        state.supplyGallons
      );
      if (next !== lastQuantities) {
        quantities.textContent = next;
        lastQuantities = next;
      }
    },
    dispose() {
      panel.remove();
    },
  };
}
