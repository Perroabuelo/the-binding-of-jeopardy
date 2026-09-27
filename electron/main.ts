import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import { SITE_BASE } from '../site.config';
import type { DesktopIpcChannel } from '../src/platform/desktop';
import { applyUserDataOverride } from './config';
import { mimeType, resolveStaticPath } from './static';

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

function createOperatorWindow(): BrowserWindow {
  const window = createAppWindow({ width: 1280, height: 800 });
  window.on('closed', () => {
    operatorWindow = null;
  });
  void window.loadURL(appUrl());
  return window;
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

  void app.whenReady().then(async () => {
    // Por si una versión anterior hubiera dejado un service worker registrado.
    await session.defaultSession.clearStorageData({ storages: ['serviceworkers'] });
    protocol.handle(APP_SCHEME, serveAppFile);
    operatorWindow = createOperatorWindow();
  });
}
