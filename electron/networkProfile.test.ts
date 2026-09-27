import { describe, expect, it } from 'vitest';
import { categoryFor, parseNetworkProfiles } from './networkProfile';

describe('parseNetworkProfiles', () => {
  it('acepta un objeto (una sola red)', () => {
    const profiles = parseNetworkProfiles('{"InterfaceAlias":"Wi-Fi","NetworkCategory":"Public"}');
    expect(categoryFor(profiles, 'Wi-Fi')).toBe('public');
  });

  it('acepta un arreglo y asocia cada entrada por alias', () => {
    const profiles = parseNetworkProfiles(
      JSON.stringify([
        { InterfaceAlias: 'Wi-Fi', NetworkCategory: 'Private' },
        { InterfaceAlias: 'Ethernet', NetworkCategory: 'DomainAuthenticated' },
        { InterfaceAlias: 'vEthernet (WSL)', NetworkCategory: 0 },
      ]),
    );
    expect(categoryFor(profiles, 'Wi-Fi')).toBe('private');
    expect(categoryFor(profiles, 'Ethernet')).toBe('domain');
    expect(categoryFor(profiles, 'vEthernet (WSL)')).toBe('public');
    expect(categoryFor(profiles, 'Tailscale')).toBe('unknown');
  });

  it('ante JSON inválido devuelve unknown', () => {
    expect(categoryFor(parseNetworkProfiles('Get-NetConnectionProfile : error'), 'Wi-Fi')).toBe(
      'unknown',
    );
  });

  it('ante salida vacía devuelve unknown', () => {
    expect(categoryFor(parseNetworkProfiles(''), 'Wi-Fi')).toBe('unknown');
    expect(categoryFor(parseNetworkProfiles('  \r\n'), 'Wi-Fi')).toBe('unknown');
  });

  it('una categoría desconocida queda unknown', () => {
    const profiles = parseNetworkProfiles('{"InterfaceAlias":"Wi-Fi","NetworkCategory":"Rara"}');
    expect(categoryFor(profiles, 'Wi-Fi')).toBe('unknown');
  });
});
