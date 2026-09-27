import { execFile } from 'node:child_process';
import type { NetworkCategory } from '../src/platform/desktop';

export const NETWORK_PROFILE_TIMEOUT_MS = 3000;

/** Categoría de red por alias de interfaz, tal como la informa Windows. */
export type NetworkProfiles = Map<string, NetworkCategory>;

// Windows PowerShell 5.1 serializa el enum como número; se fuerza texto, pero se aceptan ambos.
const NUMERIC_CATEGORIES: Record<number, NetworkCategory> = {
  0: 'public',
  1: 'private',
  2: 'domain',
};

function toCategory(value: unknown): NetworkCategory {
  if (typeof value === 'number') return NUMERIC_CATEGORIES[value] ?? 'unknown';
  if (typeof value !== 'string') return 'unknown';
  const text = value.trim().toLowerCase();
  if (text === 'public') return 'public';
  if (text === 'private') return 'private';
  if (text === 'domainauthenticated' || text === 'domain') return 'domain';
  return 'unknown';
}

/**
 * Interpreta la salida de `Get-NetConnectionProfile | ConvertTo-Json`: un objeto (una red) o
 * un arreglo. Ante salida vacía o inválida devuelve un mapa vacío (todo queda `unknown`).
 */
export function parseNetworkProfiles(output: string): NetworkProfiles {
  const profiles: NetworkProfiles = new Map();
  if (output.trim() === '') return profiles;
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return profiles;
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const { InterfaceAlias: alias, NetworkCategory: category } = entry as Record<string, unknown>;
    if (typeof alias === 'string' && alias !== '') profiles.set(alias, toCategory(category));
  }
  return profiles;
}

/** Categoría de la red de una interfaz; `unknown` si Windows no la informó. */
export function categoryFor(profiles: NetworkProfiles, interfaceName: string): NetworkCategory {
  return profiles.get(interfaceName) ?? 'unknown';
}

const PROFILE_COMMAND =
  'Get-NetConnectionProfile | Select-Object InterfaceAlias,@{n="NetworkCategory";e={[string]$_.NetworkCategory}} | ConvertTo-Json -Compress';

/** Consulta a Windows las categorías de red. Si falla o tarda más de 3 s, devuelve un mapa vacío. */
export function readNetworkProfiles(): Promise<NetworkProfiles> {
  if (process.platform !== 'win32') return Promise.resolve(new Map());
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', PROFILE_COMMAND],
      { timeout: NETWORK_PROFILE_TIMEOUT_MS, windowsHide: true },
      (error, stdout) => resolve(error ? new Map() : parseNetworkProfiles(String(stdout))),
    );
  });
}
