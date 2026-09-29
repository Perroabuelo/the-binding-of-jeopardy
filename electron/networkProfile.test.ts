import { describe, expect, it, vi } from 'vitest';
import {
  categoryFor,
  createProfileRefresher,
  parseNetworkProfiles,
  type NetworkProfiles,
} from './networkProfile';

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

describe('createProfileRefresher', () => {
  /** Lectura lenta que se resuelve a mano, como PowerShell tardando en responder. */
  function slowRead() {
    const pending: ((profiles: NetworkProfiles) => void)[] = [];
    const read = vi.fn(() => new Promise<NetworkProfiles>((resolve) => pending.push(resolve)));
    return { read, finish: (profiles: NetworkProfiles) => pending.shift()!(profiles) };
  }

  it('no bloquea a quien lo pide y avisa cuando llegan las categorías', async () => {
    const { read, finish } = slowRead();
    const onProfiles = vi.fn();
    const refresh = createProfileRefresher(read, onProfiles);
    const done = refresh();
    expect(read).toHaveBeenCalledOnce();
    expect(onProfiles).not.toHaveBeenCalled();
    const profiles: NetworkProfiles = new Map([['Wi-Fi', 'public']]);
    finish(profiles);
    await done;
    expect(onProfiles).toHaveBeenCalledWith(profiles);
  });

  it('las consultas pedidas mientras otra está en curso la comparten', async () => {
    const { read, finish } = slowRead();
    const refresh = createProfileRefresher(read, () => {});
    const first = refresh();
    expect(refresh()).toBe(first);
    expect(read).toHaveBeenCalledOnce();
    finish(new Map());
    await first;
    // Terminada la anterior, una nueva consulta vuelve a leer.
    void refresh();
    expect(read).toHaveBeenCalledTimes(2);
  });
});
