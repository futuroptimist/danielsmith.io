/** English fallback for the optional exhibit controls. */
export const AQUILOOP_COPY = {
  heading: 'Aquiloop · visual simulation',
  pause: 'Pause aquarium cycle',
  resume: 'Resume aquarium cycle',
  phases: {
    idle: 'Resting · next exchange every 5 active minutes',
    drain: 'Draining · amber receivers fill',
    refill: 'Refilling · blue treated-water supply feeds the pump',
    replenish: 'Game replenishment · waste removed and fresh supply restored',
  },
  quantities: (tank: number, receiver: number, supply: number) =>
    `Tank ${tank.toFixed(1)} / 150 gal. Each of 8 amber receivers: ${receiver.toFixed(2)} / 5 gal. Each of 8 blue supplies: ${supply.toFixed(2)} / 5 gal.`,
};
