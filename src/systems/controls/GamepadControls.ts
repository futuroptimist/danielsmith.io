import type { KeyBindingAction } from './keyBindings';

export const GAMEPAD_DEAD_ZONE = 0.2;

/** Radial dead zone preserves direction and scales the remaining travel to full speed. */
export function gamepadStick(x = 0, y = 0): { x: number; y: number } {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0 };
  const length = Math.hypot(x, y);
  if (length <= GAMEPAD_DEAD_ZONE) return { x: 0, y: 0 };
  const scale =
    (Math.min(length, 1) - GAMEPAD_DEAD_ZONE) / (1 - GAMEPAD_DEAD_ZONE);
  return { x: (x / length) * scale, y: (y / length) * scale };
}

export class GamepadControls {
  movement = { x: 0, y: 0 };
  camera = { x: 0, y: 0 };
  zoom = 0;
  interact = false;
  private identity: string | null = null;
  private armed = false;
  private held = false;
  private disposed = false;

  constructor(private readonly target: Window = window) {
    target.addEventListener('blur', this.reset);
    target.addEventListener('gamepaddisconnected', this.reset);
    target.document.addEventListener('visibilitychange', this.reset);
    target.document.addEventListener('focusin', this.reset);
  }

  private clear() {
    this.movement = { x: 0, y: 0 };
    this.camera = { x: 0, y: 0 };
    this.zoom = 0;
    this.interact = false;
  }

  readonly reset = () => {
    this.clear();
    this.identity = null;
    this.armed = false;
    this.held = false;
  };

  /** Poll once per scene frame. Never dispatch DOM keys or activate browser/UI controls. */
  update(blocked = false): void {
    this.clear();
    const doc = this.target.document;
    const active = doc.activeElement;
    if (
      this.disposed ||
      blocked ||
      doc.hidden ||
      !doc.hasFocus() ||
      active?.closest(
        'input, textarea, select, button, a, [contenteditable], [role="dialog"], dialog'
      )
    ) {
      this.reset();
      return;
    }
    let pads: (Gamepad | null)[];
    try {
      pads = Array.from(this.target.navigator.getGamepads?.() ?? []);
    } catch {
      this.reset();
      return;
    }
    const supported = pads.filter((pad): pad is Gamepad =>
      Boolean(
        pad?.connected &&
          pad.mapping === 'standard' &&
          pad.axes.length >= 4 &&
          pad.buttons.length >= 16
      )
    );
    const id = (pad: Gamepad) => `${pad.index}:${pad.id}`;
    const pad =
      supported.find((item) => id(item) === this.identity) ?? supported[0];
    if (!pad) {
      this.reset();
      return;
    }
    if (id(pad) !== this.identity) {
      this.reset();
      this.identity = id(pad);
    }
    const button = (index: number) => {
      const value = pad.buttons[index]?.value ?? 0;
      return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    };
    const pressed = (index: number) =>
      pad.buttons[index]?.pressed || button(index) > 0.5;
    const left = gamepadStick(pad.axes[0], pad.axes[1]);
    const right = gamepadStick(pad.axes[2], pad.axes[3]);
    const anyButton = pad.buttons.some(
      (item) => item.pressed || item.value > 0.1
    );
    if (!this.armed) {
      this.armed = !anyButton && !left.x && !left.y && !right.x && !right.y;
      return;
    }
    this.movement = {
      x: Math.max(
        -1,
        Math.min(1, left.x + Number(pressed(15)) - Number(pressed(14)))
      ),
      y: Math.max(
        -1,
        Math.min(1, left.y + Number(pressed(13)) - Number(pressed(12)))
      ),
    };
    this.camera = right;
    this.zoom = Math.max(0, button(7) - 0.1) - Math.max(0, button(6) - 0.1);
    const held = Boolean(pressed(0));
    this.interact = held && !this.held;
    this.held = held;
  }

  getActionValue(action: KeyBindingAction): number {
    switch (action) {
      case 'moveRight':
        return Math.max(0, this.movement.x);
      case 'moveLeft':
        return Math.max(0, -this.movement.x);
      case 'moveForward':
        return Math.max(0, -this.movement.y);
      case 'moveBackward':
        return Math.max(0, this.movement.y);
      case 'interact':
        return Number(this.interact);
      default:
        return 0;
    }
  }

  dispose(): void {
    this.disposed = true;
    this.reset();
    this.target.removeEventListener('blur', this.reset);
    this.target.removeEventListener('gamepaddisconnected', this.reset);
    this.target.document.removeEventListener('visibilitychange', this.reset);
    this.target.document.removeEventListener('focusin', this.reset);
  }
}
