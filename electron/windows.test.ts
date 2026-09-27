import { describe, expect, it } from 'vitest';
import { pickTvDisplay, type DisplayInfo } from './windows';

const primary: DisplayInfo = { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
const tv: DisplayInfo = { id: 2, bounds: { x: 1920, y: 0, width: 3840, height: 2160 } };

describe('pickTvDisplay', () => {
  it('con un solo monitor no elige ninguno', () => {
    expect(pickTvDisplay([primary], primary.id)).toBeNull();
  });

  it('con dos monitores elige el que no tiene al operador', () => {
    expect(pickTvDisplay([primary, tv], primary.id)).toBe(tv);
  });

  it('con el operador en el monitor secundario elige el principal', () => {
    expect(pickTvDisplay([primary, tv], tv.id)).toBe(primary);
  });

  it('con tres monitores elige el primero distinto del operador', () => {
    const third: DisplayInfo = { id: 3, bounds: { x: -1920, y: 0, width: 1920, height: 1080 } };
    expect(pickTvDisplay([tv, primary, third], tv.id)).toBe(primary);
  });
});
