import { isGraphicsQualityPreset, type GraphicsQualityPreset } from '../graphics/qualityManager';

export interface GraphicsQualityControlOptions {
  container: HTMLElement;
  getQuality: () => GraphicsQualityPreset | string;
  setQuality: (preset: GraphicsQualityPreset) => void;
  windowTarget?: Window;
  cycleKey?: string;
}

export interface GraphicsQualityControlHandle {
  readonly element: HTMLDivElement;
  refresh(): void;
  dispose(): void;
}

interface QualityOption {
  readonly preset: GraphicsQualityPreset;
  readonly label: string;
  readonly description: string;
}

const QUALITY_OPTIONS: QualityOption[] = [
  {
    preset: 'cinematic',
    label: 'Cinematic',
    description: 'Full bloom, high pixel density',
  },
  {
    preset: 'performance',
    label: 'Performance',
    description: 'Disables bloom, caps pixel ratio for speed',
  },
];

const defaultCycleKey = 'g';

function nextPreset(current: GraphicsQualityPreset): GraphicsQualityPreset {
  const index = QUALITY_OPTIONS.findIndex((option) => option.preset === current);
  const nextIndex = index === -1 ? 0 : (index + 1) % QUALITY_OPTIONS.length;
  return QUALITY_OPTIONS[nextIndex]!.preset;
}

function coercePreset(value: string | GraphicsQualityPreset): GraphicsQualityPreset {
  return isGraphicsQualityPreset(value) ? value : 'cinematic';
}

export function createGraphicsQualityControl({
  container,
  getQuality,
  setQuality,
  windowTarget = window,
  cycleKey = defaultCycleKey,
}: GraphicsQualityControlOptions): GraphicsQualityControlHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'graphics-quality';
  wrapper.setAttribute('role', 'group');
  wrapper.setAttribute('aria-label', 'Graphics quality controls');

  const heading = document.createElement('span');
  heading.className = 'graphics-quality__heading';
  heading.textContent = 'Graphics';

  const selectId = 'graphics-quality-select';
  const label = document.createElement('label');
  label.className = 'graphics-quality__label';
  label.htmlFor = selectId;
  label.textContent = 'Quality preset';

  const select = document.createElement('select');
  select.id = selectId;
  select.name = 'graphics-quality';
  select.className = 'graphics-quality__select';
  select.setAttribute('aria-label', 'Graphics quality preset');

  for (const option of QUALITY_OPTIONS) {
    const element = document.createElement('option');
    element.value = option.preset;
    element.textContent = option.label;
    select.appendChild(element);
  }

  const description = document.createElement('p');
  description.className = 'graphics-quality__description';

  label.appendChild(select);

  wrapper.appendChild(heading);
  wrapper.appendChild(label);
  wrapper.appendChild(description);

  container.appendChild(wrapper);

  const update = () => {
    const quality = coercePreset(getQuality());
    select.value = quality;
    const option = QUALITY_OPTIONS.find((entry) => entry.preset === quality);
    description.textContent = option?.description ?? '';
  };

  const handleChange = () => {
    const next = coercePreset(select.value);
    setQuality(next);
    update();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    if (event.key !== cycleKey && event.key !== cycleKey.toUpperCase()) {
      return;
    }
    event.preventDefault();
    const current = coercePreset(getQuality());
    const next = nextPreset(current);
    setQuality(next);
    update();
  };

  select.addEventListener('change', handleChange);
  windowTarget.addEventListener('keydown', handleKeydown);

  update();

  return {
    element: wrapper,
    refresh: update,
    dispose() {
      select.removeEventListener('change', handleChange);
      windowTarget.removeEventListener('keydown', handleKeydown);
      if (wrapper.parentElement) {
        wrapper.remove();
      }
    },
  };
}
