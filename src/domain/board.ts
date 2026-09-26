export const CATEGORY_COUNT = 5;
export const CLUES_PER_CATEGORY = 5;
export const CLUE_VALUES = [100, 200, 300, 400, 500] as const;
export const BOARD_SCHEMA_VERSION = 1;

export type ClueValue = (typeof CLUE_VALUES)[number];

export interface Clue {
  value: ClueValue;
  question: string;
  answer: string;
  imageId?: string;
}

export interface Category {
  name: string;
  clues: Clue[];
}

export interface Board {
  id: string;
  schemaVersion: typeof BOARD_SCHEMA_VERSION;
  title: string;
  categories: Category[];
  /** Milisegundos desde epoch. */
  createdAt: number;
  /** Milisegundos desde epoch. */
  updatedAt: number;
}

/** Identifica una celda del tablero: `c{categoría}-r{fila}`, ambos desde 0. */
export type ClueKey = `c${number}-r${number}`;

export function clueKey(categoryIndex: number, rowIndex: number): ClueKey {
  return `c${categoryIndex}-r${rowIndex}`;
}

export function parseClueKey(key: string): { categoryIndex: number; rowIndex: number } | null {
  const match = /^c(\d+)-r(\d+)$/.exec(key);
  if (!match) return null;
  const categoryIndex = Number(match[1]);
  const rowIndex = Number(match[2]);
  if (categoryIndex >= CATEGORY_COUNT || rowIndex >= CLUES_PER_CATEGORY) return null;
  return { categoryIndex, rowIndex };
}

export function allClueKeys(): ClueKey[] {
  const keys: ClueKey[] = [];
  for (let c = 0; c < CATEGORY_COUNT; c++) {
    for (let r = 0; r < CLUES_PER_CATEGORY; r++) keys.push(clueKey(c, r));
  }
  return keys;
}

export function getClue(board: Board, key: string): Clue | null {
  const parsed = parseClueKey(key);
  if (!parsed) return null;
  return board.categories[parsed.categoryIndex]?.clues[parsed.rowIndex] ?? null;
}

/** Ids de las imágenes que usa la celda. */
export function clueImageIds(clue: Clue): string[] {
  return clue.imageId !== undefined ? [clue.imageId] : [];
}

/** Ids, sin repetir, de todas las imágenes que usan las celdas del tablero. */
export function boardImageIds(board: Board): Set<string> {
  const ids = new Set<string>();
  for (const category of board.categories) {
    for (const clue of category.clues) {
      for (const id of clueImageIds(clue)) ids.add(id);
    }
  }
  return ids;
}

export function createEmptyBoard(id: string, now: number): Board {
  return {
    id,
    schemaVersion: BOARD_SCHEMA_VERSION,
    title: '',
    categories: Array.from({ length: CATEGORY_COUNT }, () => ({
      name: '',
      clues: CLUE_VALUES.map((value) => ({ value, question: '', answer: '' })),
    })),
    createdAt: now,
    updatedAt: now,
  };
}
