import { MeshStandardMaterial, PointLight } from 'three';
import { describe, expect, it } from 'vitest';

import {
  createLedAnimator,
  createLedProgramFromTimeline,
  createLedProgramSampler,
  type LedPulseProgram,
  type LedTimeline,
} from '../scene/lighting/ledPulsePrograms';

const toFixed = (value: number) => Number(value.toFixed(5));

describe('createLedProgramFromTimeline', () => {
  it('converts timeline segments into normalized keyframes', () => {
    const timeline: LedTimeline = {
      roomId: 'timeline-room',
      segments: [
        {
          durationSeconds: 2,
          stripMultiplier: 0.8,
          fillMultiplier: 0.6,
          ease: 'sine-in-out',
        },
        {
          durationSeconds: 1,
          stripMultiplier: 1.2,
          fillMultiplier: 1.1,
        },
      ],
    };

    const program = createLedProgramFromTimeline(timeline);

    expect(program.roomId).toBe('timeline-room');
    expect(program.cycleSeconds).toBeCloseTo(3, 5);
    expect(program.keyframes).toHaveLength(3);
    expect(program.keyframes[0]).toEqual({
      time: 0,
      stripMultiplier: 0.8,
      fillMultiplier: 0.6,
      ease: 'sine-in-out',
    });
    expect(program.keyframes[1].time).toBeCloseTo(2 / 3, 5);
    expect(program.keyframes[1].stripMultiplier).toBeCloseTo(1.2, 5);
    expect(program.keyframes[1].fillMultiplier).toBeCloseTo(1.1, 5);
    expect(program.keyframes[2]).toEqual({
      time: 1,
      stripMultiplier: 0.8,
      fillMultiplier: 0.6,
    });
  });

  it('filters invalid segments and falls back to strip multiplier for fill', () => {
    const timeline: LedTimeline = {
      roomId: 'sanitize',
      segments: [
        {
          durationSeconds: Number.NaN,
          stripMultiplier: 1.5,
        },
        {
          durationSeconds: 1.5,
          stripMultiplier: 0.5,
        },
      ],
    };

    const program = createLedProgramFromTimeline(timeline);
    expect(program.cycleSeconds).toBeCloseTo(1.5, 5);
    expect(program.keyframes).toEqual([
      {
        time: 0,
        stripMultiplier: 0.5,
        fillMultiplier: 0.5,
      },
      {
        time: 1,
        stripMultiplier: 0.5,
        fillMultiplier: 0.5,
      },
    ]);
  });

  it('returns an empty program when no valid segments exist', () => {
    const timeline: LedTimeline = {
      roomId: 'empty',
      segments: [
        {
          durationSeconds: -4,
          stripMultiplier: 1,
        },
      ],
    };

    const program = createLedProgramFromTimeline(timeline);
    expect(program.roomId).toBe('empty');
    expect(program.cycleSeconds).toBe(1);
    expect(program.keyframes).toEqual([]);
  });
});

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
