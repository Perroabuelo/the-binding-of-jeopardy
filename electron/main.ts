import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { app, BrowserWindow, protocol } from 'electron';
import { SITE_BASE } from '../site.config';
import { mimeType, resolveStaticPath } from './static';

/** Origen propio y estable: no depende del puerto de la red local. */
const APP_SCHEME = 'app';
const APP_HOST = 'jeopardy';
const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;

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

function createOperatorWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'The Binding of Jeopardy',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  lockDown(window);
  void window.loadURL(appUrl());
  return window;
}

app.on('window-all-closed', () => app.quit());

void app.whenReady().then(() => {
  protocol.handle(APP_SCHEME, serveAppFile);
  createOperatorWindow();
});
