import type { ConnectedDevice } from '../src/net/hub';
import type { RankedInterface } from '../src/net/interfaces';
import type { LanStatus, NetworkCategory } from '../src/platform/desktop';

export interface LanStatusInput {
  /** Interfaces ya ordenadas con `rankInterfaces`. */
  interfaces: readonly RankedInterface[];
  /** Interfaz que eligió el operador (guardada entre aperturas), si la hay. */
  savedInterface: string | null;
  port: number | null;
  categoryFor(interfaceName: string): NetworkCategory;
  devices: readonly ConnectedDevice[];
}

/**
 * Interfaz en uso: la guardada mientras exista; si no, la primera física o privada. Las
 * virtuales (WSL, VPN) nunca se eligen solas.
 */
export function selectInterface(
  interfaces: readonly RankedInterface[],
  savedInterface: string | null,
): RankedInterface | null {
  const saved = interfaces.find((entry) => entry.name === savedInterface);
  return saved ?? interfaces.find((entry) => !entry.virtual) ?? null;
}

export function buildLanStatus(input: LanStatusInput): LanStatus {
  const selected = selectInterface(input.interfaces, input.savedInterface);
  const problem = input.port === null ? 'noPort' : selected ? undefined : 'noInterface';
  return {
    url: selected && input.port !== null ? `http://${selected.address}:${input.port}/` : null,
    port: input.port,
    interfaces: input.interfaces.map((entry) => ({
      name: entry.name,
      address: entry.address,
      selected: entry === selected,
    })),
    networkCategory: selected ? input.categoryFor(selected.name) : 'unknown',
    devices: [...input.devices],
    ...(problem ? { problem } : {}),
  };
}
