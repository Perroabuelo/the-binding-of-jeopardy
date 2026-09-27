import { describe, expect, it } from 'vitest';
import { isDeviceClientMessage, isDeviceServerMessage, parseMessage } from './protocol';

describe('isDeviceClientMessage', () => {
  it('acepta join y pong válidos', () => {
    expect(isDeviceClientMessage({ type: 'join', deviceId: 'abc', label: 'Android' })).toBe(true);
    expect(isDeviceClientMessage({ type: 'pong' })).toBe(true);
  });

  it('acepta los mensajes de los pulsadores', () => {
    for (const value of [
      { type: 'join', deviceId: 'abc', label: 'Android', teamId: 't0' },
      { type: 'chooseTeam', teamId: 't1' },
      { type: 'buzz' },
      { type: 'finalWager', amount: 0 },
      { type: 'finalWager', amount: 500 },
      { type: 'finalAnswer', text: '¿Qué es un pastel?' },
      { type: 'finalAnswer', text: 'x'.repeat(200) },
    ]) {
      expect(isDeviceClientMessage(value)).toBe(true);
    }
  });

  it('rechaza tipos desconocidos y mensajes del servidor', () => {
    expect(isDeviceClientMessage({ type: 'otro' })).toBe(false);
    expect(isDeviceClientMessage({ type: 'ping', serverTime: 1 })).toBe(false);
    expect(isDeviceClientMessage({ type: 'welcome', serverTime: 1 })).toBe(false);
    expect(isDeviceClientMessage({ type: 'game', view: null })).toBe(false);
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
      { type: 'join', deviceId: 'abc', label: 'Android', teamId: 3 },
      { type: 'join', deviceId: 'abc', label: 'Android', teamId: '' },
      { type: 'chooseTeam' },
      { type: 'chooseTeam', teamId: '' },
      { type: 'finalWager', amount: 2.5 },
      { type: 'finalWager', amount: -1 },
      { type: 'finalWager', amount: '500' },
      { type: 'finalWager', amount: Number.NaN },
      { type: 'finalAnswer', text: 'x'.repeat(201) },
      { type: 'finalAnswer', text: '   ' },
      { type: 'finalAnswer', text: 5 },
    ]) {
      expect(isDeviceClientMessage(value)).toBe(false);
    }
  });
});

describe('isDeviceServerMessage', () => {
  it('acepta welcome, ping y game válidos', () => {
    expect(isDeviceServerMessage({ type: 'welcome', serverTime: 1_700_000_000_000 })).toBe(true);
    expect(isDeviceServerMessage({ type: 'ping', serverTime: 1_700_000_000_000 })).toBe(true);
    expect(isDeviceServerMessage({ type: 'game', view: null })).toBe(true);
    expect(
      isDeviceServerMessage({
        type: 'game',
        view: { sessionId: 's1', teams: [], stage: 'board' },
      }),
    ).toBe(true);
  });

  it('rechaza tipos desconocidos y mensajes del celular', () => {
    expect(isDeviceServerMessage({ type: 'state' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'pong' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'buzz' })).toBe(false);
  });

  it('rechaza mensajes mal formados', () => {
    expect(isDeviceServerMessage(null)).toBe(false);
    expect(isDeviceServerMessage({ type: 'welcome' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'welcome', serverTime: '1' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'welcome', serverTime: Number.NaN })).toBe(false);
    expect(isDeviceServerMessage({ type: 'ping' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'game' })).toBe(false);
    expect(isDeviceServerMessage({ type: 'game', view: 'x' })).toBe(false);
  });
});

describe('parseMessage', () => {
  it('interpreta JSON válido y descarta el resto', () => {
    expect(parseMessage('{"type":"pong"}', isDeviceClientMessage)).toEqual({ type: 'pong' });
    expect(parseMessage('{"type":"otro"}', isDeviceClientMessage)).toBeNull();
    expect(parseMessage('no es json', isDeviceClientMessage)).toBeNull();
  });
});
