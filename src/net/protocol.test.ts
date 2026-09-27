import { describe, expect, it } from 'vitest';
import { isDeviceClientMessage, isDeviceServerMessage, parseMessage } from './protocol';

describe('isDeviceClientMessage', () => {
  it('acepta join y pong válidos', () => {
    expect(isDeviceClientMessage({ type: 'join', deviceId: 'abc', label: 'Android' })).toBe(true);
    expect(isDeviceClientMessage({ type: 'pong' })).toBe(true);
  });

  it('rechaza tipos desconocidos y mensajes del servidor', () => {
    expect(isDeviceClientMessage({ type: 'buzz' })).toBe(false);
    expect(isDeviceClientMessage({ type: 'ping' })).toBe(false);
    expect(isDeviceClientMessage({ type: 'welcome', serverTime: 1 })).toBe(false);
  });

  it('rechaza mensajes mal formados', () => {
    for (const value of [
      null,
      undefined,
      'join',
      42,
      [],
      {},
      { type: 'join' },
      { type: 'join', deviceId: '', label: 'Android' },
      { type: 'join', deviceId: '   ', label: 'Android' },
      { type: 'join', deviceId: 'abc', label: 7 },
      { type: 'join', deviceId: 'x'.repeat(65), label: 'Android' },
      { type: 'join', deviceId: 'abc', label: 'x'.repeat(41) },
    ]) {
      expect(isDeviceClientMessage(value)).toBe(false);
    }
  });
});

describe('isDeviceServerMessage', () => {
  it('acepta welcome y ping válidos', () => {
    expect(isDeviceServerMessage({ type: 'welcome', serverTime: 1_700_000_000_000 })).toBe(true);
    expect(isDeviceServerMessage({ type: 'ping' })).toBe(true);
  });

  it('rechaza tipos desconocidos y mensajes del celular', () => {
    expect(isDeviceServerMessage({ type: 'state' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'pong' })).toBe(false);
  });

  it('rechaza mensajes mal formados', () => {
    expect(isDeviceServerMessage(null)).toBe(false);
    expect(isDeviceServerMessage({ type: 'welcome' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'welcome', serverTime: '1' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'welcome', serverTime: Number.NaN })).toBe(false);
  });
});

describe('parseMessage', () => {
  it('interpreta JSON válido y descarta el resto', () => {
    expect(parseMessage('{"type":"pong"}', isDeviceClientMessage)).toEqual({ type: 'pong' });
    expect(parseMessage('{"type":"otro"}', isDeviceClientMessage)).toBeNull();
    expect(parseMessage('no es json', isDeviceClientMessage)).toBeNull();
  });
});
