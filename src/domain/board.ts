export const MIN_CATEGORIES = 3;
export const MAX_CATEGORIES = 8;
export const DEFAULT_CATEGORIES = 6;
export const CLUES_PER_CATEGORY = 5;
export const CLUE_VALUES = [100, 200, 300, 400, 500] as const;
export const BOARD_SCHEMA_VERSION = 1;

export type ClueValue = (typeof CLUE_VALUES)[number];

export interface Clue {
  value: ClueValue;
  question: string;
  answer: string;
  /** Imagen de la pregunta. */
  imageId?: string;
  answerImageId?: string;
  /** Celda Daily Double. Ausente = false. */
  dailyDouble?: boolean;
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
  // La categoría no tiene tope: si existe en el tablero lo resuelve getClue
  if (rowIndex >= CLUES_PER_CATEGORY) return null;
  return { categoryIndex, rowIndex };
}

export function allClueKeys(board: Board): ClueKey[] {
  const keys: ClueKey[] = [];
  for (let c = 0; c < board.categories.length; c++) {
    for (let r = 0; r < CLUES_PER_CATEGORY; r++) keys.push(clueKey(c, r));
  }
  return keys;
}

export function getClue(board: Board, key: string): Clue | null {
  const parsed = parseClueKey(key);
  if (!parsed) return null;
  return board.categories[parsed.categoryIndex]?.clues[parsed.rowIndex] ?? null;
}

/** Valor más alto entre las celdas del tablero. */
export function maxClueValue(board: Board): number {
  let max = 0;
  for (const category of board.categories) {
    for (const clue of category.clues) max = Math.max(max, clue.value);
  }
  return max;
}

/** Ids de las imágenes que usa la celda. */
export function clueImageIds(clue: Clue): string[] {
  return [clue.imageId, clue.answerImageId].filter((id) => id !== undefined);
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

function createEmptyCategory(): Category {
  return { name: '', clues: CLUE_VALUES.map((value) => ({ value, question: '', answer: '' })) };
}

export function createEmptyBoard(
  id: string,
  now: number,
  categoryCount: number = DEFAULT_CATEGORIES,
): Board {
  return {
    id,
    schemaVersion: BOARD_SCHEMA_VERSION,
    title: '',
    categories: Array.from({ length: categoryCount }, createEmptyCategory),
    createdAt: now,
    updatedAt: now,
  };
}

function isFilled(text: string): boolean {
  return text.trim() !== '';
}

/** `true` si la categoría tiene nombre, alguna pregunta, respuesta o imagen. */
export function categoryHasContent(category: Category): boolean {
  return (
    isFilled(category.name) ||
    category.clues.some(
      (clue) => isFilled(clue.question) || isFilled(clue.answer) || clueImageIds(clue).length > 0,
    )
  );
}

// Operaciones de estructura: si no son válidas devuelven la misma referencia

/** Agrega una categoría vacía al final. */
export function addCategory(board: Board): Board {
  if (board.categories.length >= MAX_CATEGORIES) return board;
  return { ...board, categories: [...board.categories, createEmptyCategory()] };
}

export function removeCategory(board: Board, index: number): Board {
  const { categories } = board;
  if (categories.length <= MIN_CATEGORIES) return board;
  if (!Number.isInteger(index) || index < 0 || index >= categories.length) return board;
  return { ...board, categories: categories.filter((_, i) => i !== index) };
}

/** Mueve la categoría de la posición `from` a la posición `to`. */
export function moveCategory(board: Board, from: number, to: number): Board {
  const { categories } = board;
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < categories.length;
  if (!inRange(from) || !inRange(to) || from === to) return board;
  const next = [...categories];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return { ...board, categories: next };
}
