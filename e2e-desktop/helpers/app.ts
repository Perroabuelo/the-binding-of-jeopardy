import { mkdirSync } from 'node:fs';
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
