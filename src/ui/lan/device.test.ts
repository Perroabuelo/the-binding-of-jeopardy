import { describe, expect, it } from 'vitest';
import { DEVICE_ID_KEY, deviceLabel, getDeviceId, lanSocketUrl, randomDeviceId } from './device';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('getDeviceId', () => {
  it('guarda el id y lo reutiliza (una recarga es el mismo dispositivo)', () => {
    const storage = memoryStorage();
    const id = getDeviceId(() => storage);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(id);
    expect(getDeviceId(() => storage)).toBe(id);
  });

  it('reemplaza un id guardado inválido', () => {
    const storage = memoryStorage();
    storage.setItem(DEVICE_ID_KEY, '<script>');
    const id = getDeviceId(() => storage);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('sin localStorage usa un id en memoria', () => {
    const throwing = () => {
      throw new Error('bloqueado');
    };
    expect(getDeviceId(throwing)).toMatch(/^[0-9a-f]{32}$/);
    const readOnly = memoryStorage();
    readOnly.setItem = () => {
      throw new Error('lleno');
    };
    expect(getDeviceId(() => readOnly)).toMatch(/^[0-9a-f]{32}$/);
  });

  it('genera ids distintos', () => {
    expect(randomDeviceId()).not.toBe(randomDeviceId());
  });
});

describe('deviceLabel', () => {
  it('reconoce el tipo de celular por el user agent', () => {
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('Android');
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('iPhone');
    expect(deviceLabel('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe('iPad');
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('Celular');
  });
});

describe('lanSocketUrl', () => {
  it('usa ws: en http y wss: en https, siempre en /ws', () => {
    expect(lanSocketUrl('http://192.168.1.20:47470/the-binding-of-jeopardy/#/unirse')).toBe(
      'ws://192.168.1.20:47470/ws',
    );
    expect(lanSocketUrl('https://perroabuelo.github.io/the-binding-of-jeopardy/#/unirse')).toBe(
      'wss://perroabuelo.github.io/ws',
    );
  });
});
