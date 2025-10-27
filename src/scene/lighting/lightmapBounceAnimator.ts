import { MathUtils, MeshStandardMaterial } from 'three';

import { getPulseScale } from '../../ui/accessibility/animationPreferences';
import type { RoomCeilingPanel } from '../structures/ceilingPanels';

import {
  createLedProgramSampler,
  type LedPulseProgram,
} from './ledPulsePrograms';

export interface LightmapBounceAnimatorOptions {
  readonly floorMaterial: MeshStandardMaterial;
  readonly wallMaterial: MeshStandardMaterial;
  readonly fenceMaterial?: MeshStandardMaterial;
  readonly ceilingPanels?: Iterable<RoomCeilingPanel>;
  readonly programs?: Iterable<LedPulseProgram>;
  readonly defaultProgram?: LedPulseProgram;
  readonly response?: {
    readonly floor?: number;
    readonly wall?: number;
    readonly fence?: number;
    readonly ceiling?: number;
  };
}

export interface LightmapBounceAnimator {
  update(elapsedSeconds: number): void;
  captureBaseline(): void;
}

interface LightmapBounceEntry {
  material: MeshStandardMaterial;
  baseIntensity: number;
  response: number;
}

interface CeilingBounceEntry extends LightmapBounceEntry {
  roomId: string;
}

interface ProgramSamplerEntry {
  roomId: string;
  sample: (elapsed: number) => number;
}

const DEFAULT_PROGRAM: LedPulseProgram = {
  roomId: '__lightmap__',
  cycleSeconds: 24,
  keyframes: [
    { time: 0, stripMultiplier: 0.95 },
    { time: 0.32, stripMultiplier: 1.1, ease: 'sine-in-out' },
    { time: 0.66, stripMultiplier: 0.92, ease: 'sine-in-out' },
    { time: 1, stripMultiplier: 0.95 },
  ],
};

const DEFAULT_RESPONSE = Object.freeze({
  floor: 0.35,
  wall: 0.4,
  fence: 0.32,
  ceiling: 0.55,
});

function clamp01(value: number | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }
  const next = value ?? 0;
  if (next <= 0) {
    return 0;
  }
  if (next >= 1) {
    return 1;
  }
  return next;
}

function sanitizeIntensity(value: number | undefined): number {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }
  return Math.max(0, value ?? 0);
}

function resolveResponse(
  provided: number | undefined,
  fallback: number
): number {
  if (!Number.isFinite(provided ?? NaN)) {
    return fallback;
  }
  return clamp01(provided);
}

function resolveProgramSamplers(
  programs: Iterable<LedPulseProgram> | undefined,
  defaultProgram: LedPulseProgram
): ProgramSamplerEntry[] {
  const map = new Map<string, LedPulseProgram>();
  if (programs) {
    for (const program of programs) {
      if (!program?.roomId) {
        continue;
      }
      map.set(program.roomId, program);
    }
  }
  if (map.size === 0) {
    map.set(defaultProgram.roomId, defaultProgram);
  }

  const entries: ProgramSamplerEntry[] = [];
  for (const program of map.values()) {
    const sampler = createLedProgramSampler({
      roomId: program.roomId,
      cycleSeconds: program.cycleSeconds,
      keyframes: program.keyframes,
    });
    entries.push({
      roomId: program.roomId,
      sample: (elapsed) => {
        const { stripMultiplier } = sampler(elapsed);
        if (!Number.isFinite(stripMultiplier) || stripMultiplier <= 0) {
          return 1;
        }
        return stripMultiplier;
      },
    });
  }
  return entries;
}

export function createLightmapBounceAnimator(
  options: LightmapBounceAnimatorOptions
): LightmapBounceAnimator {
  const responseOverrides = options.response ?? {};
  const floorEntry: LightmapBounceEntry = {
    material: options.floorMaterial,
    baseIntensity: sanitizeIntensity(
      options.floorMaterial.lightMapIntensity ?? 1
    ),
    response: resolveResponse(responseOverrides.floor, DEFAULT_RESPONSE.floor),
  };
  const wallEntry: LightmapBounceEntry = {
    material: options.wallMaterial,
    baseIntensity: sanitizeIntensity(
      options.wallMaterial.lightMapIntensity ?? 1
    ),
    response: resolveResponse(responseOverrides.wall, DEFAULT_RESPONSE.wall),
  };
  const fenceEntry: LightmapBounceEntry | null = options.fenceMaterial
    ? {
        material: options.fenceMaterial,
        baseIntensity: sanitizeIntensity(
          options.fenceMaterial.lightMapIntensity ?? 1
        ),
        response: resolveResponse(
          responseOverrides.fence,
          DEFAULT_RESPONSE.fence
        ),
      }
    : null;

  const ceilingEntries: CeilingBounceEntry[] = [];
  if (options.ceilingPanels) {
    for (const panel of options.ceilingPanels) {
      const material = panel.mesh.material;
      if (Array.isArray(material)) {
        continue;
      }
      if (!(material instanceof MeshStandardMaterial)) {
        continue;
      }
      ceilingEntries.push({
        roomId: panel.roomId,
        material,
        baseIntensity: sanitizeIntensity(material.lightMapIntensity ?? 1),
        response: resolveResponse(
          responseOverrides.ceiling,
          DEFAULT_RESPONSE.ceiling
        ),
      });
    }
  }

  const samplers = resolveProgramSamplers(
    options.programs,
    options.defaultProgram ?? DEFAULT_PROGRAM
  );

  const captureBaseline = () => {
    floorEntry.baseIntensity = sanitizeIntensity(
      floorEntry.material.lightMapIntensity ?? floorEntry.baseIntensity
    );
    wallEntry.baseIntensity = sanitizeIntensity(
      wallEntry.material.lightMapIntensity ?? wallEntry.baseIntensity
    );
    if (fenceEntry) {
      fenceEntry.baseIntensity = sanitizeIntensity(
        fenceEntry.material.lightMapIntensity ?? fenceEntry.baseIntensity
      );
    }
    for (const entry of ceilingEntries) {
      entry.baseIntensity = sanitizeIntensity(
        entry.material.lightMapIntensity ?? entry.baseIntensity
      );
    }
  };

  const update = (elapsedSeconds: number) => {
    const pulseScale = MathUtils.clamp(getPulseScale(), 0, 1);
    const sampleMap = new Map<string, number>();
    let sum = 0;
    let count = 0;
    for (const sampler of samplers) {
      const value = sampler.sample(elapsedSeconds);
      sampleMap.set(sampler.roomId, value);
      sum += value;
      count += 1;
    }
    const average = count > 0 ? sum / count : 1;

    const applyBounce = (entry: LightmapBounceEntry, sample: number) => {
      const multiplier = Math.max(
        0,
        1 + (sample - 1) * entry.response * pulseScale
      );
      entry.material.lightMapIntensity = entry.baseIntensity * multiplier;
    };

    applyBounce(floorEntry, average);
    applyBounce(wallEntry, average);
    if (fenceEntry) {
      applyBounce(fenceEntry, average);
    }
    for (const entry of ceilingEntries) {
      const sample = sampleMap.get(entry.roomId) ?? average;
      applyBounce(entry, sample);
    }
  };

  return {
    update,
    captureBaseline,
  };
}
