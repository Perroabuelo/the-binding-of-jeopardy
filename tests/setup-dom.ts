import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach } from 'vitest';
import { resetDbForTests } from '../src/storage/db';

beforeEach(async () => {
  // Base de datos limpia en cada test.
  await resetDbForTests();
  globalThis.indexedDB = new IDBFactory();
  window.location.hash = '';
});

afterEach(() => {
  cleanup();
});
