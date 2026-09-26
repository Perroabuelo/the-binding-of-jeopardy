import type { Board, Clue } from '../../domain/board';

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
