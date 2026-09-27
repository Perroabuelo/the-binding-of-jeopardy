import { describe, expect, it } from 'vitest';
import { isPrivateIPv4, rankInterfaces, type NetworkInterfaces } from './interfaces';

const ipv4 = (address: string, internal = false) => ({ address, family: 'IPv4', internal });

describe('rankInterfaces', () => {
  it('pone el Wi-Fi 192.168.x antes que vEthernet (WSL)', () => {
    const interfaces: NetworkInterfaces = {
      'vEthernet (WSL)': [ipv4('172.25.0.1')],
      'Wi-Fi': [ipv4('192.168.1.20')],
    };
    expect(rankInterfaces(interfaces)).toEqual([
      { name: 'Wi-Fi', address: '192.168.1.20', virtual: false },
      { name: 'vEthernet (WSL)', address: '172.25.0.1', virtual: true },
    ]);
  });

  it('ordena físicas, luego otras privadas y al final las virtuales', () => {
    const interfaces: NetworkInterfaces = {
      Tailscale: [ipv4('10.0.0.5')],
      'Conexión de área local* 2': [ipv4('10.1.1.1')],
      Ethernet: [ipv4('10.0.1.30')],
      'VirtualBox Host-Only Network': [ipv4('192.168.56.1')],
    };
    expect(rankInterfaces(interfaces).map((entry) => entry.name)).toEqual([
      'Ethernet',
      'Conexión de área local* 2',
      'Tailscale',
      'VirtualBox Host-Only Network',
    ]);
  });

  it('descarta loopback, 169.254 e IPv6', () => {
    const interfaces: NetworkInterfaces = {
      'Loopback Pseudo-Interface 1': [ipv4('127.0.0.1', true)],
      Ethernet: [ipv4('169.254.10.2'), { address: 'fe80::1', family: 'IPv6', internal: false }],
      'Wi-Fi': [
        { address: 'fd00::20', family: 6, internal: false },
        { address: '192.168.0.9', family: 4, internal: false },
      ],
    };
    expect(rankInterfaces(interfaces)).toEqual([
      { name: 'Wi-Fi', address: '192.168.0.9', virtual: false },
    ]);
  });

  it('sin interfaces privadas, el resultado está vacío', () => {
    expect(rankInterfaces({})).toEqual([]);
    expect(rankInterfaces({ Ethernet: [ipv4('8.8.8.8')], lo: [ipv4('127.0.0.1', true)] })).toEqual(
      [],
    );
  });
});

describe('isPrivateIPv4', () => {
  it('reconoce los rangos privados', () => {
    expect(isPrivateIPv4('10.2.3.4')).toBe(true);
    expect(isPrivateIPv4('172.16.0.1')).toBe(true);
    expect(isPrivateIPv4('172.31.255.255')).toBe(true);
    expect(isPrivateIPv4('192.168.1.1')).toBe(true);
    expect(isPrivateIPv4('172.32.0.1')).toBe(false);
    expect(isPrivateIPv4('192.169.0.1')).toBe(false);
    expect(isPrivateIPv4('256.1.1.1')).toBe(false);
    expect(isPrivateIPv4('10.1.1')).toBe(false);
  });
});
