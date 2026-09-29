import { readFile, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, type WebContents } from 'electron';
import type { DeviceGameView } from '../src/domain/deviceProjection';
import type { ConnectedDevice } from '../src/net/hub';
import { rankInterfaces, type RankedInterface } from '../src/net/interfaces';
import type { DesktopIpcChannel, LanStatus } from '../src/platform/desktop';
import { preferredLanPort } from './config';
import { buildLanStatus } from './lanStatus';
import { portCandidates, startLanServer, type LanServer } from './lanServer';
import {
  categoryFor,
  createProfileRefresher,
  readNetworkProfiles,
  type NetworkProfiles,
} from './networkProfile';

const statusChannel: DesktopIpcChannel = 'jeopardy:lan-status-changed';
const deviceEventChannel: DesktopIpcChannel = 'jeopardy:lan-device-event';

function settingsFile(): string {
  return path.join(app.getPath('userData'), 'lan.json');
}

async function readSavedInterface(): Promise<string | null> {
  try {
    const data: unknown = JSON.parse(await readFile(settingsFile(), 'utf8'));
    const name = (data as { interface?: unknown } | null)?.interface;
    return typeof name === 'string' ? name : null;
  } catch {
    return null;
  }
}

/** Conexión de dispositivos: servidor de la red local, estado y su IPC con la ventana. */
export async function startLan(options: { distDir: string; base: string }): Promise<LanServer> {
  let interfaces: RankedInterface[] = rankInterfaces(networkInterfaces());
  let savedInterface = await readSavedInterface();
  let profiles: NetworkProfiles = new Map();
  let devices: ConnectedDevice[] = [];
  /** Ventana que publica el juego (el operador): recibe los eventos de los celulares. */
  let publisher: WebContents | null = null;

  const server = await startLanServer({
    distDir: options.distDir,
    base: options.base,
    ports: portCandidates(preferredLanPort()),
    onDevices(next) {
      devices = next;
      broadcast();
    },
    onDeviceEvent(event) {
      if (publisher && !publisher.isDestroyed()) publisher.send(deviceEventChannel, event);
    },
  });

  function status(): LanStatus {
    return buildLanStatus({
      interfaces,
      savedInterface,
      port: server.port,
      categoryFor: (name) => categoryFor(profiles, name),
      devices,
    });
  }

  function broadcast(): void {
    const current = status();
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) window.webContents.send(statusChannel, current);
    }
  }

  // Leer la categoría de red tarda (PowerShell, hasta 3 s): llega después, con un aviso de estado.
  const refreshProfiles = createProfileRefresher(readNetworkProfiles, (next) => {
    profiles = next;
    broadcast();
  });

  /**
   * Vuelve a mirar las interfaces (al abrir el panel o la TV, o al cambiar de red) y pide la
   * categoría de red sin esperarla: la dirección de conexión no depende de ella.
   */
  function refresh(): void {
    interfaces = rankInterfaces(networkInterfaces());
    void refreshProfiles();
  }

  ipcMain.handle('jeopardy:lan-status' satisfies DesktopIpcChannel, () => {
    refresh();
    return status();
  });
  ipcMain.handle(
    'jeopardy:lan-select-interface' satisfies DesktopIpcChannel,
    async (_event, name: unknown) => {
      if (typeof name !== 'string') throw new Error('Interfaz inválida');
      savedInterface = name;
      await writeFile(settingsFile(), JSON.stringify({ interface: name }), 'utf8');
      refresh();
      broadcast();
    },
  );

  ipcMain.on('jeopardy:lan-publish-game' satisfies DesktopIpcChannel, (event, view: unknown) => {
    if (view !== null && (typeof view !== 'object' || Array.isArray(view))) return;
    publisher = event.sender;
    server.publishGame(view as DeviceGameView | null);
  });

  return server;
}
