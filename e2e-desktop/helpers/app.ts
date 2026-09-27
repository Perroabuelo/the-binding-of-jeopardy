import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { _electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

export interface DesktopDirs {
  userData: string;
  backupDir: string;
}

export interface DesktopOptions {
  lanPort?: number;
}

/** Carpetas temporales propias de la prueba, para no tocar los datos reales del usuario. */
export function desktopDirs(): DesktopDirs {
  const root = test.info().outputPath('desktop');
  const dirs = { userData: path.join(root, 'userData'), backupDir: path.join(root, 'Respaldos') };
  mkdirSync(dirs.userData, { recursive: true });
  return dirs;
}

export function desktopEnv(
  dirs: DesktopDirs,
  options: DesktopOptions = {},
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ELECTRON_RUN_AS_NODE') env[key] = value;
  }
  env.JEOPARDY_USER_DATA = dirs.userData;
  env.JEOPARDY_BACKUP_DIR = dirs.backupDir;
  env.JEOPARDY_LAN_PORT = String(options.lanPort ?? 47570);
  return env;
}

export async function launchDesktop(
  dirs: DesktopDirs,
  options: DesktopOptions = {},
): Promise<{ app: ElectronApplication; operator: Page }> {
  const app = await _electron.launch({ args: ['.'], env: desktopEnv(dirs, options) });
  const operator = await app.firstWindow();
  await expect(operator.getByRole('heading', { name: 'Tableros' })).toBeVisible();
  return { app, operator };
}

/** Ruta del ejecutable de Electron: fuera de Electron, el paquete `electron` la exporta. */
const electronPath = createRequire(import.meta.url)('electron') as unknown as string;

/** Abre otra instancia de la app (como un segundo doble clic) y espera a que termine. */
export function runSecondInstance(
  dirs: DesktopDirs,
  options: DesktopOptions = {},
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(electronPath, ['.'], { env: desktopEnv(dirs, options), stdio: 'ignore' });
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('La segunda instancia no terminó.'));
    }, 20_000);
    child.on('error', reject);
    child.on('exit', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });
}

/**
 * Service workers de la app. En el esquema app:// no están permitidos: la página no puede ni
 * consultarlos (`InvalidStateError`), así que se cuentan desde la sesión del proceso principal.
 */
export async function serviceWorkerCount(app: ElectronApplication, page: Page): Promise<number> {
  const fromPage = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 0;
    try {
      return (await navigator.serviceWorker.getRegistrations()).length;
    } catch {
      return 0;
    }
  });
  const running = await app.evaluate(
    ({ session }) => Object.keys(session.defaultSession.serviceWorkers.getAllRunning()).length,
  );
  return fromPage + running;
}
