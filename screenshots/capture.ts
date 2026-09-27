import path from 'node:path';
import type { Page } from '@playwright/test';

export const CAPTURES_DIR = path.join(import.meta.dirname, '..', 'docs', 'capturas');

/** Guarda una captura de la ventana en `docs/capturas/<nombre>.png`, sin animaciones ni cursor. */
export async function capture(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: path.join(CAPTURES_DIR, `${name}.png`),
    animations: 'disabled',
    caret: 'hide',
  });
}
