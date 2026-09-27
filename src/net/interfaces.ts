/** Entrada de `os.networkInterfaces()`, reducida a lo que se usa (sin depender de Node). */
export interface NetworkInterfaceInfo {
  address: string;
  family: string | number;
  internal: boolean;
}

export type NetworkInterfaces = Record<string, NetworkInterfaceInfo[] | undefined>;

export interface RankedInterface {
  name: string;
  address: string;
  /** Adaptador virtual conocido (WSL, VPN, máquinas virtuales): solo se elige a mano. */
  virtual: boolean;
}

const PHYSICAL_NAME = /^(wi-?fi|wlan|wireless|ethernet|eth\d*|en\d*|wl\w*)/i;
const VIRTUAL_NAME =
  /vethernet|wsl|hyper-v|virtualbox|vbox|vmware|vmnet|tailscale|zerotier|hamachi|docker|loopback|vpn|tap|tun/i;

function parseIPv4(address: string): number[] | null {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map(Number);
  return octets.every((n, i) => Number.isInteger(n) && n >= 0 && n <= 255 && parts[i] !== '')
    ? octets
    : null;
}

export function isPrivateIPv4(address: string): boolean {
  const octets = parseIPv4(address);
  if (!octets) return false;
  const [a, b] = octets as [number, number, number, number];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function isIPv4(info: NetworkInterfaceInfo): boolean {
  return info.family === 'IPv4' || info.family === 4;
}

/**
 * Ordena las interfaces donde los celulares pueden conectarse: primero las IPv4 privadas de
 * adaptadores físicos (Wi-Fi, Ethernet), después otras privadas y al final las virtuales
 * conocidas. Se descartan loopback, enlace local (169.254/16), IPv6 y las IP públicas.
 */
export function rankInterfaces(interfaces: NetworkInterfaces): RankedInterface[] {
  const ranked: { entry: RankedInterface; rank: number; order: number }[] = [];
  let order = 0;
  for (const [name, infos] of Object.entries(interfaces)) {
    for (const info of infos ?? []) {
      if (info.internal || !isIPv4(info) || !isPrivateIPv4(info.address)) continue;
      const virtual = VIRTUAL_NAME.test(name);
      const rank = virtual ? 2 : PHYSICAL_NAME.test(name) ? 0 : 1;
      ranked.push({ entry: { name, address: info.address, virtual }, rank, order: order++ });
    }
  }
  return ranked.sort((a, b) => a.rank - b.rank || a.order - b.order).map(({ entry }) => entry);
}
