import type { Page } from '@playwright/test';
import type { Board } from '../../src/domain/board';
import { makeCompleteBoard } from '../../tests/fixtures/board';

/** PNG 1x1 para pruebas con imágenes. */
export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export interface SeedImage {
  id: string;
  base64: string;
  type: string;
}

/**
 * Guarda tableros (e imágenes) directo en IndexedDB, con el mismo esquema que src/storage/db.ts.
 * La página debe estar en el origen de la app (p. ej. después de `page.goto('./')`).
 */
export async function seedBoards(page: Page, boards: Board[], images: SeedImage[] = []) {
  await page.evaluate(
    async ({ boards, images }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('jeopardy', 1);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains('boards'))
            db.createObjectStore('boards', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
          if (!db.objectStoreNames.contains('sessions')) {
            db.createObjectStore('sessions', { keyPath: 'id' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(['boards', 'images'], 'readwrite');
      for (const board of boards) tx.objectStore('boards').put(board);
      for (const image of images) {
        const bytes = Uint8Array.from(atob(image.base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: image.type });
        tx.objectStore('images').put({ id: image.id, blob, type: image.type }, image.id);
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { boards, images },
  );
}

/** Siembra un tablero completo y listo para jugar; devuelve el tablero sembrado. */
export async function seedCompleteBoard(page: Page, overrides: Partial<Board> = {}) {
  const board = makeCompleteBoard({ id: 'e2e-board', ...overrides });
  await seedBoards(page, [board]);
  return board;
}
