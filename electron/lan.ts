import { readFile, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { app, BrowserWindow, ipcMain } from 'electron';
import type { ConnectedDevice } from '../src/net/hub';
import { rankInterfaces, type RankedInterface } from '../src/net/interfaces';
import type { DesktopIpcChannel, LanStatus } from '../src/platform/desktop';
import { preferredLanPort } from './config';
import { buildLanStatus } from './lanStatus';
import { portCandidates, startLanServer, type LanServer } from './lanServer';
import { categoryFor, readNetworkProfiles, type NetworkProfiles } from './networkProfile';

const statusChannel: DesktopIpcChannel = 'jeopardy:lan-status-changed';

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

  const server = await startLanServer({
    distDir: options.distDir,
    base: options.base,
    ports: portCandidates(preferredLanPort()),
    onDevices(next) {
      devices = next;
      broadcast();
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

  /** Vuelve a mirar las interfaces y la categoría de red (al abrir el panel o cambiar de red). */
  async function refresh(): Promise<void> {
    interfaces = rankInterfaces(networkInterfaces());
    profiles = await readNetworkProfiles();
  }

  ipcMain.handle('jeopardy:lan-status' satisfies DesktopIpcChannel, async () => {
    await refresh();
    return status();
  });
  ipcMain.handle(
    'jeopardy:lan-select-interface' satisfies DesktopIpcChannel,
    async (_event, name: unknown) => {
      if (typeof name !== 'string') throw new Error('Interfaz inválida');
      savedInterface = name;
      await writeFile(settingsFile(), JSON.stringify({ interface: name }), 'utf8');
      await refresh();
      broadcast();
    },
  );

  return server;
}
