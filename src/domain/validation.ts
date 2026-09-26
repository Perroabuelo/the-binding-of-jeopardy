import { CATEGORY_COUNT, CLUES_PER_CATEGORY, clueKey, type Board, type ClueKey } from './board';

export type MissingItem =
  | { kind: 'title' }
  | { kind: 'categoryName'; categoryIndex: number }
  | { kind: 'clue'; clueKey: ClueKey; field: 'question' | 'answer' };

export interface BoardValidation {
  ready: boolean;
  missing: MissingItem[];
}

function isBlank(text: string | undefined): boolean {
  return (text ?? '').trim() === '';
}

export function validateBoard(board: Board): BoardValidation {
  const missing: MissingItem[] = [];
  if (isBlank(board.title)) missing.push({ kind: 'title' });

  for (let c = 0; c < CATEGORY_COUNT; c++) {
    if (isBlank(board.categories[c]?.name))
      missing.push({ kind: 'categoryName', categoryIndex: c });
  }

  // Orden: por categoría y luego por fila, pregunta antes que respuesta
  for (let c = 0; c < CATEGORY_COUNT; c++) {
    for (let r = 0; r < CLUES_PER_CATEGORY; r++) {
      const clue = board.categories[c]?.clues[r];
      const key = clueKey(c, r);
      if (isBlank(clue?.question)) missing.push({ kind: 'clue', clueKey: key, field: 'question' });
      if (isBlank(clue?.answer)) missing.push({ kind: 'clue', clueKey: key, field: 'answer' });
    }
  }

  return { ready: missing.length === 0, missing };
}
