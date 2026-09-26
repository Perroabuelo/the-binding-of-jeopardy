import type { Board, Clue, FinalClue } from '../../domain/board';

export type CluePatch = Partial<
  Pick<Clue, 'question' | 'answer' | 'imageId' | 'answerImageId' | 'dailyDouble'>
>;

export function isClueComplete(clue: Clue): boolean {
  return clue.question.trim() !== '' && clue.answer.trim() !== '';
}

export function withTitle(board: Board, title: string): Board {
  return { ...board, title };
}

export function withCategoryName(board: Board, categoryIndex: number, name: string): Board {
  return {
    ...board,
    categories: board.categories.map((category, c) =>
      c === categoryIndex ? { ...category, name } : category,
    ),
  };
}

/** Aplica cambios a una celda; una clave con valor `undefined` (p. ej. `imageId`) se quita. */
export function withClue(
  board: Board,
  categoryIndex: number,
  rowIndex: number,
  patch: CluePatch,
): Board {
  return {
    ...board,
    categories: board.categories.map((category, c) =>
      c !== categoryIndex
        ? category
        : {
            ...category,
            clues: category.clues.map((clue, r) => {
              if (r !== rowIndex) return clue;
              const next: Clue = { ...clue, ...patch };
              for (const key of Object.keys(patch) as (keyof CluePatch)[]) {
                if (patch[key] === undefined) delete next[key];
              }
              return next;
            }),
          },
    ),
  };
}

export type FinalPatch = Partial<FinalClue>;

const EMPTY_FINAL: FinalClue = { category: '', question: '', answer: '' };

/**
 * Aplica cambios a la pista final; una clave con valor `undefined` (p. ej. `imageId`) se quita.
 * Si la pista final queda sin textos ni imágenes, se elimina del tablero.
 */
export function withFinal(board: Board, patch: FinalPatch): Board {
  const next: FinalClue = { ...EMPTY_FINAL, ...board.final, ...patch };
  for (const key of Object.keys(patch) as (keyof FinalPatch)[]) {
    if (patch[key] === undefined) delete next[key];
  }
  const isEmpty =
    next.category === '' &&
    next.question === '' &&
    next.answer === '' &&
    next.imageId === undefined &&
    next.answerImageId === undefined;
  if (isEmpty) {
    const rest = { ...board };
    delete rest.final;
    return rest;
  }
  return { ...board, final: next };
}
