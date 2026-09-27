// Preload con sandbox: solo puede usar `electron`, así que no importa nada más en tiempo de
// ejecución. Los tipos vienen de src/platform/desktop.ts.
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { DesktopApi, DesktopIpcChannel, LanStatus } from '../src/platform/desktop';

function invoke<T = void>(channel: DesktopIpcChannel, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

const statusChannel: DesktopIpcChannel = 'jeopardy:lan-status-changed';

const api: DesktopApi = {
  version: ipcRenderer.sendSync('jeopardy:version' satisfies DesktopIpcChannel) as string,
  openTv: (sessionId) => invoke('jeopardy:open-tv', sessionId),
  lan: {
    getStatus: () => invoke<LanStatus>('jeopardy:lan-status'),
    onStatus(listener) {
      const handler = (_event: IpcRendererEvent, status: LanStatus) => listener(status);
      ipcRenderer.on(statusChannel, handler);
      return () => {
        ipcRenderer.removeListener(statusChannel, handler);
      };
    },
    selectInterface: (name) => invoke('jeopardy:lan-select-interface', name),
  },
  backup: {
    writeBoard: (file) => invoke('jeopardy:backup-write', file),
    trashBoard: (boardId) => invoke('jeopardy:backup-trash', boardId),
    openFolder: () => invoke('jeopardy:backup-open-folder'),
  },
};

// Debe coincidir con DESKTOP_API_KEY.
contextBridge.exposeInMainWorld('jeopardyDesktop', api);
