import { z } from 'zod';
import {
  BOARD_SCHEMA_VERSION,
  boardImageIds,
  clueImageIds,
  CLUE_VALUES,
  MAX_CATEGORIES,
  MIN_CATEGORIES,
  type Board,
  type Category,
  type Clue,
  type ClueValue,
} from './board';

export const EXCHANGE_FORMAT = 'the-binding-of-jeopardy';
export const EXCHANGE_SCHEMA_VERSION = 1;
export const EXCHANGE_FILE_SUFFIX = '.jeopardy.json';

const DATA_URL_PATTERN = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export interface ExchangeFile {
  format: typeof EXCHANGE_FORMAT;
  schemaVersion: typeof EXCHANGE_SCHEMA_VERSION;
  board: Board;
  images: Record<string, string>;
}

export interface ImportedBoard {
  board: Board;
  /** Imágenes con sus ids nuevos, como data URLs. */
  images: Record<string, string>;
}

export interface ImportDeps {
  makeId: () => string;
  now: number;
}

/** Serializa el tablero con solo las imágenes que sus celdas referencian. */
export function exportBoard(board: Board, images: Record<string, string>): string {
  const included: Record<string, string> = {};
  for (const imageId of boardImageIds(board)) {
    const dataUrl = images[imageId];
    if (dataUrl === undefined) {
      throw new Error(`No se encontró la imagen ${imageId} del tablero para exportarla.`);
    }
    included[imageId] = dataUrl;
  }
  const file: ExchangeFile = {
    format: EXCHANGE_FORMAT,
    schemaVersion: EXCHANGE_SCHEMA_VERSION,
    board,
    images: included,
  };
  return JSON.stringify(file);
}

const clueSchema = (value: ClueValue) =>
  z.object({
    value: z.literal(value),
    question: z.string(),
    answer: z.string(),
    imageId: z.string().optional(),
    answerImageId: z.string().optional(),
  });

const [v1, v2, v3, v4, v5] = CLUE_VALUES;

const boardSchema = z.object({
  id: z.string(),
  schemaVersion: z.literal(BOARD_SCHEMA_VERSION),
  title: z.string(),
  categories: z
    .array(
      z.object({
        name: z.string(),
        clues: z.tuple([
          clueSchema(v1),
          clueSchema(v2),
          clueSchema(v3),
          clueSchema(v4),
          clueSchema(v5),
        ]),
      }),
    )
    .min(MIN_CATEGORIES)
    .max(MAX_CATEGORIES),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

const envelopeSchema = z.object({
  format: z.string(),
  schemaVersion: z.unknown(),
});

const fileSchema = z.object({
  board: boardSchema,
  images: z.record(z.string(), z.string()),
});

/**
 * Valida un archivo exportado y lo convierte en un tablero nuevo, con ids nuevos
 * para el tablero y sus imágenes. No escribe nada: si falla, lanza ImportError.
 */
export function importBoard(json: string, { makeId, now }: ImportDeps): ImportedBoard {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new ImportError('El archivo está dañado o no es un JSON válido.');
  }

  const envelope = envelopeSchema.safeParse(raw);
  if (!envelope.success || envelope.data.format !== EXCHANGE_FORMAT) {
    throw new ImportError('El archivo no es un tablero exportado desde esta aplicación.');
  }
  if (envelope.data.schemaVersion !== EXCHANGE_SCHEMA_VERSION) {
    throw new ImportError(
      'El archivo fue creado con una versión desconocida de la aplicación y no se puede importar.',
    );
  }

  const parsed = fileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ImportError(
      'El tablero del archivo no es válido: debe tener 5 categorías con 5 preguntas de 100 a 500.',
    );
  }
  const { board: source, images: sourceImages } = parsed.data;

  const newImageIds = new Map<string, string>();
  const images: Record<string, string> = {};
  for (const category of source.categories) {
    for (const imageId of category.clues.flatMap(clueImageIds)) {
      if (newImageIds.has(imageId)) continue;
      const dataUrl = sourceImages[imageId];
      if (dataUrl === undefined) {
        throw new ImportError('Al archivo le falta una imagen que usa una de sus preguntas.');
      }
      if (!DATA_URL_PATTERN.test(dataUrl)) {
        throw new ImportError(
          'El archivo contiene una imagen dañada o de un tipo no permitido (PNG, JPEG, GIF o WebP).',
        );
      }
      const newId = makeId();
      newImageIds.set(imageId, newId);
      images[newId] = dataUrl;
    }
  }

  const categories: Category[] = source.categories.map((category) => ({
    name: category.name,
    clues: category.clues.map((clue): Clue => {
      const copy: Clue = { value: clue.value, question: clue.question, answer: clue.answer };
      if (clue.imageId !== undefined) copy.imageId = newImageIds.get(clue.imageId);
      if (clue.answerImageId !== undefined) {
        copy.answerImageId = newImageIds.get(clue.answerImageId);
      }
      return copy;
    }),
  }));

  return {
    board: {
      id: makeId(),
      schemaVersion: BOARD_SCHEMA_VERSION,
      title: source.title,
      categories,
      createdAt: now,
      updatedAt: now,
    },
    images,
  };
}

const INVALID_FILE_NAME_CHARS = /[<>:"/\\|?*]/g;
const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com\d|lpt\d)$/i;
const MAX_BASE_NAME_LENGTH = 100;

function isControlChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 0x20 || code === 0x7f;
}

/** Nombre de archivo de exportación: `<titulo-saneado>.jeopardy.json`. */
export function exportFileName(board: Board): string {
  let base = [...board.title]
    .map((char) => (isControlChar(char) ? ' ' : char))
    .join('')
    .replace(INVALID_FILE_NAME_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_BASE_NAME_LENGTH)
    .replace(/^[\s.]+|[\s.]+$/g, '');
  if (base === '') base = 'tablero';
  if (RESERVED_WINDOWS_NAMES.test(base)) base = `${base}_`;
  return `${base}${EXCHANGE_FILE_SUFFIX}`;
}
