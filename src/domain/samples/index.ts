import { BOARD_SCHEMA_VERSION, CLUE_VALUES, type Board, type Category } from '../board';
import { videogames } from './videogames';

export interface SampleClue {
  question: string;
  answer: string;
  dailyDouble?: true;
}

export interface SampleCategory {
  name: string;
  /** Una pregunta por valor, de 100 a 500. */
  clues: readonly [SampleClue, SampleClue, SampleClue, SampleClue, SampleClue];
}

export type SampleBoardId = 'agricultura' | 'videojuegos' | 'kpop';

/** Tablero de ejemplo, listo para jugar. Solo contenido de conocimiento público. */
export interface SampleBoard {
  /** Clave estable del ejemplo; no es el id del tablero que se crea. */
  id: SampleBoardId;
  title: string;
  description: string;
  categories: readonly [
    SampleCategory,
    SampleCategory,
    SampleCategory,
    SampleCategory,
    SampleCategory,
    SampleCategory,
  ];
  final: { category: string; question: string; answer: string };
}

/** Ejemplos en el orden en que se ofrecen. */
export const SAMPLE_BOARDS: readonly SampleBoard[] = [videogames];

/** Crea un tablero nuevo e independiente con el contenido del ejemplo. */
export function createBoardFromSample(sample: SampleBoard, id: string, now: number): Board {
  const categories: Category[] = sample.categories.map((category) => ({
    name: category.name,
    clues: category.clues.map((clue, row) => ({
      value: CLUE_VALUES[row]!,
      question: clue.question,
      answer: clue.answer,
      ...(clue.dailyDouble ? { dailyDouble: true } : {}),
    })),
  }));
  return {
    id,
    schemaVersion: BOARD_SCHEMA_VERSION,
    title: sample.title,
    categories,
    final: { ...sample.final },
    createdAt: now,
    updatedAt: now,
  };
}
