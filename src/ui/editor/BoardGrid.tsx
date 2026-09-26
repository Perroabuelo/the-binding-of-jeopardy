import { useId, type MouseEvent } from 'react';
import type { Board } from '../../domain/board';
import { isClueComplete } from './boardEdits';
import styles from './BoardGrid.module.css';

interface BoardGridProps {
  board: Board;
  onRenameCategory: (categoryIndex: number, name: string) => void;
  onOpenClue: (
    categoryIndex: number,
    rowIndex: number,
    event: MouseEvent<HTMLButtonElement>,
  ) => void;
}

export function BoardGrid({ board, onRenameCategory, onOpenClue }: BoardGridProps) {
  const idPrefix = useId();
  return (
    <div className={styles.grid}>
      {board.categories.map((category, c) => {
        const inputId = `${idPrefix}-category-${c}`;
        return (
          <div key={c} className={styles.column}>
            <label htmlFor={inputId} className={styles.categoryLabel}>
              Nombre de la categoría {c + 1}
            </label>
            <input
              id={inputId}
              className={styles.categoryName}
              value={category.name}
              onChange={(e) => onRenameCategory(c, e.target.value)}
            />
            {category.clues.map((clue, r) => {
              const complete = isClueComplete(clue);
              return (
                <button
                  key={r}
                  type="button"
                  className={complete ? styles.cell : `${styles.cell} ${styles.incomplete}`}
                  aria-label={`Categoría ${c + 1}, ${clue.value}, ${complete ? 'completa' : 'incompleta'}`}
                  onClick={(event) => onOpenClue(c, r, event)}
                >
                  <span className={styles.value}>{clue.value}</span>
                  <span className={styles.state} aria-hidden="true">
                    {complete ? '✓ Completa' : 'Incompleta'}
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
