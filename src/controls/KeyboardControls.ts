export class KeyboardControls {
  private readonly pressedKeys = new Set<string>();
  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented) {
      return;
    }

    this.pressedKeys.add(this.normalizeKey(event.key));
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(this.normalizeKey(event.key));
  };

  constructor(target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  isPressed(key: string): boolean {
    return this.pressedKeys.has(this.normalizeKey(key));
  }

  dispose(target: Window = window): void {
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    this.pressedKeys.clear();
  }

  private normalizeKey(key: string): string {
    if (key.length === 1) {
      return key.toLowerCase();
    }

    return key;
  }
}
