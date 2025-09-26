const JOYSTICK_RADIUS = 70;
const JOYSTICK_DIAMETER = JOYSTICK_RADIUS * 2;

interface JoystickState {
  pointerId: number;
  originX: number;
  originY: number;
  container: HTMLDivElement;
  thumb: HTMLDivElement;
  value: { x: number; y: number };
}

export class VirtualJoystick {
  private readonly target: HTMLElement;
  private movement?: JoystickState;
  private camera?: JoystickState;

  constructor(target: HTMLElement) {
    this.target = target;
    this.target.addEventListener('pointerdown', this.handlePointerDown, {
      passive: false,
    });
    window.addEventListener('pointermove', this.handlePointerMove, {
      passive: false,
    });
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    this.target.addEventListener('contextmenu', (event) =>
      event.preventDefault()
    );
  }

  getMovement(): { x: number; y: number } {
    return this.movement?.value ?? { x: 0, y: 0 };
  }

  getCamera(): { x: number; y: number } {
    return this.camera?.value ?? { x: 0, y: 0 };
  }

  reset(): void {
    this.destroyJoystick(this.movement);
    this.destroyJoystick(this.camera);
    this.movement = undefined;
    this.camera = undefined;
  }

  private handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse') {
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    event.preventDefault();

    const side = event.clientX < window.innerWidth / 2 ? 'movement' : 'camera';
    const current = side === 'movement' ? this.movement : this.camera;

    if (current && current.pointerId !== event.pointerId) {
      this.destroyJoystick(current);
      if (side === 'movement') {
        this.movement = undefined;
      } else {
        this.camera = undefined;
      }
    }

    const joystick = this.createJoystick(event);
    if (side === 'movement') {
      this.movement = joystick;
    } else {
      this.camera = joystick;
    }

    this.updateJoystick(joystick, event.clientX, event.clientY);
  };

  private handlePointerMove = (event: PointerEvent) => {
    const joystick = this.findJoystick(event.pointerId);
    if (!joystick) {
      return;
    }

    event.preventDefault();
    this.updateJoystick(joystick, event.clientX, event.clientY);
  };

  private handlePointerUp = (event: PointerEvent) => {
    const joystick = this.findJoystick(event.pointerId);
    if (!joystick) {
      return;
    }

    this.destroyJoystick(joystick);

    if (this.movement?.pointerId === event.pointerId) {
      this.movement = undefined;
    }

    if (this.camera?.pointerId === event.pointerId) {
      this.camera = undefined;
    }
  };

  private findJoystick(pointerId: number): JoystickState | undefined {
    if (this.movement?.pointerId === pointerId) {
      return this.movement;
    }

    if (this.camera?.pointerId === pointerId) {
      return this.camera;
    }

    return undefined;
  }

  private createJoystick(event: PointerEvent): JoystickState {
    const container = document.createElement('div');
    container.className = 'joystick';
    container.style.width = `${JOYSTICK_DIAMETER}px`;
    container.style.height = `${JOYSTICK_DIAMETER}px`;
    container.style.left = `${event.clientX}px`;
    container.style.top = `${event.clientY}px`;

    const base = document.createElement('div');
    base.className = 'joystick-base';

    const thumb = document.createElement('div');
    thumb.className = 'joystick-thumb';
    thumb.style.transform = 'translate(-50%, -50%)';

    container.appendChild(base);
    container.appendChild(thumb);

    document.body.appendChild(container);

    return {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      container,
      thumb,
      value: { x: 0, y: 0 },
    };
  }

  private updateJoystick(
    joystick: JoystickState,
    clientX: number,
    clientY: number
  ) {
    const dx = clientX - joystick.originX;
    const dy = clientY - joystick.originY;
    const distance = Math.min(Math.hypot(dx, dy), JOYSTICK_RADIUS);

    const angle = Math.atan2(dy, dx);
    const normalizedX =
      distance === 0 ? 0 : (Math.cos(angle) * distance) / JOYSTICK_RADIUS;
    const normalizedY =
      distance === 0 ? 0 : (Math.sin(angle) * distance) / JOYSTICK_RADIUS;

    joystick.value.x = normalizedX;
    joystick.value.y = normalizedY;

    joystick.thumb.style.transform = `translate(-50%, -50%) translate(${normalizedX * JOYSTICK_RADIUS}px, ${normalizedY * JOYSTICK_RADIUS}px)`;
  }

  private destroyJoystick(joystick?: JoystickState) {
    if (!joystick) {
      return;
    }

    joystick.container.remove();
  }
}
