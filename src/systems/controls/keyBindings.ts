import type { KeyboardControls } from './KeyboardControls';

export type KeyBindingAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'interact'
  | 'help';

export type KeyBindingConfig = Partial<
  Record<KeyBindingAction, readonly string[]>
>;

export interface KeyPressSource {
  isPressed(key: string): boolean;
}

export type KeyBindingListener = (
  action: KeyBindingAction,
  bindings: readonly string[]
) => void;

export const DEFAULT_KEY_BINDINGS: Record<KeyBindingAction, readonly string[]> =
  {
    moveForward: ['w', 'ArrowUp'],
    moveBackward: ['s', 'ArrowDown'],
    moveLeft: ['a', 'ArrowLeft'],
    moveRight: ['d', 'ArrowRight'],
    interact: ['Enter', 'f', ' '],
    help: ['h', '?'],
  };

type ActionEntries = [KeyBindingAction, readonly string[]];

function normalizeKey(raw: string): string {
  if (raw === ' ') {
    return ' ';
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }

  const spacePattern = /^(space|spacebar)$/i;
  if (spacePattern.test(trimmed)) {
    return ' ';
  }

  if (trimmed.length === 1) {
    return trimmed.toLowerCase();
  }

  return trimmed;
}

function normalizeKeys(keys: readonly string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const key of keys) {
    if (typeof key !== 'string') {
      continue;
    }
    const value = normalizeKey(key);
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }
  return normalized;
}

export class KeyBindings {
  private readonly bindings = new Map<KeyBindingAction, string[]>();

  private readonly listeners = new Set<KeyBindingListener>();

  constructor(initial?: KeyBindingConfig) {
    for (const action of Object.keys(
      DEFAULT_KEY_BINDINGS
    ) as KeyBindingAction[]) {
      if (!this.bindings.has(action)) {
        this.bindings.set(action, []);
      }
    }
    this.applyConfig(Object.entries(DEFAULT_KEY_BINDINGS) as ActionEntries[]);
    if (initial) {
      this.update(initial);
    }
  }

  getBindings(action: KeyBindingAction): readonly string[] {
    return this.bindings.get(action)?.slice() ?? [];
  }

  getPrimaryBinding(action: KeyBindingAction): string | null {
    const bindings = this.bindings.get(action);
    return bindings && bindings.length > 0 ? bindings[0] : null;
  }

  isActionActive(action: KeyBindingAction, source: KeyPressSource): boolean {
    const bindings = this.bindings.get(action);
    if (!bindings || bindings.length === 0) {
      return false;
    }
    return bindings.some((binding) => source.isPressed(binding));
  }

  update(config: KeyBindingConfig): void {
    const entries = Object.entries(config) as ActionEntries[];
    this.applyConfig(entries);
  }

  setBindings(action: KeyBindingAction, keys: readonly string[]): void {
    this.applyConfig([[action, keys]]);
  }

  reset(action: KeyBindingAction): void {
    this.applyConfig([[action, DEFAULT_KEY_BINDINGS[action]]]);
  }

  resetAll(): void {
    this.applyConfig(Object.entries(DEFAULT_KEY_BINDINGS) as ActionEntries[]);
  }

  subscribe(listener: KeyBindingListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private applyConfig(entries: ActionEntries[]): void {
    for (const [action, keys] of entries) {
      if (!action || !this.bindings.has(action)) {
        continue;
      }
      const normalized = normalizeKeys(keys);
      const previous = this.bindings.get(action) ?? [];
      if (this.areBindingsEqual(previous, normalized)) {
        continue;
      }
      this.bindings.set(action, normalized);
      this.emit(action);
    }
  }

  private areBindingsEqual(
    a: readonly string[],
    b: readonly string[]
  ): boolean {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) {
        return false;
      }
    }
    return true;
  }

  private emit(action: KeyBindingAction): void {
    const bindings = this.bindings.get(action) ?? [];
    for (const listener of this.listeners) {
      listener(action, bindings);
    }
  }
}

export function formatKeyLabel(key: string | null | undefined): string {
  if (!key) {
    return '';
  }
  if (key === ' ') {
    return 'Space';
  }
  if (key.length === 1) {
    return key.toUpperCase();
  }
  if (key.startsWith('Arrow')) {
    const direction = key.slice('Arrow'.length);
    return `Arrow ${direction}`;
  }
  return key;
}

export function createKeyBindingAwareSource(
  controls: KeyboardControls
): KeyPressSource {
  return {
    isPressed(key: string) {
      return controls.isPressed(key);
    },
  };
}
