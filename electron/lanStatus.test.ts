import { describe, expect, it } from 'vitest';
import type { RankedInterface } from '../src/net/interfaces';
import { buildLanStatus } from './lanStatus';

const wifi: RankedInterface = { name: 'Wi-Fi', address: '192.168.1.20', virtual: false };
const ethernet: RankedInterface = { name: 'Ethernet', address: '10.0.0.4', virtual: false };
const wsl: RankedInterface = { name: 'vEthernet (WSL)', address: '172.25.0.1', virtual: true };

const base = {
  interfaces: [wifi, ethernet, wsl],
  savedInterface: null,
  port: 47470,
  categoryFor: (name: string) => (name === 'Wi-Fi' ? ('public' as const) : ('private' as const)),
  devices: [],
};

describe('buildLanStatus', () => {
  it('usa la primera interfaz física y arma la dirección con el puerto', () => {
    const status = buildLanStatus(base);
    expect(status.url).toBe('http://192.168.1.20:47470/');
    expect(status.interfaces.filter((entry) => entry.selected).map((e) => e.name)).toEqual([
      'Wi-Fi',
    ]);
    expect(status.networkCategory).toBe('public');
    expect(status.problem).toBeUndefined();
  });

  it('respeta la interfaz guardada mientras exista', () => {
    expect(buildLanStatus({ ...base, savedInterface: 'Ethernet' }).url).toBe(
      'http://10.0.0.4:47470/',
    );
    expect(buildLanStatus({ ...base, savedInterface: 'vEthernet (WSL)' }).url).toBe(
      'http://172.25.0.1:47470/',
    );
    expect(buildLanStatus({ ...base, savedInterface: 'Ya no existe' }).url).toBe(
      'http://192.168.1.20:47470/',
    );
  });

  it('sin puerto libre queda noPort y sin dirección', () => {
    const status = buildLanStatus({ ...base, port: null });
    expect(status.problem).toBe('noPort');
    expect(status.url).toBeNull();
  });

  it('sin interfaces privadas (o solo virtuales) queda noInterface', () => {
    expect(buildLanStatus({ ...base, interfaces: [] }).problem).toBe('noInterface');
    const onlyVirtual = buildLanStatus({ ...base, interfaces: [wsl] });
    expect(onlyVirtual.problem).toBe('noInterface');
    expect(onlyVirtual.url).toBeNull();
    expect(onlyVirtual.interfaces).toHaveLength(1);
    expect(onlyVirtual.networkCategory).toBe('unknown');
  });
});
