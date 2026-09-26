import {
  CLUES_PER_CATEGORY,
  MAX_CATEGORIES,
  MIN_CATEGORIES,
  clueKey,
  type Board,
  type ClueKey,
} from './board';

export type MissingItem =
  | { kind: 'title' }
  | { kind: 'categoryCount' }
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
  const { categories } = board;
  if (isBlank(board.title)) missing.push({ kind: 'title' });
  // La UI no lo permite, pero protege contra datos corruptos
  if (categories.length < MIN_CATEGORIES || categories.length > MAX_CATEGORIES)
    missing.push({ kind: 'categoryCount' });

  categories.forEach((category, c) => {
    if (isBlank(category.name)) missing.push({ kind: 'categoryName', categoryIndex: c });
  });

  // Orden: por categoría y luego por fila, pregunta antes que respuesta
  for (let c = 0; c < categories.length; c++) {
    for (let r = 0; r < CLUES_PER_CATEGORY; r++) {
      const clue = categories[c]?.clues[r];
      const key = clueKey(c, r);
      if (isBlank(clue?.question)) missing.push({ kind: 'clue', clueKey: key, field: 'question' });
      if (isBlank(clue?.answer)) missing.push({ kind: 'clue', clueKey: key, field: 'answer' });
    }
  }

  return { ready: missing.length === 0, missing };
}
