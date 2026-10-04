import type { DoorController, DoorOccupant } from './controller';

/** Capture complete key presses before frame polling and POI selection can consume them. */
export function bindDoorInteraction(options: {
  target: Window;
  getBindings(): readonly string[];
  getDoor(): DoorController | null;
  getOccupant(): DoorOccupant;
  canInteract(event: KeyboardEvent): boolean;
}) {
  const handle = (event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (!options.canInteract(event)) return;
    if (
      !options
        .getBindings()
        .some((key) => key.toLowerCase() === event.key.toLowerCase())
    )
      return;
    const door = options.getDoor();
    const occupant = options.getOccupant();
    if (!door?.isInRange(occupant)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!event.repeat) door.toggle(occupant);
  };
  options.target.addEventListener('keydown', handle, true);
  return () => options.target.removeEventListener('keydown', handle, true);
}
