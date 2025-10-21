import { MeshStandardMaterial, PointLight } from 'three';
import { describe, expect, it } from 'vitest';

import {
  ROOM_LED_PULSE_PROGRAMS,
  ROOM_LED_TIMELINES,
  compileLedTimeline,
  createLedAnimator,
  createLedProgramSampler,
  type LedPulseProgram,
} from '../scene/lighting/ledPulsePrograms';

const toFixed = (value: number) => Number(value.toFixed(5));

describe('createLedProgramSampler', () => {
  it('returns default multipliers when no keyframes exist', () => {
    const sampler = createLedProgramSampler({
      roomId: 'empty',
      cycleSeconds: 12,
      keyframes: [],
    });
    expect(sampler(4)).toEqual({ stripMultiplier: 1, fillMultiplier: 1 });
  });

  it('interpolates between keyframes and wraps the cycle', () => {
    const program: LedPulseProgram = {
      roomId: 'test',
      cycleSeconds: 10,
      keyframes: [
        { time: 0, stripMultiplier: 1, fillMultiplier: 1 },
        { time: 0.5, stripMultiplier: 2, fillMultiplier: 3 },
        { time: 1, stripMultiplier: 1, fillMultiplier: 1 },
      ],
    };
    const sampler = createLedProgramSampler(program);
    expect(sampler(0)).toEqual({ stripMultiplier: 1, fillMultiplier: 1 });
    expect(sampler(2.5)).toEqual({ stripMultiplier: 1.5, fillMultiplier: 2 });
    expect(sampler(7.5)).toEqual({ stripMultiplier: 1.5, fillMultiplier: 2 });
    expect(sampler(10)).toEqual({ stripMultiplier: 1, fillMultiplier: 1 });
  });

  it('applies easing when provided', () => {
    const program: LedPulseProgram = {
      roomId: 'ease',
      cycleSeconds: 8,
      keyframes: [
        {
          time: 0,
          stripMultiplier: 0.5,
          fillMultiplier: 0.5,
          ease: 'sine-in-out',
        },
        { time: 1, stripMultiplier: 1.5, fillMultiplier: 1.5 },
      ],
    };
    const sampler = createLedProgramSampler(program);
    const sample = sampler(2); // normalized time = 0.25
    const alpha = 0.25;
    const eased = 0.5 - Math.cos(Math.PI * alpha) / 2;
    const expected = 0.5 + (1.5 - 0.5) * eased;
    expect(toFixed(sample.stripMultiplier)).toBeCloseTo(toFixed(expected), 5);
    expect(toFixed(sample.fillMultiplier)).toBeCloseTo(toFixed(expected), 5);
  });

  it('falls back to strip multiplier when fill multiplier is omitted', () => {
    const program: LedPulseProgram = {
      roomId: 'fallback',
      cycleSeconds: 6,
      keyframes: [
        { time: 0, stripMultiplier: 0.8 },
        { time: 1, stripMultiplier: 1.2 },
      ],
    };
    const sampler = createLedProgramSampler(program);
    expect(sampler(1.5)).toEqual({ stripMultiplier: 0.9, fillMultiplier: 0.9 });
  });
});

describe('compileLedTimeline', () => {
  it('normalizes timeline points and preserves easing assignments', () => {
    const program = compileLedTimeline({
      roomId: 'timeline-test',
      cycleSeconds: 12,
      points: [
        {
          timeSeconds: 4,
          stripMultiplier: 1.2,
          fillMultiplier: 1.1,
          ease: 'sine-in-out',
        },
        { timeSeconds: -3, stripMultiplier: 0.8 },
        { timeSeconds: 6, stripMultiplier: 1.04, fillMultiplier: 0.96 },
        { timeSeconds: 6, stripMultiplier: 1.05, fillMultiplier: 0.98 },
        {
          timeSeconds: 18,
          stripMultiplier: 0.6,
          fillMultiplier: 0.55,
          ease: 'linear',
        },
      ],
    });

    expect(program.roomId).toBe('timeline-test');
    expect(program.cycleSeconds).toBeCloseTo(12);
    expect(program.keyframes).toEqual([
      {
        time: 0,
        stripMultiplier: 0.8,
        fillMultiplier: 0.8,
        ease: undefined,
      },
      {
        time: 4 / 12,
        stripMultiplier: 1.2,
        fillMultiplier: 1.1,
        ease: 'sine-in-out',
      },
      {
        time: 6 / 12,
        stripMultiplier: 1.05,
        fillMultiplier: 0.98,
        ease: undefined,
      },
      {
        time: 1,
        stripMultiplier: 0.6,
        fillMultiplier: 0.55,
        ease: 'linear',
      },
    ]);
  });

  it('duplicates lone timeline points to cover an entire cycle', () => {
    const program = compileLedTimeline({
      roomId: 'single',
      cycleSeconds: 0,
      points: [{ timeSeconds: 0, stripMultiplier: 0.7 }],
    });

    expect(program.cycleSeconds).toBeCloseTo(1e-6);
    expect(program.keyframes).toHaveLength(2);
    expect(program.keyframes[0]).toMatchObject({
      time: 0,
      stripMultiplier: 0.7,
      fillMultiplier: 0.7,
    });
    expect(program.keyframes[1]).toMatchObject({
      time: 1,
      stripMultiplier: 0.7,
      fillMultiplier: 0.7,
    });
  });
});

describe('createLedAnimator', () => {
  it('scales intensities relative to the captured baseline', () => {
    const material = new MeshStandardMaterial({ emissiveIntensity: 2 });
    const light = new PointLight(0xffffff, 3);
    const animator = createLedAnimator({
      programs: [
        {
          roomId: 'room',
          cycleSeconds: 10,
          keyframes: [
            { time: 0, stripMultiplier: 1, fillMultiplier: 1 },
            { time: 0.5, stripMultiplier: 0.5, fillMultiplier: 0.4 },
            { time: 1, stripMultiplier: 1, fillMultiplier: 1 },
          ],
        },
      ],
      targets: [
        {
          roomId: 'room',
          material,
          fillLight: light,
        },
      ],
    });

    animator.captureBaseline();
    animator.update(2.5);
    expect(material.emissiveIntensity).toBeCloseTo(1.5, 5);
    expect(light.intensity).toBeCloseTo(2.1, 5);

    material.emissiveIntensity = 4;
    light.intensity = 6;
    animator.captureBaseline();
    animator.update(2.5);
    expect(material.emissiveIntensity).toBeCloseTo(3, 5);
    expect(light.intensity).toBeCloseTo(4.2, 5);
  });
});

describe('ROOM_LED_TIMELINES', () => {
  it('compile into the exported pulse programs without altering sequence order', () => {
    ROOM_LED_TIMELINES.forEach((timeline, index) => {
      const program = compileLedTimeline(timeline);
      expect(program.roomId).toBe(timeline.roomId);
      expect(program.cycleSeconds).toBeCloseTo(timeline.cycleSeconds);
      expect(program.keyframes[0]?.time).toBe(0);
      expect(program.keyframes.at(-1)?.time).toBe(1);
      expect(program.keyframes.length).toBeGreaterThanOrEqual(2);

      const exportedProgram = ROOM_LED_PULSE_PROGRAMS[index];
      expect(exportedProgram.keyframes).toEqual(program.keyframes);
    });
  });
});
