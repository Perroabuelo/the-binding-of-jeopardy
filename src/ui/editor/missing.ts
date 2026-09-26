import { CLUE_VALUES, MAX_CATEGORIES, MIN_CATEGORIES, parseClueKey } from '../../domain/board';
import type { MissingItem } from '../../domain/validation';

/** Textos legibles de lo que falta; pregunta y respuesta de una misma celda van juntas. */
export function describeMissing(missing: MissingItem[]): string[] {
  const texts: string[] = [];
  const clueFields = new Map<string, Set<'question' | 'answer'>>();
  for (const item of missing) {
    if (item.kind !== 'clue') continue;
    const fields = clueFields.get(item.clueKey) ?? new Set();
    fields.add(item.field);
    clueFields.set(item.clueKey, fields);
  }

  for (const item of missing) {
    if (item.kind === 'title') texts.push('Falta el título');
    else if (item.kind === 'categoryCount')
      texts.push(`El tablero debe tener entre ${MIN_CATEGORIES} y ${MAX_CATEGORIES} categorías`);
    else if (item.kind === 'categoryName')
      texts.push(`Falta el nombre de la categoría ${item.categoryIndex + 1}`);
  }

  for (const [key, fields] of clueFields) {
    const parsed = parseClueKey(key);
    if (!parsed) continue;
    const label = `Categoría ${parsed.categoryIndex + 1}, ${CLUE_VALUES[parsed.rowIndex]}`;
    const what =
      fields.size === 2
        ? 'falta la pregunta y la respuesta'
        : fields.has('question')
          ? 'falta la pregunta'
          : 'falta la respuesta';
    texts.push(`${label}: ${what}`);
  }
  return texts;
}
