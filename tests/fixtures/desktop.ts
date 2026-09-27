import { vi } from 'vitest';
import type { DesktopApi, DeviceEvent, LanStatus } from '../../src/platform/desktop';

export interface FakeDesktop {
  api: DesktopApi;
  /** Simula un aviso del proceso principal con un estado nuevo de la red local. */
  emitStatus(status: LanStatus): void;
  /** Simula un toque o un envío del Final de un celular. */
  emitDeviceEvent(event: DeviceEvent): void;
}

export function makeLanStatus(overrides: Partial<LanStatus> = {}): LanStatus {
  return {
    url: 'http://192.168.1.20:47470/',
    port: 47470,
    interfaces: [{ name: 'Wi-Fi', address: '192.168.1.20', selected: true }],
    networkCategory: 'private',
    devices: [],
    ...overrides,
  };
}

/** `DesktopApi` falso con espías, para probar la UI como si corriera en escritorio. */
export function makeFakeDesktop(status: LanStatus = makeLanStatus()): FakeDesktop {
  const listeners = new Set<(status: LanStatus) => void>();
  const deviceListeners = new Set<(event: DeviceEvent) => void>();
  let current = status;
  const api: DesktopApi = {
    version: '1.0.0',
    openTv: vi.fn(() => Promise.resolve()),
    lan: {
      getStatus: vi.fn(() => Promise.resolve(current)),
      onStatus: vi.fn((listener: (status: LanStatus) => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      }),
      selectInterface: vi.fn(() => Promise.resolve()),
      publishGame: vi.fn(),
      onDeviceEvent: vi.fn((listener: (event: DeviceEvent) => void) => {
        deviceListeners.add(listener);
        return () => {
          deviceListeners.delete(listener);
        };
      }),
    },
    backup: {
      writeBoard: vi.fn(() => Promise.resolve()),
      trashBoard: vi.fn(() => Promise.resolve()),
      openFolder: vi.fn(() => Promise.resolve()),
    },
  };
  return {
    api,
    emitStatus(next) {
      current = next;
      for (const listener of [...listeners]) listener(next);
    },
    emitDeviceEvent(event) {
      for (const listener of [...deviceListeners]) listener(event);
    },
  };
}

/** Instala el `DesktopApi` en `window`, como el preload de Electron. */
export function installDesktop(fake: FakeDesktop = makeFakeDesktop()): FakeDesktop {
  window.jeopardyDesktop = fake.api;
  return fake;
}

export function uninstallDesktop(): void {
  delete window.jeopardyDesktop;
}
