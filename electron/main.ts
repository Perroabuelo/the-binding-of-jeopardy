import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { app, BrowserWindow, ipcMain, protocol, screen, session, shell } from 'electron';
import { SITE_BASE } from '../site.config';
import type { BackupFile, DesktopIpcChannel } from '../src/platform/desktop';
import { createBackupStore } from './backup';
import { applyUserDataOverride, backupDir } from './config';
import { startLan } from './lan';
import type { LanServer } from './lanServer';
import { mimeType, resolveStaticPath } from './static';
import { pickTvDisplay, TV_WINDOW_SIZE } from './windows';

/** Origen propio y estable: no depende del puerto de la red local. */
const APP_SCHEME = 'app';
const APP_HOST = 'jeopardy';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

applyUserDataOverride();

const distDir = path.join(app.getAppPath(), 'dist');

// Sin allowServiceWorkers: el escritorio nunca registra un service worker.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true },
  },
]);

async function serveAppFile(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const file = url.host === APP_HOST ? resolveStaticPath(distDir, SITE_BASE, url.pathname) : null;
  if (!file) return new Response('No encontrado', { status: 404 });
  try {
    const body = await readFile(file);
    return new Response(body, { headers: { 'Content-Type': mimeType(file) } });
  } catch {
    return new Response('No encontrado', { status: 404 });
  }
}

function appUrl(hash = '#/'): string {
  return `${APP_ORIGIN}${SITE_BASE}index.html${hash}`;
}

/** Las ventanas solo muestran contenido de la app: nada de ventanas emergentes ni navegación. */
function lockDown(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_ORIGIN}/`)) event.preventDefault();
  });
}

function createAppWindow(options: Electron.BrowserWindowConstructorOptions = {}): BrowserWindow {
  const window = new BrowserWindow({
    title: 'The Binding of Jeopardy',
    autoHideMenuBar: true,
    ...options,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  lockDown(window);
  return window;
}

let operatorWindow: BrowserWindow | null = null;
let tvWindow: BrowserWindow | null = null;
let lanServer: LanServer | null = null;

function createOperatorWindow(): BrowserWindow {
  const window = createAppWindow({ width: 1280, height: 800 });
  window.on('closed', () => {
    operatorWindow = null;
    // Cerrar el operador cierra la TV; sin ventanas, la app termina.
    tvWindow?.close();
  });
  void window.loadURL(appUrl());
  return window;
}

function tvUrl(sessionId: string): string {
  return appUrl(`#/tv/${encodeURIComponent(sessionId)}`);
}

/** Abre la TV en otro monitor a pantalla completa, o como ventana normal si hay uno solo. */
function createTvWindow(sessionId: string): BrowserWindow {
  const operatorDisplay = operatorWindow
    ? screen.getDisplayMatching(operatorWindow.getBounds())
    : screen.getPrimaryDisplay();
  const display = pickTvDisplay(screen.getAllDisplays(), operatorDisplay.id);
  const window = display
    ? createAppWindow({ ...display.bounds, fullscreen: true })
    : createAppWindow({ ...TV_WINDOW_SIZE });

  window.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
  });
  window.on('closed', () => {
    tvWindow = null;
  });
  void window.loadURL(tvUrl(sessionId));
  return window;
}

/** Reutiliza la ventana de TV si ya existe: carga la sesión si cambió y la pasa al frente. */
function openTv(sessionId: string): void {
  if (!tvWindow) {
    tvWindow = createTvWindow(sessionId);
    return;
  }
  const url = tvUrl(sessionId);
  if (tvWindow.webContents.getURL() !== url) void tvWindow.loadURL(url);
  if (tvWindow.isMinimized()) tvWindow.restore();
  tvWindow.show();
  tvWindow.focus();
}

function focusOperator(): void {
  if (!operatorWindow) return;
  if (operatorWindow.isMinimized()) operatorWindow.restore();
  operatorWindow.show();
  operatorWindow.focus();
}

// Una sola instancia por usuario: una segunda apertura enfoca la ventana existente y termina.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', focusOperator);
  app.on('window-all-closed', () => app.quit());

  ipcMain.on('jeopardy:version' satisfies DesktopIpcChannel, (event) => {
    event.returnValue = app.getVersion();
  });
  ipcMain.handle('jeopardy:open-tv' satisfies DesktopIpcChannel, (_event, sessionId: unknown) => {
    if (typeof sessionId !== 'string' || sessionId === '') throw new Error('Sesión inválida');
    openTv(sessionId);
  });

  // Respaldo de tableros en disco. Si falla, la promesa se rechaza y la UI avisa.
  const backups = createBackupStore(backupDir());
  ipcMain.handle('jeopardy:backup-write' satisfies DesktopIpcChannel, (_event, file: BackupFile) =>
    backups.writeBoard(file),
  );
  ipcMain.handle('jeopardy:backup-trash' satisfies DesktopIpcChannel, (_event, boardId: string) =>
    backups.trashBoard(boardId),
  );
  ipcMain.handle('jeopardy:backup-open-folder' satisfies DesktopIpcChannel, async () => {
    await mkdir(backups.dir, { recursive: true });
    const error = await shell.openPath(backups.dir);
    if (error) throw new Error(error);
  });

  void app.whenReady().then(async () => {
    // Por si una versión anterior hubiera dejado un service worker registrado.
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers'] });
    protocol.handle(APP_SCHEME, serveAppFile);
    lanServer = await startLan({ distDir, base: SITE_BASE });
    operatorWindow = createOperatorWindow();
  });

  // El servidor de la red local se detiene al cerrar la app.
  app.on('will-quit', (event) => {
    if (!lanServer) return;
    const server = lanServer;
    lanServer = null;
    event.preventDefault();
    void server.close().finally(() => app.quit());
  });
}
