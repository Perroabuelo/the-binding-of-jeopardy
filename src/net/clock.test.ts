import { describe, expect, it } from 'vitest';
import {
  addOffsetSample,
  averageOffset,
  OFFSET_SAMPLES,
  offsetSample,
  remainingWithOffset,
} from './clock';

describe('remainingWithOffset', () => {
  it('sin desfase es la diferencia con la hora local', () => {
    expect(remainingWithOffset(10_000, 7_000, 0)).toBe(3_000);
  });

  it('con el servidor adelantado queda menos tiempo', () => {
    // El servidor marca 8000 cuando el celular marca 7000
    expect(remainingWithOffset(10_000, 7_000, 1_000)).toBe(2_000);
  });

  it('con el servidor atrasado queda más tiempo', () => {
    expect(remainingWithOffset(10_000, 7_000, -1_500)).toBe(4_500);
  });

  it('nunca es menor que 0', () => {
    expect(remainingWithOffset(10_000, 12_000, 0)).toBe(0);
    expect(remainingWithOffset(10_000, 9_000, 5_000)).toBe(0);
  });
});

describe('desfase', () => {
  it('una muestra es la hora del servidor menos la local', () => {
    expect(offsetSample(8_000, 7_000)).toBe(1_000);
    expect(offsetSample(6_000, 7_000)).toBe(-1_000);
  });

  it('promedia las últimas muestras', () => {
    expect(averageOffset([])).toBe(0);
    let samples: number[] = [];
    for (let i = 1; i <= OFFSET_SAMPLES + 2; i++) samples = addOffsetSample(samples, i * 100);
    expect(samples).toHaveLength(OFFSET_SAMPLES);
    expect(samples[0]).toBe(300);
    expect(averageOffset(samples)).toBe(500);
  });
});
